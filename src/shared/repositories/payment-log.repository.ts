import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PaymentLog, PaymentLogDocument } from '../schemas/payment-log.schema';
import { PaymentType, PaymentStatus } from '../../common/constants/payment.constants';

@Injectable()
export class PaymentLogRepository extends BaseRepository<PaymentLogDocument> {
    constructor(
        @InjectModel(PaymentLog.name) protected readonly paymentLogModel: Model<PaymentLogDocument>,
    ) {
        super(paymentLogModel);
    }

    async findByUserId(userId: string): Promise<PaymentLogDocument[]> {
        return this.paymentLogModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('planId')
            .populate('subscriptionId')
            .exec();
    }

    async findByPaymentType(paymentType: PaymentType): Promise<PaymentLogDocument[]> {
        return this.paymentLogModel
            .find({ paymentType })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByPaymentIntentId(paymentIntentId: string): Promise<PaymentLogDocument | null> {
        return this.paymentLogModel
            .findOne({ paymentIntentId })
            .populate('planId')
            .populate('subscriptionId')
            .exec();
    }

    async findBySubscriptionId(subscriptionId: string): Promise<PaymentLogDocument[]> {
        return this.paymentLogModel
            .find({ subscriptionId: new Types.ObjectId(subscriptionId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByBookingId(bookingId: string): Promise<PaymentLogDocument[]> {
        return this.paymentLogModel
            .find({ bookingId: new Types.ObjectId(bookingId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    async updateStatus(paymentIntentId: string, status: PaymentStatus): Promise<PaymentLogDocument | null> {
        return this.paymentLogModel
            .findOneAndUpdate(
                { paymentIntentId },
                { status },
                { new: true }
            )
            .exec();
    }

    async sumSubscriptionEarnings(): Promise<number> {
        const result = await this.paymentLogModel.aggregate([
            {
                $match: {
                    paymentType: PaymentType.SUBSCRIPTION,
                    status: PaymentStatus.SUCCEEDED,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                },
            },
        ]);

        return result.length > 0 ? (result[0].total || 0) : 0;
    }
}
