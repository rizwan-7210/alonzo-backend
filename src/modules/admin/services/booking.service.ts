import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { BookingRepository } from '../../../shared/repositories/booking.repository';
import { InvoiceRepository } from '../../../shared/repositories/invoice.repository';
import { BookingStatus, PaymentStatus } from '../../../shared/schemas/booking.schema';
import { InvoiceStatus } from '../../../shared/schemas/invoice.schema';
import { StripeService } from '../../../common/services/stripe.service';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../../shared/schemas/notification.schema';
import { Types } from 'mongoose';
import { log } from 'console';
import { AdminBookingQueryDto } from '../dto/booking-query.dto';
import { SlotType } from '../../../common/constants/availability.constants';
import { BookingRequestQueryDto } from '../dto/booking-request-query.dto';
import { ApproveRejectBookingDto } from '../dto/approve-reject-booking.dto';
import { RescheduleRequestService } from './reschedule-request.service';
import { CreateRescheduleRequestDto } from '../../user/dto/create-reschedule-request.dto';
import { FormatterService } from '../../../shared/services/formatter.service';
import { ReviewRepository } from '../../../shared/repositories/review.repository';
import { RescheduleRequestRepository } from '../../../shared/repositories/reschedule-request.repository';

export interface CreateInvoiceLineItemDto {
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface CreateInvoiceDto {
    lineItems: CreateInvoiceLineItemDto[];
    dueDate?: string;
}

@Injectable()
export class AdminBookingService {
    private readonly logger = new Logger(AdminBookingService.name);

    constructor(
        private readonly bookingRepository: BookingRepository,
        private readonly invoiceRepository: InvoiceRepository,
        private readonly stripeService: StripeService,
        private readonly userRepository: UserRepository,
        private readonly notificationService: NotificationService,
        private readonly rescheduleRequestService: RescheduleRequestService,
        private readonly formatterService: FormatterService,
        private readonly reviewRepository: ReviewRepository,
        private readonly rescheduleRequestRepository: RescheduleRequestRepository,
    ) { }

    /**
     * Mark booking as completed
     */
    async markBookingAsCompleted(bookingId: string) {
        const booking = await this.bookingRepository.findById(bookingId);
        console.log(booking);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.status === BookingStatus.COMPLETED) {
            throw new BadRequestException('Booking is already completed');
        }

        if (booking.status === BookingStatus.CANCELLED) {
            throw new BadRequestException('Cannot mark cancelled booking as completed');
        }

        // Update booking status
        booking.status = BookingStatus.COMPLETED;
        await booking.save();

        // Send notification to user
        try {
            await this.notificationService.createUserNotification({
                recipient: booking.user.toString(),
                title: 'Booking Completed',
                message: `Your booking #${bookingId.slice(-6)} has been marked as completed.`,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: booking._id,
                },
            });
        } catch (error) {
            this.logger.error('Failed to send completion notification:', error);
        }

        return {
            booking: {
                id: booking._id.toString(),
                status: booking.status,
                completedAt: new Date(),
            },
            message: 'Booking marked as completed successfully',
        };
    }

    /**
     * Generate invoice for a booking
     */
    async createInvoice(bookingId: string, createInvoiceDto: CreateInvoiceDto) {
        // 1. Get booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 2. Check if invoice already exists
        const existingInvoice = await this.invoiceRepository.findByBooking(bookingId);
        if (existingInvoice) {
            throw new ConflictException('Invoice already exists for this booking');
        }

        // 3. Get user
        const user = await this.userRepository.findById(booking.user.toString());
        if (!user || !user.stripeCustomerId) {
            throw new BadRequestException('User does not have a Stripe customer ID');
        }

        // Store stripeCustomerId in a variable to satisfy TypeScript
        const stripeCustomerId = user.stripeCustomerId;

        // 4. Calculate total amount from line items
        const lineItems = createInvoiceDto.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
        }));

        const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

        // Stripe limit: total must be <= 999,999.99 USD
        const maxAmount = 999999.99;
        if (totalAmount > maxAmount) {
            throw new BadRequestException(`Total invoice amount cannot exceed $${maxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please reduce the line items or amounts.`);
        }

        // 5. Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString().slice(-5)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        // 6. Create Stripe invoice
        const stripe = this.stripeService.getStripe();

        // Create invoice items first
        const invoiceItems = await Promise.all(
            lineItems.map(item =>
                stripe.invoiceItems.create({
                    customer: stripeCustomerId,
                    amount: Math.round(item.total * 100), // Convert to cents
                    currency: 'usd',
                    description: item.description,
                })
            )
        );

        // Calculate days until due
        const daysUntilDue = createInvoiceDto.dueDate ?
            Math.max(1, Math.ceil((new Date(createInvoiceDto.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) :
            30;

        // Create invoice
        const invoiceData: any = {
            customer: stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: daysUntilDue,
            metadata: {
                bookingId: bookingId,
                invoiceNumber: invoiceNumber,
            },
        };

        const stripeInvoice = await stripe.invoices.create(invoiceData);

        // Finalize invoice (this sends it to the customer)
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id, {
            auto_advance: true, // Automatically advance to paid when payment succeeds
        });

        // 7. Create invoice record in database
        const invoice = await this.invoiceRepository.create({
            booking: new Types.ObjectId(bookingId),
            user: booking.user,
            invoiceNumber,
            stripeInvoiceId: finalizedInvoice.id,
            amount: totalAmount,
            currency: 'usd',
            status: InvoiceStatus.OPEN,
            invoiceDate: new Date(),
            dueDate: createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : undefined,
            lineItems,
            metadata: {
                bookingId: bookingId,
            },
        } as any);

        // 8. Update booking payment status to PENDING (if not already paid)
        if (booking.paymentStatus !== PaymentStatus.PAID) {
            booking.paymentStatus = PaymentStatus.PENDING;
            await booking.save();
        }

        // 9. Send notification to user
        try {
            await this.notificationService.createUserNotification({
                recipient: booking.user.toString(),
                title: 'New Invoice Generated',
                message: `An invoice has been generated for your booking #${bookingId.slice(-6)}. Please pay to complete your booking.`,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: booking._id,
                    invoiceId: invoice._id,
                    invoiceNumber: invoiceNumber,
                },
            });
        } catch (error) {
            this.logger.error('Failed to send invoice notification:', error);
        }

        return {
            invoice: {
                id: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                bookingId: booking._id.toString(),
                amount: invoice.amount,
                status: invoice.status,
                invoiceDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
                lineItems: invoice.lineItems,
                stripeInvoiceId: invoice.stripeInvoiceId,
            },
            message: 'Invoice created and sent to customer successfully',
        };
    }

    /**
     * Get invoice by booking ID
     */
    async getInvoiceByBooking(bookingId: string) {
        const invoice = await this.invoiceRepository.findByBooking(bookingId);
        if (!invoice) {
            throw new NotFoundException('Invoice not found for this booking');
        }

        const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
        return {
            invoice: {
                id: invoiceObj._id.toString(),
                invoiceNumber: invoiceObj.invoiceNumber,
                bookingId: invoiceObj.booking.toString(),
                amount: invoiceObj.amount,
                currency: invoiceObj.currency,
                status: invoiceObj.status,
                invoiceDate: invoiceObj.invoiceDate,
                dueDate: invoiceObj.dueDate,
                paidAt: invoiceObj.paidAt,
                lineItems: invoiceObj.lineItems,
                stripeInvoiceId: invoiceObj.stripeInvoiceId,
                createdAt: invoiceObj.createdAt,
                updatedAt: invoiceObj.updatedAt,
            },
        };
    }

    /**
     * Get bookings for a specific user with filters and pagination
     */
    async getUserBookings(userId: string, queryDto: AdminBookingQueryDto) {
        // Verify user exists
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { page = 1, limit = 10, status, type, dateFrom, dateTo } = queryDto;

        // Build query filters
        const query: any = {
            user: new Types.ObjectId(userId),
        };

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) {
                query.date.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Include the entire end date by setting time to end of day
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        // Get paginated results with user population
        const result = await this.bookingRepository.paginate(page, limit, query, {
            sort: { createdAt: -1 },
            populate: [
                {
                    path: 'user',
                    select: 'firstName lastName email phone',
                },
            ],
        });

        // Format the response
        const formattedData = result.data.map((booking: any, index: number) => {
            return this.formatterService.formatBookingForListing(booking, index, page, limit);
        });

        return {
            data: formattedData,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
        };
    }

    /**
     * Get all bookings with filters and pagination
     */
    async getAllBookings(queryDto: AdminBookingQueryDto) {
        const { page = 1, limit = 10, status, type, dateFrom, dateTo, search } = queryDto;

        // Build query filters
        const query: any = {};

        // Filter by status
        if (status) {
            query.status = status;
        } else {
            // Exclude pending, cancelled, and rejected bookings by default
            query.status = { $nin: [BookingStatus.PENDING, BookingStatus.CANCELLED, BookingStatus.REJECTED] };
        }

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) {
                query.date.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Include the entire end date by setting time to end of day
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        // Filter by user search (name or email)
        if (search) {
            const matchingUsers = await this.userRepository.searchUsers(search);
            if (matchingUsers.length === 0) {
                // No users found matching search, return empty result
                return {
                    data: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                };
            }
            const userIds = matchingUsers.map(user => user._id);
            query.user = { $in: userIds };
        }

        // Get paginated results with user population
        const result = await this.bookingRepository.paginate(page, limit, query, {
            sort: { createdAt: -1 },
            populate: [
                {
                    path: 'user',
                    select: 'firstName lastName email phone',
                },
            ],
        });

        // Format the response
        const formattedData = result.data.map((booking: any, index: number) => {
            return this.formatterService.formatBookingForListing(booking, index, page, limit);
        });

        return {
            data: formattedData,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
        };
    }

    /**
     * Get all booking requests (bookings with status PENDING, CANCELLED, or REJECTED) with filters and pagination
     */
    async getBookingRequests(queryDto: BookingRequestQueryDto) {
        const { page = 1, limit = 10, type, dateFrom, dateTo, search } = queryDto;

        // Build query filters - show PENDING, CANCELLED, and REJECTED bookings
        const query: any = {
            status: { $in: [BookingStatus.PENDING, BookingStatus.CANCELLED, BookingStatus.REJECTED] },
        };

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) {
                query.date.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Include the entire end date by setting time to end of day
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        // Filter by user search (name or email)
        if (search) {
            const matchingUsers = await this.userRepository.searchUsers(search);
            if (matchingUsers.length === 0) {
                // No users found matching search, return empty result
                return {
                    data: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                };
            }
            const userIds = matchingUsers.map(user => user._id);
            query.user = { $in: userIds };
        }

        // Get paginated results with user population
        const result = await this.bookingRepository.paginate(page, limit, query, {
            sort: { createdAt: -1 },
            populate: [
                {
                    path: 'user',
                    select: 'firstName lastName email phone',
                },
            ],
        });

        // Format the response
        const formattedData = result.data.map((booking: any, index: number) => {
            const formatted = this.formatterService.formatBookingForListing(booking, index, page, limit);
            if (!formatted) return null;

            const bookingObj = this.formatterService.toPlainObject(booking);
            const user = bookingObj.user || {};

            return {
                ...formatted,
                id: formatted.id,
                phone: user.phone || 'N/A',
                requestType: 'Appointment', // Can be enhanced to detect reschedule requests
                rejectionReason: bookingObj.rejectionReason,
            };
        }).filter(item => item !== null);

        return {
            data: formattedData,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
        };
    }

    /**
     * Approve or reject a booking request
     */
    async approveRejectBooking(bookingId: string, approveRejectDto: ApproveRejectBookingDto) {
        // 1. Get booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 2. Check if booking is in PENDING status
        if (booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException(`Booking is already ${booking.status}. Only pending bookings can be approved or rejected.`);
        }

        // 3. Validate rejection reason if status is CANCELLED
        if (approveRejectDto.status === BookingStatus.REJECTED) {
            if (!approveRejectDto.rejectionReason || approveRejectDto.rejectionReason.trim().length === 0) {
                throw new BadRequestException('Rejection reason is required when rejecting a booking');
            }
        }

        // 4. Update booking status
        booking.status = approveRejectDto.status;

        // If rejected, save rejection reason
        if (approveRejectDto.status === BookingStatus.REJECTED && approveRejectDto.rejectionReason) {
            booking.rejectionReason = approveRejectDto.rejectionReason.trim();
        } else {
            // Clear rejection reason if approving
            booking.rejectionReason = undefined;
        }

        // 5. If approved and booking date is in the future, set status to UPCOMING
        if (approveRejectDto.status === BookingStatus.APPROVED) {
            const bookingDate = new Date(booking.date);
            const firstSlot = booking.slots && booking.slots.length > 0 ? booking.slots[0] : null;

            if (firstSlot && firstSlot.startTime) {
                const [hours, minutes] = firstSlot.startTime.split(':').map(Number);
                bookingDate.setHours(hours, minutes, 0, 0);

                if (bookingDate > new Date()) {
                    booking.status = BookingStatus.UPCOMING;
                }
            }
        }

        await booking.save();

        // 6. Send notification to user
        try {
            const notificationTitle = approveRejectDto.status === BookingStatus.APPROVED
                ? 'Booking Approved'
                : 'Booking Rejected';

            const notificationMessage = approveRejectDto.status === BookingStatus.APPROVED
                ? `Your booking #${bookingId.slice(-6)} has been approved.`
                : `Your booking #${bookingId.slice(-6)} has been rejected. ${approveRejectDto.rejectionReason ? `Reason: ${approveRejectDto.rejectionReason}` : ''}`;

            await this.notificationService.createUserNotification({
                recipient: booking.user.toString(),
                title: notificationTitle,
                message: notificationMessage,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: booking._id,
                    status: booking.status,
                },
            });
        } catch (error) {
            this.logger.error('Failed to send notification:', error);
        }

        return {
            booking: {
                id: booking._id.toString(),
                status: booking.status,
                rejectionReason: booking.rejectionReason,
            },
            message: approveRejectDto.status === BookingStatus.APPROVED
                ? 'Booking approved successfully'
                : 'Booking rejected successfully',
        };
    }

    /**
     * Create a reschedule request for a booking (admin-initiated)
     */
    async createRescheduleRequest(bookingId: string, adminId: string, createRescheduleRequestDto: CreateRescheduleRequestDto) {
        return this.rescheduleRequestService.createRescheduleRequest(
            bookingId,
            adminId,
            createRescheduleRequestDto,
        );
    }

    /**
     * Get count of pending bookings
     */
    async getPendingBookingsCount(): Promise<number> {
        try {
            const count = await this.bookingRepository.count({
                status: BookingStatus.PENDING,
            });
            return count;
        } catch (error) {
            this.logger.error(`Failed to get pending bookings count: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve pending bookings count');
        }
    }

    /**
     * Get booking by ID with user and invoice details
     */
    async getBookingById(bookingId: string) {
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Populate user details with avatar file
        await booking.populate({
            path: 'user',
            select: 'firstName lastName email phone address avatar',
            populate: {
                path: 'avatarFile',
                select: 'name path url mimeType size',
            },
        });

        // Fetch review if it exists
        const review = await this.reviewRepository.findByBooking(bookingId);

        // Fetch invoice if it exists
        const invoice = await this.invoiceRepository.findByBooking(bookingId);

        // Check if there's a pending reschedule request for this booking (status: "pending")
        const pendingRescheduleRequest = await this.rescheduleRequestRepository.findPendingByBooking(bookingId);

        // Format booking response with review
        const bookingResponse = this.formatterService.formatBooking(booking, true, review || undefined);

        // Add reschedule request flag - true only when status is "pending"
        if (bookingResponse) {
            bookingResponse.hasRescheduleRequest = pendingRescheduleRequest !== null;
        }

        // Format user information
        const user = booking.user;
        const userFormatted = user ? this.formatterService.formatUser(user) : null;

        // Format invoice if it exists
        const invoiceFormatted = invoice ? this.formatterService.formatInvoice(invoice) : null;

        return {
            booking: bookingResponse,
            user: userFormatted,
            invoice: invoiceFormatted,
        };
    }
}

