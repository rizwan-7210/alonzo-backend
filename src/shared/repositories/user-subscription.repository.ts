import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserSubscription, UserSubscriptionDocument } from '../schemas/user-subscription.schema';
import { SubscriptionStatus } from '../../common/constants/subscription.constants';

@Injectable()
export class UserSubscriptionRepository extends BaseRepository<UserSubscriptionDocument> {
    constructor(
        @InjectModel(UserSubscription.name) protected readonly subscriptionModel: Model<UserSubscriptionDocument>,
    ) {
        super(subscriptionModel);
    }

    async findByUserId(userId: string): Promise<UserSubscriptionDocument | null> {
        return this.subscriptionModel
            .findOne({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('planId')
            .exec();
    }

    async findActiveByUserId(userId: string): Promise<UserSubscriptionDocument | null> {
        return this.subscriptionModel
            .findOne({
                userId: new Types.ObjectId(userId),
                status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
            })
            .sort({ createdAt: -1 })
            .populate('planId')
            .exec();
    }

    async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<UserSubscriptionDocument | null> {
        return this.subscriptionModel
            .findOne({ stripeSubscriptionId })
            .populate('planId')
            .exec();
    }

    async findByStripeCustomerId(stripeCustomerId: string): Promise<UserSubscriptionDocument[]> {
        return this.subscriptionModel
            .find({ stripeCustomerId })
            .sort({ createdAt: -1 })
            .populate('planId')
            .exec();
    }
}
