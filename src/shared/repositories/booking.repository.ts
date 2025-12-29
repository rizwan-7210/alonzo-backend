import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Booking, BookingDocument } from '../schemas/booking.schema';
import { SlotType } from '../../common/constants/availability.constants';

@Injectable()
export class BookingRepository extends BaseRepository<BookingDocument> {
    constructor(
        @InjectModel(Booking.name) protected readonly bookingModel: Model<BookingDocument>,
    ) {
        super(bookingModel);
    }

    async findBookingsByDateRange(
        type: SlotType,
        startDate: Date,
        endDate: Date
    ): Promise<BookingDocument[]> {
        return this.bookingModel.find({
            type,
            date: {
                $gte: startDate,
                $lte: endDate,
            },
            status: { $ne: 'cancelled' }, // Exclude cancelled bookings
        }).exec();
    }

    async findByUser(userId: string): Promise<BookingDocument[]> {
        return this.bookingModel
            .find({ user: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .exec();
    }
    async countUserBookingsInPeriod(userId: string, startDate: Date, endDate: Date): Promise<number> {
        return this.bookingModel.countDocuments({
            user: new Types.ObjectId(userId),
            date: {
                $gte: startDate,
                $lte: endDate,
            },
            status: { $ne: 'cancelled' },
        }).exec();
    }

    async findUpcomingBookings(startDate: Date, endDate: Date): Promise<BookingDocument[]> {
        // Find all video consultancy bookings that are confirmed or upcoming
        // We'll filter by date range and then check the actual booking time in the service
        const bookings = await this.bookingModel
            .find({
                type: SlotType.VIDEO_CONSULTANCY,
                status: { $in: ['confirmed', 'upcoming'] },
                date: {
                    $gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
                    $lte: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1),
                },
            })
            .exec();

        // Filter bookings where the actual booking time (date + startTime) is within the range
        return bookings.filter(booking => {
            if (!booking.slots || booking.slots.length === 0) return false;

            const firstSlot = booking.slots[0];
            if (!firstSlot.startTime) return false;

            const [hours, minutes] = firstSlot.startTime.split(':').map(Number);
            const bookingDateTime = new Date(booking.date);
            bookingDateTime.setHours(hours, minutes, 0, 0);

            return bookingDateTime >= startDate && bookingDateTime <= endDate;
        });
    }

    async findPastVideoConsultancyBookings(beforeDate: Date): Promise<BookingDocument[]> {
        // Find all video consultancy bookings that are confirmed or upcoming
        // We'll filter by date and then check the actual booking time in the service
        const bookings = await this.bookingModel
            .find({
                type: SlotType.VIDEO_CONSULTANCY,
                status: { $in: ['confirmed', 'upcoming'] },
                date: {
                    $lte: new Date(beforeDate.getFullYear(), beforeDate.getMonth(), beforeDate.getDate() + 1),
                },
            })
            .exec();

        // Filter bookings where the actual booking time (date + endTime) has passed
        return bookings.filter(booking => {
            if (!booking.slots || booking.slots.length === 0) return false;

            const lastSlot = booking.slots[booking.slots.length - 1];
            if (!lastSlot.endTime) return false;

            const [hours, minutes] = lastSlot.endTime.split(':').map(Number);
            const bookingEndDateTime = new Date(booking.date);
            bookingEndDateTime.setHours(hours, minutes, 0, 0);

            return bookingEndDateTime < beforeDate;
        });
    }

    async paginateUserBookings(
        userId: string,
        page: number,
        limit: number,
        filters?: {
            status?: string;
            type?: SlotType;
            dateFrom?: Date;
            dateTo?: Date;
        }
    ) {
        const query: any = { user: new Types.ObjectId(userId) };

        if (filters?.status) {
            query.status = filters.status;
        }

        if (filters?.type) {
            query.type = filters.type;
        }

        if (filters?.dateFrom || filters?.dateTo) {
            query.date = {};
            if (filters.dateFrom) {
                query.date.$gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                // Include the entire end date by setting time to end of day
                const endDate = new Date(filters.dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        return this.paginate(page, limit, query, { sort: { createdAt: -1 } });
    }
}
