import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserSubscriptionStatus } from '../../common/constants/subscription.constants';
import { PlanDuration } from '../../common/constants/plan.constants';

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

            // Convert planId ObjectId to string
            if (transformedRet.planId && typeof transformedRet.planId === 'object') {
                transformedRet.planId = transformedRet.planId.toString();
            }

            // Convert userId ObjectId to string
            if (transformedRet.userId && typeof transformedRet.userId === 'object') {
                transformedRet.userId = transformedRet.userId.toString();
            }

            // Convert dates
            if (transformedRet.createdAt) {
                transformedRet.createdAt = new Date(transformedRet.createdAt).toISOString();
            }
            if (transformedRet.updatedAt) {
                transformedRet.updatedAt = new Date(transformedRet.updatedAt).toISOString();
            }
            if (transformedRet.expiryDate) {
                transformedRet.expiryDate = new Date(transformedRet.expiryDate).toISOString();
            }

            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class UserSubscription {
    @Prop({ type: Types.ObjectId, ref: 'Plan', required: true })
    planId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Number, required: true })
    amountPaid: number;

    @Prop({
        type: String,
        enum: Object.values(UserSubscriptionStatus),
        default: UserSubscriptionStatus.UNPAID,
    })
    status: UserSubscriptionStatus;

    @Prop({
        type: String,
        enum: Object.values(PlanDuration),
        required: true,
    })
    duration: PlanDuration;

    @Prop({ type: Date, required: true })
    expiryDate: Date;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);

// Indexes
UserSubscriptionSchema.index({ userId: 1 });
UserSubscriptionSchema.index({ planId: 1 });
UserSubscriptionSchema.index({ status: 1 });
UserSubscriptionSchema.index({ expiryDate: 1 });
UserSubscriptionSchema.index({ createdAt: -1 });
