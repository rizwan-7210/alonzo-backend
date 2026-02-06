import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserSubscription, UserSubscriptionDocument } from '../schemas/user-subscription.schema';
import { UserSubscriptionStatus } from '../../common/constants/subscription.constants';
import { PlanDuration } from '../../common/constants/plan.constants';

@Injectable()
export class UserSubscriptionRepository extends BaseRepository<UserSubscriptionDocument> {
    constructor(
        @InjectModel(UserSubscription.name) protected readonly subscriptionModel: Model<UserSubscriptionDocument>,
    ) {
        super(subscriptionModel);
    }

    async findByUserId(userId: string): Promise<UserSubscriptionDocument[]> {
        return this.subscriptionModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('planId')
            .exec();
    }

    async findActiveByUserId(userId: string): Promise<UserSubscriptionDocument | null> {
        return this.subscriptionModel
            .findOne({
                userId: new Types.ObjectId(userId),
                status: UserSubscriptionStatus.PAID,
                expiryDate: { $gte: new Date() },
            })
            .sort({ createdAt: -1 })
            .populate('planId')
            .exec();
    }

    async findAllWithPagination(
        page: number = 1,
        limit: number = 10,
        userId?: string,
        status?: UserSubscriptionStatus,
    ) {
        const conditions: any = {};

        if (userId) {
            conditions.userId = new Types.ObjectId(userId);
        }

        if (status) {
            conditions.status = status;
        }

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [{ path: 'planId' }, { path: 'userId', select: 'firstName lastName email' }],
        });
    }

    /**
     * Find subscription IDs by expiry date range and/or duration (for filtering payment logs).
     */
    async findIdsByExpiryAndDuration(
        fromExpiryDate?: string,
        toExpiryDate?: string,
        duration?: PlanDuration,
    ): Promise<Types.ObjectId[]> {
        const conditions: any = {};
        if (fromExpiryDate || toExpiryDate) {
            conditions.expiryDate = {};
            if (fromExpiryDate) {
                conditions.expiryDate.$gte = new Date(fromExpiryDate);
            }
            if (toExpiryDate) {
                const end = new Date(toExpiryDate);
                end.setHours(23, 59, 59, 999);
                conditions.expiryDate.$lte = end;
            }
        }
        if (duration) {
            conditions.duration = duration;
        }
        const docs = await this.subscriptionModel.find(conditions).select('_id').lean().exec();
        return docs.map((d: any) => d._id);
    }
}
