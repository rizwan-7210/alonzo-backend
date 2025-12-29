import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingRepository } from '../../../shared/repositories/booking.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { BookingStatus } from '../../../shared/schemas/booking.schema';
import { SlotType } from '../../../common/constants/availability.constants';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { NotificationType } from '../../../shared/schemas/notification.schema';

@Injectable()
export class BookingSchedulerService {
    private readonly logger = new Logger(BookingSchedulerService.name);

    constructor(
        private readonly bookingRepository: BookingRepository,
        private readonly notificationService: NotificationService,
        private readonly userRepository: UserRepository,
    ) { }

    /**
     * Run every minute to check for upcoming bookings
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleUpcomingBookings() {
        try {
            const now = new Date();
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

            // Find bookings that are:
            // 1. Status is 'confirmed' or 'upcoming'
            // 2. Type is 'video_consultancy'
            // 3. Date and time is within the next hour
            // 4. Not yet notified (we'll check this by status or a flag)

            // Get bookings that are within the next hour
            // We need to check bookings where date + startTime is between now and 1 hour from now
            const upcomingBookings = await this.bookingRepository.findUpcomingBookings(
                now,
                oneHourFromNow
            );

            this.logger.debug(`Found ${upcomingBookings.length} upcoming bookings to process`);

            for (const booking of upcomingBookings) {
                try {
                    // Check if booking time is approaching (within 1 hour)
                    const bookingDateTime = this.getBookingDateTime(booking);
                    const timeUntilBooking = bookingDateTime.getTime() - now.getTime();
                    const minutesUntilBooking = Math.floor(timeUntilBooking / (1000 * 60));

                    // Send notification if booking is within 1 hour and not already notified
                    // Only send if status is 'UPCOMING' (to avoid duplicate notifications)
                    if (minutesUntilBooking <= 60 && minutesUntilBooking > 0 && booking.status === BookingStatus.UPCOMING) {
                        // Update status to 'upcoming'
                        await this.bookingRepository.update(booking._id.toString(), {
                            status: BookingStatus.UPCOMING,
                        } as any);

                        // Send notification to user
                        await this.sendBookingReminderNotification(booking);

                        this.logger.log(`Processed upcoming booking ${booking._id}, status updated to 'upcoming'`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to process booking ${booking._id}:`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error in handleUpcomingBookings:', error);
        }
    }

    /**
     * Run every minute to check for completed video consultancy bookings
     * Marks bookings as COMPLETED when their time has passed
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleCompletedBookings() {
        try {
            const now = new Date();

            // Find video consultancy bookings that have passed their end time
            const pastBookings = await this.bookingRepository.findPastVideoConsultancyBookings(now);

            this.logger.debug(`Found ${pastBookings.length} past video consultancy bookings to mark as completed`);

            for (const booking of pastBookings) {
                try {
                    // Only mark as completed if status is confirmed or upcoming
                    if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.UPCOMING) {
                        await this.bookingRepository.update(booking._id.toString(), {
                            status: BookingStatus.COMPLETED,
                        } as any);

                        this.logger.log(`Marked booking ${booking._id} as COMPLETED (video consultancy time has passed)`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to mark booking ${booking._id} as completed:`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error in handleCompletedBookings:', error);
        }
    }

    /**
     * Get the exact date and time of the booking
     */
    private getBookingDateTime(booking: any): Date {
        const bookingDate = new Date(booking.date);
        const firstSlot = booking.slots[0];

        if (firstSlot && firstSlot.startTime) {
            const [hours, minutes] = firstSlot.startTime.split(':').map(Number);
            bookingDate.setHours(hours, minutes, 0, 0);
        }

        return bookingDate;
    }

    /**
     * Send reminder notification to user about upcoming booking
     */
    private async sendBookingReminderNotification(booking: any) {
        try {
            const user = await this.userRepository.findById(booking.user.toString());
            if (!user) {
                this.logger.warn(`User not found for booking ${booking._id}`);
                return;
            }

            const bookingDateTime = this.getBookingDateTime(booking);
            const formattedDate = bookingDateTime.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            let message = `Your ${booking.type === SlotType.VIDEO_CONSULTANCY ? 'video consultancy' : 'appointment'} is scheduled for ${formattedDate}.`;

            if (booking.type === SlotType.VIDEO_CONSULTANCY && booking.zoomLink) {
                message += ` Join the meeting: ${booking.zoomLink}`;
            }

            await this.notificationService.createUserNotification({
                title: 'Upcoming Booking Reminder',
                message: message,
                type: NotificationType.BOOKING_CREATED,
                recipient: user._id.toString(),
                data: {
                    bookingId: booking._id,
                    type: booking.type,
                    date: booking.date,
                    zoomLink: booking.zoomLink,
                },
            });

            this.logger.log(`Sent reminder notification for booking ${booking._id} to user ${user._id}`);
        } catch (error) {
            this.logger.error(`Failed to send reminder notification for booking ${booking._id}:`, error);
        }
    }
}

