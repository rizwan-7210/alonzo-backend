import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AvailabilityRepository } from '../../../shared/repositories/availability.repository';
import { BookingRepository } from '../../../shared/repositories/booking.repository';
import { CreateAvailabilityDto } from '../dto/availability/create-availability.dto';
import { UpdateAvailabilityDto } from '../dto/availability/update-availability.dto';
import { AvailabilityQueryDto } from '../dto/availability/availability-query.dto';
import { ToggleDayDto, AddTimeSlotDto, RemoveTimeSlotDto } from '../dto/availability/manage-slots.dto';
import { SlotType, DayOfWeek } from '../../../common/constants/availability.constants';

@Injectable()
export class AvailabilityService {
    constructor(
        private readonly availabilityRepository: AvailabilityRepository,
        private readonly bookingRepository: BookingRepository,
    ) { }

    async upsert(createAvailabilityDto: CreateAvailabilityDto) {
        // Validate for duplicate time slots within each day
        for (const daySchedule of createAvailabilityDto.weeklySchedule) {
            if (daySchedule.slots && daySchedule.slots.length > 0) {
                const slots = daySchedule.slots;
                const slotKeys = new Set<string>();

                for (const slot of slots) {
                    const slotKey = `${slot.startTime}-${slot.endTime}`;
                    if (slotKeys.has(slotKey)) {
                        throw new BadRequestException(
                            `Duplicate time slot found for ${daySchedule.day}: ${slot.startTime} to ${slot.endTime}`
                        );
                    }
                    slotKeys.add(slotKey);
                }
            }
        }

        // Check if availability for this type already exists
        const existing = await this.availabilityRepository.findByType(createAvailabilityDto.type);

        if (existing) {
            // Update existing availability
            const updated = await this.availabilityRepository.update(existing._id.toString(), createAvailabilityDto);
            return this.formatAvailabilityResponse(updated);
        }

        // Create new availability
        const availability = await this.availabilityRepository.create(createAvailabilityDto);
        return this.formatAvailabilityResponse(availability);
    }

    async findAll(queryDto: AvailabilityQueryDto) {
        const { type, day, startDate, endDate } = queryDto;

        if (type && day) {
            const dayAvailability = await this.availabilityRepository.findByTypeAndDay(type, day);
            return dayAvailability;
        }

        if (type) {
            const availability = await this.availabilityRepository.findByType(type);
            return this.formatAvailabilityResponse(availability);
        }

        const allAvailability = await this.availabilityRepository.findAll();
        return allAvailability.map(a => this.formatAvailabilityResponse(a));
    }

    async findOne(id: string) {
        const availability = await this.availabilityRepository.findById(id);
        if (!availability) {
            throw new NotFoundException(`Availability with ID ${id} not found`);
        }
        return this.formatAvailabilityResponse(availability);
    }

    async findByType(type: SlotType) {
        const availability = await this.availabilityRepository.findByType(type);
        if (!availability) {
            throw new NotFoundException(`Availability for ${type} not found`);
        }
        return this.formatAvailabilityResponse(availability);
    }

    async update(id: string, updateAvailabilityDto: UpdateAvailabilityDto) {
        const availability = await this.availabilityRepository.update(id, updateAvailabilityDto);
        if (!availability) {
            throw new NotFoundException(`Availability with ID ${id} not found`);
        }
        return this.formatAvailabilityResponse(availability);
    }

    async remove(id: string) {
        const deleted = await this.availabilityRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException(`Availability with ID ${id} not found`);
        }
        return { message: 'Availability deleted successfully' };
    }

    async toggleDay(type: SlotType, toggleDayDto: ToggleDayDto) {
        const { day, isEnabled } = toggleDayDto;
        const availability = await this.availabilityRepository.updateDayAvailability(type, day, isEnabled);

        if (!availability) {
            throw new NotFoundException(`Availability for ${type} and ${day} not found`);
        }

        return this.formatAvailabilityResponse(availability);
    }

    async addTimeSlot(type: SlotType, addTimeSlotDto: AddTimeSlotDto) {
        const { day, timeSlot } = addTimeSlotDto;

        // Validate time format
        if (timeSlot.startTime >= timeSlot.endTime) {
            throw new BadRequestException('Start time must be before end time');
        }

        const availability = await this.availabilityRepository.addTimeSlot(type, day, timeSlot);

        if (!availability) {
            throw new NotFoundException(`Availability for ${type} and ${day} not found`);
        }

        return this.formatAvailabilityResponse(availability);
    }

    async removeTimeSlot(type: SlotType, removeTimeSlotDto: RemoveTimeSlotDto) {
        const { day, slotIndex } = removeTimeSlotDto;
        const availability = await this.availabilityRepository.removeTimeSlot(type, day, slotIndex);

        if (!availability) {
            throw new NotFoundException(`Time slot not found`);
        }

        return this.formatAvailabilityResponse(availability);
    }

    async getAvailableSlots(type: SlotType, startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const availability = await this.availabilityRepository.getAvailableSlots(type, start, end);

        if (!availability) {
            throw new NotFoundException(`No availability found for ${type}`);
        }

        return this.formatAvailabilityResponse(availability);
    }

    async getAvailableSlotsForDate(type: SlotType, dateStr: string) {
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

    private formatAvailabilityResponse(availability: any) {
        if (!availability) return null;

        const availabilityObj = availability.toObject
            ? availability.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(availability));

        const response: any = {};

        if (availabilityObj._id) {
            response.id = availabilityObj._id.toString();
        }

        const properties = [
            'type',
            'weeklySchedule',
            'isActive',
            'createdAt',
            'updatedAt'
        ];

        properties.forEach(prop => {
            if (availabilityObj[prop] !== undefined) {
                response[prop] = availabilityObj[prop];
            }
        });

        // Convert dates
        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }
}
