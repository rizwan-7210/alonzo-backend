import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserSubscription, UserSubscriptionDocument } from '../schemas/user-subscription.schema';
import { UserSubscriptionStatus } from '../../common/constants/subscription.constants';

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
}
