import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Review, ReviewDocument } from '../schemas/review.schema';

@Injectable()
export class ReviewRepository extends BaseRepository<ReviewDocument> {
    constructor(
        @InjectModel(Review.name) protected readonly reviewModel: Model<ReviewDocument>,
    ) {
        super(reviewModel);
    }

    async findByBooking(bookingId: string): Promise<ReviewDocument | null> {
        return this.reviewModel
            .findOne({ booking: new Types.ObjectId(bookingId) })
            .populate('user', 'firstName lastName email')
            .exec();
    }

    async findByUser(userId: string): Promise<ReviewDocument[]> {
        return this.reviewModel
            .find({ user: new Types.ObjectId(userId) })
            .populate('booking')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByBookingId(bookingId: string): Promise<ReviewDocument | null> {
        return this.reviewModel
            .findOne({ booking: new Types.ObjectId(bookingId) })
            .populate('user', 'firstName lastName email')
            .exec();
    }
}

