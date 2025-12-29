import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { BookingRepository } from '../../../shared/repositories/booking.repository';
import { UserAvailabilityService } from './user-availability.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingQueryDto } from '../dto/booking-query.dto';
import { CreateRescheduleRequestDto } from '../dto/create-reschedule-request.dto';
import { RateReviewBookingDto } from '../dto/rate-review-booking.dto';
import { BookingStatus, PaymentStatus } from '../../../shared/schemas/booking.schema';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { StripeService } from '../../../common/services/stripe.service';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { SubscriptionStatus } from '../../../common/constants/subscription.constants';
import { Types } from 'mongoose';

import { PlanRepository } from '../../../shared/repositories/plan.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { NotificationType } from '../../../shared/schemas/notification.schema';
import { PaymentType, PaymentStatus as LogPaymentStatus } from '../../../common/constants/payment.constants';
import { PaymentStatus as BookingPaymentStatus } from '../../../shared/schemas/booking.schema';

import { FileService } from '../../file/services/file.service';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { FileCategory, FileType } from '../../../common/constants/file.constants';
import { ZoomService } from '../../../common/services/zoom.service';
import { SlotType } from '../../../common/constants/availability.constants';
import { RescheduleRequestRepository } from '../../../shared/repositories/reschedule-request.repository';
import { RescheduleRequestStatus, RescheduleRequestedBy } from '../../../shared/schemas/reschedule-request.schema';
import { ReviewRepository } from '../../../shared/repositories/review.repository';
import { InvoiceRepository } from '../../../shared/repositories/invoice.repository';
import { InvoiceStatus } from '../../../shared/schemas/invoice.schema';
import { FormatterService } from '../../../shared/services/formatter.service';

@Injectable()
export class UserBookingService {
    private readonly logger = new Logger(UserBookingService.name);

    constructor(
        private readonly bookingRepository: BookingRepository,
        private readonly userAvailabilityService: UserAvailabilityService,
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
        private readonly stripeService: StripeService,
        private readonly userRepository: UserRepository,
        private readonly planRepository: PlanRepository,
        private readonly notificationService: NotificationService,
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly fileService: FileService,
        private readonly fileRepository: FileRepository,
        private readonly zoomService: ZoomService,
        private readonly rescheduleRequestRepository: RescheduleRequestRepository,
        private readonly reviewRepository: ReviewRepository,
        private readonly invoiceRepository: InvoiceRepository,
        private readonly formatterService: FormatterService,
    ) { }

    private async validateSlots(type: any, date: string, slots: any[]) {
        const availableSlots = await this.userAvailabilityService.getAvailableSlots(type, date);

        for (const slot of slots) {
            const isSlotAvailable = availableSlots.some(
                availSlot => availSlot.startTime === slot.startTime && availSlot.endTime === slot.endTime
            );

            if (!isSlotAvailable) {
                throw new ConflictException(`Time slot ${slot.startTime}-${slot.endTime} is no longer available`);
            }
        }
    }

    private async handleBookingFiles(
        booking: any,
        files: Array<Express.Multer.File>,
        userId: string
    ): Promise<void> {
        for (const file of files) {
            try {
                // Determine file type based on mimetype
                let fileType = FileType.DOCUMENT; // Default
                if (file.mimetype.startsWith('image/')) {
                    fileType = FileType.IMAGE;
                } else if (file.mimetype.startsWith('video/')) {
                    fileType = FileType.VIDEO;
                } else if (file.mimetype.startsWith('audio/')) {
                    fileType = FileType.AUDIO;
                } else if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/')) {
                    fileType = FileType.DOCUMENT;
                } else {
                    fileType = FileType.OTHER;
                }

                await this.fileRepository.create({
                    name: file.filename,
                    originalName: file.originalname,
                    path: file.filename,
                    mimeType: file.mimetype,
                    size: file.size,
                    type: fileType,
                    category: FileCategory.ATTACHMENT,
                    fileableId: new Types.ObjectId(booking._id),
                    fileableType: 'Booking',
                    uploadedBy: new Types.ObjectId(userId),
                    isActive: true,
                } as any);
            } catch (error) {
                throw new BadRequestException(`Failed to upload file: ${file.originalname}`);
            }
        }
    }

    async createBooking(userId: string, createBookingDto: CreateBookingDto, files?: Array<Express.Multer.File>) {
        // Handle parsing if fields come as JSON strings (multipart/form-data)
        if (typeof createBookingDto.slots === 'string') {
            try {
                createBookingDto.slots = JSON.parse(createBookingDto.slots);
            } catch (e) { }
        }
        if (typeof createBookingDto.details === 'string') {
            try {
                createBookingDto.details = JSON.parse(createBookingDto.details);
            } catch (e) { }
        }

        // Ensure details object exists
        if (!createBookingDto.details) {
            createBookingDto.details = {};
        }

        const { type, date, slots } = createBookingDto;

        // 1. Verify slot availability
        await this.validateSlots(type, date, slots);

        // 2. Check for active subscription
        const activeSubscription = await this.userSubscriptionRepository.findOne({
            userId: new Types.ObjectId(userId),
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: { $gt: new Date() }
        });

        if (!activeSubscription) {
            throw new ForbiddenException('No active subscription found. Please use the payment flow.');
        }

        // 3. Check Subscription Quota
        const plan = await this.planRepository.findById(activeSubscription.planId.toString());
        if (!plan) throw new NotFoundException('Plan not found');

        const currentBookingsCount = await this.bookingRepository.countUserBookingsInPeriod(
            userId,
            activeSubscription.currentPeriodStart,
            activeSubscription.currentPeriodEnd
        );

        if (plan.videoSessions > 0 && currentBookingsCount >= plan.videoSessions) {
            throw new ForbiddenException(`Subscription quota exceeded. You have used ${currentBookingsCount}/${plan.videoSessions} sessions.`);
        }

        // 4. Create booking
        const bookingDate = new Date(date);

        const booking = await this.bookingRepository.create({
            user: userId,
            ...createBookingDto,
            date: bookingDate,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PAID,
        } as any);

        // 5. Create Zoom link for video consultancy bookings
        if (createBookingDto.type === SlotType.VIDEO_CONSULTANCY) {
            try {
                const firstSlot = createBookingDto.slots[0];
                const slotDuration = firstSlot ? this.calculateSlotDuration(firstSlot) : 60;
                const zoomLink = await this.zoomService.createMeetingLink(
                    booking._id.toString(),
                    bookingDate,
                    slotDuration
                );

                // Update booking with zoom link
                await this.bookingRepository.update(booking._id.toString(), {
                    zoomLink,
                } as any);
                booking.zoomLink = zoomLink;
                this.logger.log(`Zoom link created successfully for booking ${booking._id}: ${zoomLink}`);
            } catch (error: any) {
                this.logger.error(`Failed to create Zoom link for booking ${booking._id}:`, {
                    error: error.message,
                    stack: error.stack,
                    response: error.response?.data,
                });
                // Don't fail booking creation if Zoom link fails, but log the error
                // The booking will be created without a zoom link
            }
        }

        // 6. Handle file uploads directly linked to booking
        if (files && files.length > 0) {
            await this.handleBookingFiles(booking, files, userId);
        }

        // Notify Admins (don't fail booking if notification fails)
        try {
            await this.notificationService.notifyAdmins({
                title: 'New Booking (Subscription)',
                message: `New booking created by user ${userId} via subscription`,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: booking._id,
                    userId,
                    type: createBookingDto.type,
                    date: createBookingDto.date,
                }
            });
        } catch (error) {
            // Log error but don't fail booking creation
            console.error('Failed to send booking notification:', error);
        }

        return {
            booking: this.formatBookingResponse(booking),
            isCoveredBySubscription: true,
        };
    }

    async createPaymentIntent(userId: string, createBookingDto: CreateBookingDto, files?: Array<Express.Multer.File>) {
        // Handle parsing if fields come as JSON strings (multipart/form-data)
        if (typeof createBookingDto.slots === 'string') {
            try {
                createBookingDto.slots = JSON.parse(createBookingDto.slots);
            } catch (e) { }
        }
        if (typeof createBookingDto.details === 'string') {
            try {
                createBookingDto.details = JSON.parse(createBookingDto.details);
            } catch (e) { }
        }

        // Ensure details object exists
        if (!createBookingDto.details) {
            createBookingDto.details = {};
        }

        const { type, date, slots, amount } = createBookingDto;

        if (!amount) {
            throw new BadRequestException('Amount is required for payment bookings');
        }

        // 1. Verify slot availability
        await this.validateSlots(type, date, slots);

        // 2. Handle file uploads - store temporarily linked to user
        const fileIds: string[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    // Determine file type based on mimetype
                    let fileType = FileType.DOCUMENT;
                    if (file.mimetype.startsWith('image/')) {
                        fileType = FileType.IMAGE;
                    } else if (file.mimetype.startsWith('video/')) {
                        fileType = FileType.VIDEO;
                    } else if (file.mimetype.startsWith('audio/')) {
                        fileType = FileType.AUDIO;
                    } else if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/')) {
                        fileType = FileType.DOCUMENT;
                    } else {
                        fileType = FileType.OTHER;
                    }

                    // Store file temporarily linked to user (will be updated to booking after payment)
                    const fileRecord = await this.fileRepository.create({
                        name: file.filename,
                        originalName: file.originalname,
                        path: file.filename,
                        mimeType: file.mimetype,
                        size: file.size,
                        type: fileType,
                        category: FileCategory.ATTACHMENT,
                        fileableId: new Types.ObjectId(userId),
                        fileableType: 'User', // Temporarily linked to user
                        uploadedBy: new Types.ObjectId(userId),
                        isActive: true,
                    } as any);

                    fileIds.push(fileRecord._id.toString());
                } catch (error) {
                    throw new BadRequestException(`Failed to upload file: ${file.originalname}`);
                }
            }
        }

        // 3. Create Payment Intent
        const stripe = this.stripeService.getStripe();
        const user = await this.userRepository.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (!user.stripeCustomerId) {
            throw new BadRequestException('User does not have a Stripe customer ID');
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd', // Should come from config or DTO
            customer: user.stripeCustomerId,
            metadata: {
                userId,
                type,
                date,
                slots: JSON.stringify(slots),
                details: JSON.stringify(createBookingDto.details),
                fileIds: JSON.stringify(fileIds), // Store file IDs in metadata
                address: createBookingDto.address || '', // Store address in metadata
            },
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };
    }

    async confirmBooking(userId: string, paymentIntentId: string) {
        // 1. Retrieve Payment Intent
        const paymentIntent = await this.stripeService.getStripe().paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            throw new BadRequestException('Payment has not been successful');
        }

        if (paymentIntent.metadata.userId !== userId) {
            throw new ForbiddenException('Payment intent does not belong to this user');
        }

        // 2. Extract details
        const { type, date, slots, details, fileIds, address } = paymentIntent.metadata;
        const parsedSlots = JSON.parse(slots);
        const parsedDetails = JSON.parse(details || '{}');
        const parsedFileIds = fileIds ? JSON.parse(fileIds) : [];
        const amount = paymentIntent.amount / 100;

        // 3. Verify slots again (optional but safer)
        // await this.validateSlots(type, date, parsedSlots); 
        // Skipping re-validation to avoid race conditions where user paid but slot got taken in milliseconds.
        // Ideally we should reserve slots temporarily, but for now we proceed.

        // 4. Create Booking
        const bookingDate = new Date(date);

        const booking = await this.bookingRepository.create({
            user: userId,
            type,
            date: bookingDate,
            slots: parsedSlots,
            amount,
            details: parsedDetails,
            address: address || undefined,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PAID,
        } as any);

        // 5. Create Zoom link for video consultancy bookings
        if (type === SlotType.VIDEO_CONSULTANCY) {
            try {
                const firstSlot = parsedSlots[0];
                const slotDuration = firstSlot ? this.calculateSlotDuration(firstSlot) : 60;
                const zoomLink = await this.zoomService.createMeetingLink(
                    booking._id.toString(),
                    bookingDate,
                    slotDuration
                );

                // Update booking with zoom link
                await this.bookingRepository.update(booking._id.toString(), {
                    zoomLink,
                } as any);
                booking.zoomLink = zoomLink;
                this.logger.log(`Zoom link created successfully for booking ${booking._id}: ${zoomLink}`);
            } catch (error: any) {
                this.logger.error(`Failed to create Zoom link for booking ${booking._id}:`, {
                    error: error.message,
                    stack: error.stack,
                    response: error.response?.data,
                });
                // Don't fail booking creation if Zoom link fails, but log the error
                // The booking will be created without a zoom link
            }
        }

        // 6. Link files to booking (update files from temporary user link to booking)
        if (parsedFileIds && parsedFileIds.length > 0) {
            for (const fileId of parsedFileIds) {
                try {
                    await this.fileRepository.update(fileId, {
                        fileableId: new Types.ObjectId(booking._id),
                        fileableType: 'Booking',
                    });
                } catch (error) {
                    // Log error but don't fail the booking creation
                    console.error(`Failed to link file ${fileId} to booking:`, error);
                }
            }
        }

        // 6. Create Payment Log
        await this.paymentLogRepository.create({
            userId: new Types.ObjectId(userId),
            paymentType: PaymentType.ONE_TIME, // Assuming one-time for booking
            bookingId: booking._id,
            paymentIntentId: paymentIntent.id,
            amount: amount,
            currency: paymentIntent.currency,
            status: LogPaymentStatus.SUCCEEDED,
            metadata: paymentIntent.metadata,
            stripeResponse: paymentIntent,
        } as any);

        // 7. Notify Admins (don't fail booking if notification fails)
        try {
            await this.notificationService.notifyAdmins({
                title: 'New Booking (Payment)',
                message: `New booking created by user ${userId} via payment`,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: booking._id,
                    userId,
                    type,
                    date,
                    amount,
                }
            });
        } catch (error) {
            // Log error but don't fail booking creation
            console.error('Failed to send booking notification:', error);
        }

        return this.formatBookingResponse(booking);
    }

    async getUserBookings(userId: string, queryDto: BookingQueryDto = {}) {
        const { page = 1, limit = 10, status, type, dateFrom, dateTo } = queryDto;

        // Build filters
        const filters: {
            status?: string;
            type?: SlotType;
            dateFrom?: Date;
            dateTo?: Date;
        } = {};

        if (status) {
            filters.status = status;
        }

        if (type) {
            filters.type = type;
        }

        if (dateFrom) {
            filters.dateFrom = new Date(dateFrom);
        }

        if (dateTo) {
            filters.dateTo = new Date(dateTo);
        }

        // Get paginated results
        const result = await this.bookingRepository.paginateUserBookings(
            userId,
            page,
            limit,
            filters
        );

        // Get all pending reschedule requests for this user's bookings
        const bookingIds = result.data.map(booking => booking._id.toString());
        const pendingRescheduleRequests = await Promise.all(
            bookingIds.map(id => this.rescheduleRequestRepository.findPendingByBooking(id))
        );

        // Filter out bookings that have pending reschedule requests
        // These bookings should be shown in the reschedule requests listing instead
        const bookingsWithPendingRequests = new Set(
            pendingRescheduleRequests
                .map((req, index) => req ? bookingIds[index] : null)
                .filter(id => id !== null)
        );

        result.data = result.data.filter(booking =>
            !bookingsWithPendingRequests.has(booking._id.toString())
        );

        // Update total count
        result.total = result.data.length;
        result.totalPages = Math.ceil(result.total / limit);

        // Fetch reviews for remaining bookings
        const remainingBookingIds = result.data.map(booking => booking._id.toString());
        const reviews = await Promise.all(
            remainingBookingIds.map(id => this.reviewRepository.findByBooking(id))
        );

        // Create a map of bookingId -> review
        const reviewMap = new Map();
        reviews.forEach((review, index) => {
            if (review) {
                reviewMap.set(remainingBookingIds[index], review);
            }
        });

        // Format booking responses with reviews
        result.data = result.data.map(booking => {
            const review = reviewMap.get(booking._id.toString());
            return this.formatBookingResponseWithReview(booking, review);
        });

        return result;
    }

    private formatBookingResponse(booking: any) {
        return this.formatterService.formatBooking(booking);
    }

    private formatBookingResponseWithReview(booking: any, review?: any) {
        return this.formatterService.formatBooking(booking, true, review);
    }

    async cancelBooking(userId: string, bookingId: string) {
        // 1. Find the booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 2. Verify booking belongs to user
        if (booking.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to cancel this booking');
        }

        // 3. Check if booking status is PENDING
        if (booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException(`Cannot cancel booking with status: ${booking.status}. Only pending bookings can be cancelled.`);
        }

        // 4. Check if booking was created via subscription
        const activeSubscription = await this.userSubscriptionRepository.findOne({
            userId: new Types.ObjectId(userId),
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: { $gt: new Date() }
        });

        const isSubscriptionBooking = activeSubscription &&
            booking.date >= activeSubscription.currentPeriodStart &&
            booking.date <= activeSubscription.currentPeriodEnd &&
            booking.paymentStatus === PaymentStatus.PAID;

        // 5. Check if booking was paid via payment intent (not subscription) and process refund
        let refundProcessed = false;
        let refundId: string | null = null;
        
        if (booking.paymentStatus === PaymentStatus.PAID && !isSubscriptionBooking) {
            // Find payment log for this booking
            const paymentLogs = await this.paymentLogRepository.findByBookingId(bookingId);
            const paymentLog = paymentLogs.find(log => 
                log.paymentType === PaymentType.ONE_TIME && 
                log.status === LogPaymentStatus.SUCCEEDED
            );

            if (paymentLog && paymentLog.paymentIntentId) {
                try {
                    // Create refund in Stripe
                    const stripe = this.stripeService.getStripe();
                    const refund = await stripe.refunds.create({
                        payment_intent: paymentLog.paymentIntentId,
                        amount: Math.round(paymentLog.amount * 100), // Convert to cents
                        reason: 'requested_by_customer',
                    });

                    refundId = refund.id;
                    refundProcessed = true;

                    // Update payment log status to REFUNDED
                    const existingMetadata = paymentLog.metadata || {};
                    await this.paymentLogRepository.update(paymentLog._id.toString(), {
                        status: LogPaymentStatus.REFUNDED,
                        metadata: {
                            ...existingMetadata,
                            refundId: refund.id,
                            refundedAt: new Date().toISOString(),
                        },
                    } as any);

                    this.logger.log(`Refund processed for booking ${bookingId}. Refund ID: ${refund.id}`);
                } catch (error: any) {
                    this.logger.error(`Failed to process refund for booking ${bookingId}:`, {
                        error: error.message,
                        paymentIntentId: paymentLog.paymentIntentId,
                    });
                    // Continue with cancellation even if refund fails
                    // Admin can process refund manually if needed
                }
            }
        }

        // 6. Update booking status to CANCELLED and payment status if refunded
        const updateData: any = {
            status: BookingStatus.CANCELLED,
        };

        if (refundProcessed) {
            updateData.paymentStatus = PaymentStatus.REFUNDED;
        }

        const cancelledBooking = await this.bookingRepository.update(bookingId, updateData);

        if (!cancelledBooking) {
            throw new NotFoundException('Failed to cancel booking');
        }

        // 7. Log the cancellation
        this.logger.log(`Booking ${bookingId} cancelled by user ${userId}. Subscription booking: ${isSubscriptionBooking}. Refund processed: ${refundProcessed}`);

        // Note: 
        // - Availability slots are automatically restored because findBookingsByDateRange excludes cancelled bookings
        // - Subscription quota (videoSessions) is automatically restored because countUserBookingsInPeriod excludes cancelled bookings

        // 8. Send notification to admins (optional, don't fail if it fails)
        try {
            await this.notificationService.notifyAdmins({
                title: 'Booking Cancelled',
                message: `Booking ${bookingId} has been cancelled by user ${userId}`,
                type: NotificationType.BOOKING_CREATED, // Use available type
                data: {
                    bookingId: booking._id,
                    userId,
                    type: booking.type,
                    date: booking.date,
                }
            });
        } catch (error) {
            this.logger.error('Failed to send cancellation notification:', error);
        }

        return {
            booking: this.formatBookingResponse(cancelledBooking),
            message: 'Booking cancelled successfully',
            slotsRestored: isSubscriptionBooking,
            subscriptionQuotaRestored: isSubscriptionBooking,
            refundProcessed,
            refundId,
        };
    }

    /**
     * Calculate slot duration in minutes
     */
    private calculateSlotDuration(slot: { startTime: string; endTime: string }): number {
        try {
            const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
            const [endHours, endMinutes] = slot.endTime.split(':').map(Number);

            const startTotalMinutes = startHours * 60 + startMinutes;
            const endTotalMinutes = endHours * 60 + endMinutes;

            return Math.max(30, endTotalMinutes - startTotalMinutes); // Minimum 30 minutes
        } catch (error) {
            return 60; // Default to 60 minutes if calculation fails
        }
    }

    /**
     * Create a reschedule request for a booking
     * Validates slot availability before creating the request
     */
    async createRescheduleRequest(userId: string, bookingId: string, createRescheduleRequestDto: CreateRescheduleRequestDto) {
        // 1. Verify booking exists and belongs to user
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.user.toString() !== userId) {
            throw new ForbiddenException('You can only reschedule your own bookings');
        }

        // 2. Check if booking status allows rescheduling
        if (booking.status !== BookingStatus.APPROVED && booking.status !== BookingStatus.UPCOMING && booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException(`Cannot reschedule booking with status: ${booking.status}. Only upcoming or confirmed bookings can be rescheduled.`);
        }

        // 3. Check if reschedule request can be made (must be at least 24 hours before booking)
        const bookingDate = new Date(booking.date);
        const earliestSlot = booking.slots.reduce((earliest, slot) => {
            const [hours, minutes] = slot.startTime.split(':').map(Number);
            const slotTime = new Date(bookingDate);
            slotTime.setHours(hours, minutes, 0, 0);
            return !earliest || slotTime < earliest ? slotTime : earliest;
        }, null as Date | null);

        if (!earliestSlot) {
            throw new BadRequestException('Invalid slot times in booking');
        }

        const now = new Date();
        const hoursUntilBooking = (earliestSlot.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Check if booking is in the past
        if (hoursUntilBooking < 0) {
            throw new BadRequestException(
                'Cannot create reschedule request. The booking time has already passed.'
            );
        }

        // Check if booking is less than 24 hours away
        if (hoursUntilBooking < 24) {
            throw new BadRequestException(
                `Cannot create reschedule request. Request must be made at least 24 hours before the booking time. ` +
                `Booking time is in ${Math.round(hoursUntilBooking * 10) / 10} hours.`
            );
        }

        // 4. Check if there's already a pending reschedule request for this booking
        const existingRequest = await this.rescheduleRequestRepository.findByBooking(bookingId);
        if (existingRequest && existingRequest.status === RescheduleRequestStatus.PENDING) {
            throw new ConflictException('A pending reschedule request already exists for this booking');
        }

        // 5. Validate requested slots are available (must check before creating request)
        await this.validateSlots(booking.type, createRescheduleRequestDto.requestedDate, createRescheduleRequestDto.requestedSlots);

        // 6. Create reschedule request
        const requestedDate = new Date(createRescheduleRequestDto.requestedDate);
        requestedDate.setHours(0, 0, 0, 0);

        const rescheduleRequest = await this.rescheduleRequestRepository.create({
            booking: new Types.ObjectId(bookingId),
            user: new Types.ObjectId(userId),
            requestedDate,
            requestedSlots: createRescheduleRequestDto.requestedSlots,
            status: RescheduleRequestStatus.PENDING,
            requestedBy: RescheduleRequestedBy.USER,
        } as any);

        // 7. Send notification to admins
        try {
            await this.notificationService.notifyAdmins({
                title: 'New Reschedule Request',
                message: `User has requested to reschedule booking ${bookingId}`,
                type: NotificationType.BOOKING_CREATED, // Use available type
                data: {
                    bookingId: booking._id,
                    rescheduleRequestId: rescheduleRequest._id,
                    userId,
                    requestedDate: requestedDate,
                }
            });
        } catch (error) {
            this.logger.error('Failed to send reschedule request notification:', error);
        }

        return {
            rescheduleRequest: {
                id: rescheduleRequest._id.toString(),
                bookingId: booking._id.toString(),
                requestedDate: requestedDate,
                requestedSlots: rescheduleRequest.requestedSlots,
                status: rescheduleRequest.status,
                createdAt: rescheduleRequest.createdAt,
            },
            message: 'Reschedule request created successfully. Waiting for admin approval.',
        };
    }

    /**
     * Cancel a reschedule request
     * Only allowed if cancellation is 24 hours before the requested date and slots
     */
    async cancelRescheduleRequest(userId: string, requestId: string) {
        // 1. Get reschedule request
        const rescheduleRequest = await this.rescheduleRequestRepository.findById(requestId);
        if (!rescheduleRequest) {
            throw new NotFoundException('Reschedule request not found');
        }

        // 2. Verify request belongs to user
        if (rescheduleRequest.user.toString() !== userId) {
            throw new ForbiddenException('You can only cancel your own reschedule requests');
        }

        // 3. Check if request is still pending
        if (rescheduleRequest.status !== RescheduleRequestStatus.PENDING) {
            throw new BadRequestException(`Cannot cancel reschedule request with status: ${rescheduleRequest.status}. Only pending requests can be cancelled.`);
        }

        // 4. Calculate the earliest slot time from requested slots
        const requestedDate = new Date(rescheduleRequest.requestedDate);
        const earliestSlot = rescheduleRequest.requestedSlots.reduce((earliest, slot) => {
            const [hours, minutes] = slot.startTime.split(':').map(Number);
            const slotTime = new Date(requestedDate);
            slotTime.setHours(hours, minutes, 0, 0);
            return !earliest || slotTime < earliest ? slotTime : earliest;
        }, null as Date | null);

        if (!earliestSlot) {
            throw new BadRequestException('Invalid slot times in reschedule request');
        }

        // 5. Check if cancellation is at least 24 hours before the earliest slot
        const now = new Date();
        const hoursUntilSlot = (earliestSlot.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Check if requested time is in the past
        if (hoursUntilSlot < 0) {
            throw new BadRequestException(
                'Cannot cancel reschedule request. The requested time has already passed.'
            );
        }

        // Check if requested time is less than 24 hours away
        if (hoursUntilSlot < 24) {
            throw new BadRequestException(
                `Cannot cancel reschedule request. Cancellation must be at least 24 hours before the requested date and time. ` +
                `Requested time is in ${Math.round(hoursUntilSlot * 10) / 10} hours.`
            );
        }

        // 6. Delete the reschedule request
        const deleted = await this.rescheduleRequestRepository.delete(requestId);
        if (!deleted) {
            throw new NotFoundException('Failed to delete reschedule request');
        }

        // 7. Get booking for notification
        const booking = await this.bookingRepository.findById(rescheduleRequest.booking.toString());

        // 8. Send notification to admins
        try {
            await this.notificationService.notifyAdmins({
                title: 'Reschedule Request Cancelled',
                message: `User has cancelled reschedule request for booking ${rescheduleRequest.booking.toString()}`,
                type: NotificationType.BOOKING_CREATED, // Use available type
                data: {
                    bookingId: booking?._id,
                    rescheduleRequestId: rescheduleRequest._id,
                    userId,
                }
            });
        } catch (error) {
            this.logger.error('Failed to send cancellation notification:', error);
        }

        return {
            message: 'Reschedule request cancelled successfully',
            cancelledRequest: {
                id: rescheduleRequest._id.toString(),
                bookingId: rescheduleRequest.booking.toString(),
                requestedDate: rescheduleRequest.requestedDate,
            },
        };
    }

    /**
     * Get booking by ID
     */
    async getBookingById(userId: string, bookingId: string) {
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Verify booking belongs to user
        if (booking.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to view this booking');
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
        const bookingResponse = this.formatBookingResponseWithReview(booking, review || undefined);

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

    /**
     * Get user's reschedule requests with pagination
     * By default, excludes APPROVED requests (they appear in normal booking listing)
     */
    async getUserRescheduleRequests(userId: string, page: number = 1, limit: number = 10, status?: RescheduleRequestStatus) {
        // If no status filter is provided, exclude APPROVED requests
        // Approved requests should appear in normal booking listing, not here
        let result: any;

        if (status) {
            // User specified a status filter, use it as-is
            result = await this.rescheduleRequestRepository.findByUserPaginated(userId, page, limit, status);
        } else {
            // No status filter - exclude APPROVED requests
            result = await this.rescheduleRequestRepository.findByUserPaginated(
                userId,
                page,
                limit,
                undefined,
                RescheduleRequestStatus.APPROVED
            );
        }

        // Format the response
        const formattedData = result.data.map((request: any) => {
            return this.formatterService.formatRescheduleRequest(request, true);
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
     * Get a single reschedule request by ID
     */
    async getRescheduleRequestById(userId: string, requestId: string) {
        // 1. Get reschedule request
        const rescheduleRequest = await this.rescheduleRequestRepository.findById(requestId, {
            populate: [
                { path: 'booking' },
            ],
        });

        if (!rescheduleRequest) {
            throw new NotFoundException('Reschedule request not found');
        }

        // 2. Verify request belongs to user
        if (rescheduleRequest.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to view this reschedule request');
        }

        // 3. Format the response
        return {
            rescheduleRequest: this.formatterService.formatRescheduleRequest(rescheduleRequest, true),
        };
    }

    /**
     * User accepts or rejects an admin-initiated reschedule request
     */
    async respondToAdminRescheduleRequest(
        userId: string,
        requestId: string,
        status: RescheduleRequestStatus.APPROVED | RescheduleRequestStatus.REJECTED,
    ) {
        // 1. Get reschedule request
        const rescheduleRequest = await this.rescheduleRequestRepository.findById(requestId);
        if (!rescheduleRequest) {
            throw new NotFoundException('Reschedule request not found');
        }

        // 2. Verify request belongs to user
        if (rescheduleRequest.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to respond to this reschedule request');
        }

        // 3. Verify request is from admin
        if (rescheduleRequest.requestedBy !== RescheduleRequestedBy.ADMIN) {
            throw new BadRequestException('This reschedule request was not initiated by admin. Only admin-initiated requests can be accepted/rejected by users.');
        }

        // 4. Check if request is already processed
        if (rescheduleRequest.status !== RescheduleRequestStatus.PENDING) {
            throw new BadRequestException(`Reschedule request is already ${rescheduleRequest.status}`);
        }

        // 5. Get the booking
        const booking = await this.bookingRepository.findById(rescheduleRequest.booking.toString());
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 6. Update reschedule request status
        rescheduleRequest.status = status;
        rescheduleRequest.reviewedBy = new Types.ObjectId(userId) as any;
        rescheduleRequest.reviewedAt = new Date();
        await rescheduleRequest.save();

        // 7. If approved, update the booking
        if (status === RescheduleRequestStatus.APPROVED) {
            // Update booking date and slots
            booking.date = rescheduleRequest.requestedDate;
            booking.slots = rescheduleRequest.requestedSlots;
            booking.isRescheduled = true; // Mark booking as rescheduled

            // Check if the rescheduled date/time is in the future
            const requestedDate = new Date(rescheduleRequest.requestedDate);
            const firstSlot = rescheduleRequest.requestedSlots[0];
            if (firstSlot) {
                const [hours, minutes] = firstSlot.startTime.split(':').map(Number);
                requestedDate.setHours(hours, minutes, 0, 0);
            }

            const now = new Date();

            // If the rescheduled booking is in the future, set status to UPCOMING
            if (requestedDate > now) {
                booking.status = BookingStatus.UPCOMING;
            } else {
                // If it's in the past, keep the current status or set to COMPLETED
                // This shouldn't normally happen, but handle it gracefully
                if (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) {
                    booking.status = BookingStatus.UPCOMING;
                }
            }

            await booking.save();

            // 8. If it's a video consultancy booking, create/update Zoom link
            if (booking.type === SlotType.VIDEO_CONSULTANCY) {
                try {
                    const firstSlot = rescheduleRequest.requestedSlots[0];
                    const slotDuration = firstSlot
                        ? this.calculateSlotDuration(firstSlot)
                        : 60;

                    const zoomLink = await this.zoomService.createMeetingLink(
                        booking._id.toString(),
                        rescheduleRequest.requestedDate,
                        slotDuration,
                    );

                    booking.zoomLink = zoomLink;
                    await booking.save();

                    this.logger.log(
                        `Zoom link updated for rescheduled booking ${booking._id}: ${zoomLink}`,
                    );
                } catch (error: any) {
                    this.logger.error(
                        `Failed to create Zoom link for rescheduled booking ${booking._id}:`,
                        {
                            error: error.message,
                            stack: error.stack,
                        },
                    );
                }
            }

            // 9. Send notification to admins
            try {
                await this.notificationService.notifyAdmins({
                    title: 'Reschedule Request Accepted',
                    message: `User has accepted admin's reschedule request for booking #${booking._id.toString().slice(-6)}`,
                    type: NotificationType.BOOKING_CREATED,
                    data: {
                        bookingId: booking._id,
                        rescheduleRequestId: rescheduleRequest._id,
                        userId,
                    },
                });
            } catch (error) {
                this.logger.error('Failed to send acceptance notification:', error);
            }
        } else if (status === RescheduleRequestStatus.REJECTED) {
            // 10. Send rejection notification to admins
            try {
                await this.notificationService.notifyAdmins({
                    title: 'Reschedule Request Rejected',
                    message: `User has rejected admin's reschedule request for booking #${booking._id.toString().slice(-6)}`,
                    type: NotificationType.BOOKING_CREATED,
                    data: {
                        bookingId: booking._id,
                        rescheduleRequestId: rescheduleRequest._id,
                        userId,
                    },
                });
            } catch (error) {
                this.logger.error('Failed to send rejection notification:', error);
            }
        }

        return {
            rescheduleRequest: {
                id: rescheduleRequest._id.toString(),
                bookingId: booking._id.toString(),
                status: rescheduleRequest.status,
                reviewedBy: rescheduleRequest.reviewedBy?.toString(),
                reviewedAt: rescheduleRequest.reviewedAt,
            },
            booking: status === RescheduleRequestStatus.APPROVED
                ? {
                    id: booking._id.toString(),
                    date: booking.date,
                    slots: booking.slots,
                    zoomLink: booking.zoomLink,
                }
                : undefined,
            message: `Reschedule request ${status} successfully`,
        };
    }

    /**
     * Rate and review a completed booking
     */
    async rateReviewBooking(userId: string, bookingId: string, rateReviewDto: RateReviewBookingDto) {
        // 1. Find the booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 2. Verify booking belongs to user
        if (booking.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to rate this booking');
        }

        // 3. Check if booking status is COMPLETED
        if (booking.status !== BookingStatus.COMPLETED) {
            throw new BadRequestException(`Cannot rate booking with status: ${booking.status}. Only completed bookings can be rated.`);
        }

        // 4. Check if booking already has a review
        const existingReview = await this.reviewRepository.findByBooking(bookingId);
        if (existingReview) {
            throw new ConflictException('This booking has already been rated and reviewed');
        }

        // 5. Create review document
        const review = await this.reviewRepository.create({
            booking: new Types.ObjectId(bookingId),
            user: new Types.ObjectId(userId),
            rating: rateReviewDto.rating,
            review: rateReviewDto.review,
        } as any);

        // 6. Send notification to admins
        try {
            await this.notificationService.notifyAdmins({
                title: 'New Booking Review',
                message: `User has rated booking ${bookingId} with ${rateReviewDto.rating} stars`,
                type: NotificationType.BOOKING_CREATED, // Use available type
                data: {
                    bookingId: booking._id,
                    reviewId: review._id,
                    userId,
                    rating: rateReviewDto.rating,
                }
            });
        } catch (error) {
            this.logger.error('Failed to send review notification:', error);
        }

        return {
            booking: this.formatBookingResponseWithReview(booking, review),
            message: 'Rating and review submitted successfully',
        };
    }

    /**
     * Get invoice for a booking
     */
    async getInvoiceByBooking(userId: string, bookingId: string) {
        // 1. Verify booking exists and belongs to user
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to view this invoice');
        }

        // 2. Get invoice
        const invoice = await this.invoiceRepository.findByBooking(bookingId);
        if (!invoice) {
            throw new NotFoundException('Invoice not found for this booking');
        }

        const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
        return {
            invoice: {
                id: invoiceObj._id.toString(),
                invoiceNumber: invoiceObj.invoiceNumber,
                bookingId: booking._id.toString(),
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
     * Create payment intent for invoice
     */
    async createInvoicePaymentIntent(userId: string, bookingId: string) {
        // 1. Verify booking exists and belongs to user
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to pay this invoice');
        }

        // 2. Get invoice
        const invoice = await this.invoiceRepository.findByBooking(bookingId);
        if (!invoice) {
            throw new NotFoundException('Invoice not found for this booking');
        }

        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Invoice is already paid');
        }

        // 3. Get user
        const user = await this.userRepository.findById(userId);
        if (!user || !user.stripeCustomerId) {
            throw new BadRequestException('User does not have a Stripe customer ID');
        }

        // 4. Create payment intent
        const stripe = this.stripeService.getStripe();
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(invoice.amount * 100), // Convert to cents
            currency: invoice.currency || 'usd',
            customer: user.stripeCustomerId,
            metadata: {
                userId,
                bookingId: bookingId,
                invoiceId: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                type: 'invoice',
            },
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };
    }

    /**
     * Confirm invoice payment
     */
    async confirmInvoicePayment(userId: string, paymentIntentId: string) {
        // 1. Retrieve Payment Intent
        const paymentIntent = await this.stripeService.getStripe().paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            throw new BadRequestException(`Payment intent status is ${paymentIntent.status}, not succeeded`);
        }

        // 2. Get invoice from metadata
        const invoiceId = paymentIntent.metadata.invoiceId;
        if (!invoiceId) {
            throw new BadRequestException('Invoice ID not found in payment intent metadata');
        }

        const invoice = await this.invoiceRepository.findById(invoiceId);
        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        // 3. Verify invoice belongs to user
        if (invoice.user.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to pay this invoice');
        }

        // 4. Check if invoice is already paid
        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Invoice is already paid');
        }

        // 5. Update invoice status
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
        await invoice.save();

        // 6. Update booking payment status
        const booking = await this.bookingRepository.findById(invoice.booking.toString());
        if (booking) {
            booking.paymentStatus = BookingPaymentStatus.PAID;
            await booking.save();
        }

        // 7. Create payment log
        await this.paymentLogRepository.create({
            userId: new Types.ObjectId(userId),
            paymentType: PaymentType.BOOKING,
            bookingId: new Types.ObjectId(invoice.booking.toString()),
            paymentIntentId: paymentIntent.id,
            amount: invoice.amount,
            currency: invoice.currency || 'usd',
            status: LogPaymentStatus.SUCCEEDED,
            metadata: {
                invoiceId: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                bookingId: invoice.booking.toString(),
            },
            stripeResponse: paymentIntent as any,
        } as any);

        // 8. Send notifications on successful payment
        try {
            // Notify admins
            await this.notificationService.notifyAdmins({
                title: 'Invoice Paid',
                message: `Invoice ${invoice.invoiceNumber} has been paid for booking ${invoice.booking.toString()}`,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: invoice.booking,
                    invoiceId: invoice._id,
                    userId,
                    amount: invoice.amount,
                },
            });

            // Notify user
            await this.notificationService.createUserNotification({
                title: 'Payment Successful',
                message: `Your payment for invoice ${invoice.invoiceNumber} has been received successfully.`,
                type: NotificationType.BOOKING_CREATED,
                recipient: userId,
                data: {
                    bookingId: invoice.booking,
                    invoiceId: invoice._id,
                    amount: invoice.amount,
                    currency: invoice.currency || 'usd',
                    paymentIntentId: paymentIntent.id,
                },
            });
        } catch (error) {
            this.logger.error('Failed to send payment notification:', error);
        }

        return {
            invoice: {
                id: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
                paidAt: invoice.paidAt,
            },
            booking: booking ? {
                id: booking._id.toString(),
                paymentStatus: booking.paymentStatus,
            } : undefined,
            message: 'Invoice payment confirmed successfully',
        };
    }
}
