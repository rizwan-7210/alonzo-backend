import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { RescheduleRequestRepository } from '../../../shared/repositories/reschedule-request.repository';
import { BookingRepository } from '../../../shared/repositories/booking.repository';
import { RescheduleRequestStatus, RescheduleRequestedBy } from '../../../shared/schemas/reschedule-request.schema';
import { BookingStatus } from '../../../shared/schemas/booking.schema';
import { UpdateRescheduleRequestDto } from '../dto/update-reschedule-request.dto';
import { RescheduleRequestQueryDto } from '../dto/reschedule-request-query.dto';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../../shared/schemas/notification.schema';
import { ZoomService } from '../../../common/services/zoom.service';
import { SlotType } from '../../../common/constants/availability.constants';
import { Types } from 'mongoose';
import { CreateRescheduleRequestDto } from '../../user/dto/create-reschedule-request.dto';
import { UserAvailabilityService } from '../../user/services/user-availability.service';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { FormatterService } from '../../../shared/services/formatter.service';

@Injectable()
export class RescheduleRequestService {
    private readonly logger = new Logger(RescheduleRequestService.name);

    constructor(
        private readonly rescheduleRequestRepository: RescheduleRequestRepository,
        private readonly bookingRepository: BookingRepository,
        private readonly notificationService: NotificationService,
        private readonly zoomService: ZoomService,
        private readonly userAvailabilityService: UserAvailabilityService,
        private readonly userRepository: UserRepository,
        private readonly formatterService: FormatterService,
    ) { }

    /**
     * Get all reschedule requests with filters and pagination
     */
    async getRescheduleRequests(queryDto: RescheduleRequestQueryDto) {
        const { page = 1, limit = 10, status, type, dateFrom, dateTo, search } = queryDto;

        // Build query filters
        const query: any = {};

        // Filter by status - exclude APPROVED by default if not specified
        if (status) {
            query.status = status;
        } else {
            // Exclude APPROVED requests by default (they appear in normal booking listing)
            query.status = { $ne: RescheduleRequestStatus.APPROVED };
        }

        // Filter by booking type - first get booking IDs if type is specified
        let bookingIds: Types.ObjectId[] | undefined;
        if (type) {
            // Use findBookingsByDateRange with a wide date range to get all bookings of this type
            // Or better: query bookings directly through the model
            const allBookings = await this.bookingRepository.findBookingsByDateRange(
                type,
                new Date('2000-01-01'), // Very old date
                new Date('2100-12-31')  // Very future date
            );
            if (allBookings.length === 0) {
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
            bookingIds = allBookings.map(booking => booking._id);
            query.booking = { $in: bookingIds };
        }

        // Filter by date range (requestedDate)
        if (dateFrom || dateTo) {
            query.requestedDate = {};
            if (dateFrom) {
                query.requestedDate.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.requestedDate.$lte = endDate;
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

        // Get paginated results with population
        const result = await this.rescheduleRequestRepository.paginate(page, limit, query, {
            sort: { createdAt: -1 },
            populate: [
                {
                    path: 'booking',
                    select: 'type date slots status paymentStatus amount details zoomLink',
                },
                {
                    path: 'user',
                    select: 'firstName lastName email phone',
                },
            ],
        });

        const filteredData = result.data;

        // Format the response
        const formattedData = filteredData.map((request: any, index: number) => {
            return this.formatterService.formatRescheduleRequestForListing(request, index, page, limit);
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
     * Get a single reschedule request by ID with full details
     */
    async getRescheduleRequestById(requestId: string) {
        const request = await this.rescheduleRequestRepository.findById(requestId);
        if (!request) {
            throw new NotFoundException('Reschedule request not found');
        }

        // Populate booking and user details
        await request.populate([
            {
                path: 'booking',
                select: 'type date slots status paymentStatus amount details zoomLink createdAt updatedAt',
            },
            {
                path: 'user',
                select: 'firstName lastName email phone',
            },
            {
                path: 'reviewedBy',
                select: 'firstName lastName email',
            },
        ]);

        const formattedRequest = this.formatterService.formatRescheduleRequest(request, true);
        const requestObj = this.formatterService.toPlainObject(request);
        const user = requestObj.user || {};
        const reviewedBy = requestObj.reviewedBy;

        // Format reviewedBy if it exists
        let reviewedByFormatted: { id: string | null; name: string; email: string } | null = null;
        if (reviewedBy) {
            const reviewedByObj = this.formatterService.toPlainObject(reviewedBy);
            reviewedByFormatted = {
                id: this.formatterService.objectIdToString(reviewedByObj._id),
                name: reviewedByObj.firstName && reviewedByObj.lastName
                    ? `${reviewedByObj.firstName} ${reviewedByObj.lastName}`
                    : reviewedByObj.email || 'N/A',
                email: reviewedByObj.email || 'N/A',
            };
        }

        return {
            rescheduleRequest: {
                ...formattedRequest,
                reviewedBy: reviewedByFormatted,
            },
            booking: formattedRequest.booking,
            user: {
                id: this.formatterService.objectIdToString(user._id || requestObj.user),
                name: user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email || 'N/A',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || 'N/A',
                phone: user.phone || 'N/A',
            },
        };
    }

    /**
     * Approve or reject a reschedule request
     */
    async updateRescheduleRequest(
        requestId: string,
        adminId: string,
        updateDto: UpdateRescheduleRequestDto,
    ) {
        // 1. Get reschedule request
        const rescheduleRequest = await this.rescheduleRequestRepository.findById(requestId);
        if (!rescheduleRequest) {
            throw new NotFoundException('Reschedule request not found');
        }

        // 2. Check if request is already processed
        if (rescheduleRequest.status !== RescheduleRequestStatus.PENDING) {
            throw new BadRequestException(`Reschedule request is already ${rescheduleRequest.status}`);
        }

        // 2.5. Only allow admin to approve/reject user-initiated requests
        if (rescheduleRequest.requestedBy !== RescheduleRequestedBy.USER) {
            throw new BadRequestException('Admin can only approve/reject user-initiated reschedule requests. Admin-initiated requests must be accepted/rejected by the user.');
        }

        // 3. Get the booking
        const booking = await this.bookingRepository.findById(rescheduleRequest.booking.toString());
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 4. Update reschedule request status
        rescheduleRequest.status = updateDto.status;
        rescheduleRequest.reviewedBy = new Types.ObjectId(adminId) as any;
        rescheduleRequest.reviewedAt = new Date();
        rescheduleRequest.adminNotes = updateDto.adminNotes;

        await rescheduleRequest.save();

        // 5. If approved, update the booking
        if (updateDto.status === RescheduleRequestStatus.APPROVED) {
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

            // 6. If it's a video consultancy booking, create/update Zoom link
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
                    // Don't fail the reschedule if Zoom link fails
                }
            }

            // 7. Send notification to user
            try {
                await this.notificationService.createUserNotification({
                    recipient: booking.user.toString(),
                    title: 'Reschedule Request Approved',
                    message: `Your reschedule request for booking #${booking._id.toString().slice(-6)} has been approved.`,
                    type: NotificationType.BOOKING_CREATED, // Use available type
                    data: {
                        bookingId: booking._id,
                        rescheduleRequestId: rescheduleRequest._id,
                    },
                });
            } catch (error) {
                this.logger.error('Failed to send approval notification:', error);
            }
        } else if (updateDto.status === RescheduleRequestStatus.REJECTED) {
            // 8. Send rejection notification to user
            try {
                await this.notificationService.createUserNotification({
                    recipient: booking.user.toString(),
                    title: 'Reschedule Request Rejected',
                    message: `Your reschedule request for booking #${booking._id.toString().slice(-6)} has been rejected.${updateDto.adminNotes ? ` Reason: ${updateDto.adminNotes}` : ''}`,
                    type: NotificationType.BOOKING_CREATED, // Use available type
                    data: {
                        bookingId: booking._id,
                        rescheduleRequestId: rescheduleRequest._id,
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
                adminNotes: rescheduleRequest.adminNotes,
            },
            booking: updateDto.status === RescheduleRequestStatus.APPROVED
                ? {
                    id: booking._id.toString(),
                    date: booking.date,
                    slots: booking.slots,
                    zoomLink: booking.zoomLink,
                }
                : undefined,
            message: `Reschedule request ${updateDto.status} successfully`,
        };
    }

    /**
     * Admin creates a reschedule request for a user's booking
     */
    async createRescheduleRequest(
        bookingId: string,
        adminId: string,
        createRescheduleRequestDto: CreateRescheduleRequestDto,
    ) {
        // 1. Verify booking exists
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 2. Check if booking status allows rescheduling
        if (booking.status !== BookingStatus.UPCOMING && booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException(`Cannot reschedule booking with status: ${booking.status}. Only upcoming or confirmed bookings can be rescheduled.`);
        }

        // 3. Check if there's already a pending reschedule request for this booking
        const existingRequest = await this.rescheduleRequestRepository.findPendingByBooking(bookingId);
        if (existingRequest) {
            throw new BadRequestException('A pending reschedule request already exists for this booking');
        }

        // 4. Validate requested slots are available
        const availableSlots = await this.userAvailabilityService.getAvailableSlots(
            booking.type,
            createRescheduleRequestDto.requestedDate,
        );

        for (const slot of createRescheduleRequestDto.requestedSlots) {
            const isSlotAvailable = availableSlots.some(
                availSlot => availSlot.startTime === slot.startTime && availSlot.endTime === slot.endTime
            );

            if (!isSlotAvailable) {
                throw new BadRequestException(`Time slot ${slot.startTime}-${slot.endTime} is not available`);
            }
        }

        // 5. Create reschedule request
        const requestedDate = new Date(createRescheduleRequestDto.requestedDate);
        requestedDate.setHours(0, 0, 0, 0);

        const rescheduleRequest = await this.rescheduleRequestRepository.create({
            booking: new Types.ObjectId(bookingId),
            user: booking.user,
            requestedDate,
            requestedSlots: createRescheduleRequestDto.requestedSlots,
            status: RescheduleRequestStatus.PENDING,
            requestedBy: RescheduleRequestedBy.ADMIN,
        } as any);

        // 6. Send notification to user
        try {
            await this.notificationService.createUserNotification({
                recipient: booking.user.toString(),
                title: 'Reschedule Request from Admin',
                message: `Admin has requested to reschedule your booking #${bookingId.slice(-6)}. Please review and respond.`,
                type: NotificationType.BOOKING_CREATED,
                data: {
                    bookingId: booking._id,
                    rescheduleRequestId: rescheduleRequest._id,
                    requestedDate: requestedDate,
                },
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
                requestedBy: rescheduleRequest.requestedBy,
                createdAt: rescheduleRequest.createdAt,
            },
            message: 'Reschedule request created successfully. Waiting for user response.',
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
}

