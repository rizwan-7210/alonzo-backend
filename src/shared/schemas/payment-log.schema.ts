import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { PaymentType, PaymentStatus } from '../../common/constants/payment.constants';
import { User } from './user.schema';
import { Plan } from './plan.schema';
import { UserSubscription } from './user-subscription.schema';

export type PaymentLogDocument = PaymentLog & Document;

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

            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class PaymentLog {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: User;

    @Prop({
        type: String,
        enum: Object.values(PaymentType),
        required: true,
    })
    paymentType: PaymentType;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan' })
    planId?: Plan;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'UserSubscription' })
    subscriptionId?: UserSubscription;

    @Prop({ type: MongooseSchema.Types.ObjectId })
    bookingId?: MongooseSchema.Types.ObjectId;

    @Prop({ type: String, required: true })
    paymentIntentId: string;

    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ type: String, default: 'usd' })
    currency: string;

    @Prop({
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Prop({ type: MongooseSchema.Types.Mixed })
    metadata?: Record<string, any>;

    @Prop({ type: MongooseSchema.Types.Mixed })
    stripeResponse?: Record<string, any>;
}

export const PaymentLogSchema = SchemaFactory.createForClass(PaymentLog);

// Indexes
PaymentLogSchema.index({ userId: 1 });
PaymentLogSchema.index({ paymentType: 1 });
PaymentLogSchema.index({ paymentIntentId: 1 }, { unique: true });
PaymentLogSchema.index({ subscriptionId: 1 });
PaymentLogSchema.index({ bookingId: 1 });
PaymentLogSchema.index({ status: 1 });
PaymentLogSchema.index({ createdAt: -1 });
