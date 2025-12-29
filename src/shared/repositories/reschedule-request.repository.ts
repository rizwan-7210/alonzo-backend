import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RescheduleRequest, RescheduleRequestDocument } from '../schemas/reschedule-request.schema';
import { RescheduleRequestStatus } from '../schemas/reschedule-request.schema';

@Injectable()
export class RescheduleRequestRepository extends BaseRepository<RescheduleRequestDocument> {
    constructor(
        @InjectModel(RescheduleRequest.name) protected readonly rescheduleRequestModel: Model<RescheduleRequestDocument>,
    ) {
        super(rescheduleRequestModel);
    }

    async findByBooking(bookingId: string): Promise<RescheduleRequestDocument | null> {
        return this.rescheduleRequestModel
            .findOne({ booking: new Types.ObjectId(bookingId) })
            .populate('booking')
            .populate('user')
            .exec();
    }

    async findByUser(userId: string): Promise<RescheduleRequestDocument[]> {
        return this.rescheduleRequestModel
            .find({ user: new Types.ObjectId(userId) })
            .populate('booking')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findPendingRequests(): Promise<RescheduleRequestDocument[]> {
        return this.rescheduleRequestModel
            .find({ status: RescheduleRequestStatus.PENDING })
            .populate('booking')
            .populate('user')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findPendingRequestsPaginated(
        page: number,
        limit: number,
    ) {
        const query: any = { status: RescheduleRequestStatus.PENDING };

        return this.paginate(page, limit, query, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'booking' },
                { path: 'user', select: 'firstName lastName email' },
            ],
        });
    }

    async findPendingByBooking(bookingId: string): Promise<RescheduleRequestDocument | null> {
        return this.rescheduleRequestModel
            .findOne({ 
                booking: new Types.ObjectId(bookingId),
                status: RescheduleRequestStatus.PENDING
            })
            .exec();
    }

    async findByUserPaginated(
        userId: string,
        page: number,
        limit: number,
        status?: RescheduleRequestStatus,
        excludeStatus?: RescheduleRequestStatus,
    ) {
        const query: any = { user: new Types.ObjectId(userId) };
        
        if (status) {
            query.status = status;
        } else if (excludeStatus) {
            // Only exclude if no specific status was requested
            query.status = { $ne: excludeStatus };
        }

        return this.paginate(page, limit, query, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'booking' },
            ],
        });
    }

    async findPendingByBookingAndUser(bookingId: string, userId: string): Promise<RescheduleRequestDocument | null> {
        return this.rescheduleRequestModel
            .findOne({ 
                booking: new Types.ObjectId(bookingId),
                user: new Types.ObjectId(userId),
                status: RescheduleRequestStatus.PENDING
            })
            .exec();
    }
}


