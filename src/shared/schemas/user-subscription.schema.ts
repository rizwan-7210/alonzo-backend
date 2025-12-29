import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { SubscriptionStatus } from '../../common/constants/subscription.constants';
import { User } from './user.schema';
import { Plan } from './plan.schema';

export type UserSubscriptionDocument = UserSubscription & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            const transformedRet = ret as any;

            // Convert ObjectId to string
            if (transformedRet._id && typeof transformedRet._id === 'object') {
                transformedRet.id = transformedRet._id.toString();
                delete transformedRet._id;
            }

            // Convert dates
            if (transformedRet.createdAt) {
                transformedRet.createdAt = new Date(transformedRet.createdAt).toISOString();
            }
            if (transformedRet.updatedAt) {
                transformedRet.updatedAt = new Date(transformedRet.updatedAt).toISOString();
            }
            if (transformedRet.currentPeriodStart) {
                transformedRet.currentPeriodStart = new Date(transformedRet.currentPeriodStart).toISOString();
            }
            if (transformedRet.currentPeriodEnd) {
                transformedRet.currentPeriodEnd = new Date(transformedRet.currentPeriodEnd).toISOString();
            }
            if (transformedRet.canceledAt) {
                transformedRet.canceledAt = new Date(transformedRet.canceledAt).toISOString();
            }
            if (transformedRet.endedAt) {
                transformedRet.endedAt = new Date(transformedRet.endedAt).toISOString();
            }

            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class UserSubscription {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan', required: true })
    planId: Plan;

    @Prop({ type: String, required: true })
    stripeSubscriptionId: string;

    @Prop({ type: String, required: true })
    stripeCustomerId: string;

    @Prop({
        type: String,
        enum: Object.values(SubscriptionStatus),
        default: SubscriptionStatus.INCOMPLETE,
    })
    status: SubscriptionStatus;

    @Prop({ type: Date, required: true })
    currentPeriodStart: Date;

    @Prop({ type: Date, required: true })
    currentPeriodEnd: Date;

    @Prop({ type: Boolean, default: false })
    cancelAtPeriodEnd: boolean;

    @Prop({ type: Date })
    canceledAt?: Date;

    @Prop({ type: Date })
    endedAt?: Date;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);

// Indexes
UserSubscriptionSchema.index({ userId: 1 });
UserSubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true });
UserSubscriptionSchema.index({ stripeCustomerId: 1 });
UserSubscriptionSchema.index({ status: 1 });
