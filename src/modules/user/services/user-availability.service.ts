import { Injectable, BadRequestException } from '@nestjs/common';
import { AvailabilityRepository } from '../../../shared/repositories/availability.repository';
import { BookingRepository } from '../../../shared/repositories/booking.repository';
import { SlotType, DayOfWeek } from '../../../common/constants/availability.constants';

@Injectable()
export class UserAvailabilityService {
    constructor(
        private readonly availabilityRepository: AvailabilityRepository,
        private readonly bookingRepository: BookingRepository,
    ) { }

    async getAvailableSlots(type: SlotType, dateStr: string) {
        if (!dateStr) {
            throw new BadRequestException('Date is required');
        }

        // Parse date string (YYYY-MM-DD) to avoid timezone issues
        // Split the date string and create a date in local timezone
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) {
            throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
        }

        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);

        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) {
            throw new BadRequestException('Invalid date');
        }

        // 1. Get availability schedule for this type
        // Use getDay() which returns 0 (Sunday) to 6 (Saturday)
        const dayIndex = date.getDay();
        const dayOfWeekMap: { [key: number]: DayOfWeek } = {
            0: DayOfWeek.SUNDAY,
            1: DayOfWeek.MONDAY,
            2: DayOfWeek.TUESDAY,
            3: DayOfWeek.WEDNESDAY,
            4: DayOfWeek.THURSDAY,
            5: DayOfWeek.FRIDAY,
            6: DayOfWeek.SATURDAY,
        };

        const dayOfWeek = dayOfWeekMap[dayIndex];

        if (!dayOfWeek) {
            throw new BadRequestException('Invalid day of week derived from date');
        }

        const daySchedule = await this.availabilityRepository.findByTypeAndDay(type, dayOfWeek);

        if (!daySchedule || !daySchedule.isEnabled || !daySchedule.slots || daySchedule.slots.length === 0) {
            return []; // No slots configured for this day
        }

        // 2. Get existing bookings for this date and type
        // Note: findBookingsByDateRange automatically excludes cancelled bookings (status: { $ne: 'cancelled' })
        // Set range to cover the entire day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await this.bookingRepository.findBookingsByDateRange(type, startOfDay, endOfDay);

        // 3. Filter available slots
        // Note: Cancelled bookings are already excluded by findBookingsByDateRange
        // Only active bookings (pending, confirmed, upcoming, completed) are considered
        const availableSlots = daySchedule.slots.filter(slot => {
            if (!slot.isEnabled) return false;

            const slotKey = `${slot.startTime}-${slot.endTime}`;

            // Check if this slot is present in any active booking's slots array
            const isBooked = bookings.some(booking =>
                booking.slots &&
                booking.slots.some(bookedSlot =>
                    `${bookedSlot.startTime}-${bookedSlot.endTime}` === slotKey
                )
            );

            return !isBooked;
        });

        return availableSlots;
    }
}
