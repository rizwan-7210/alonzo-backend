import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PlanStatus, PlanDuration } from '../../common/constants/plan.constants';

export type PlanDocument = Plan & Document;

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
            if (transformedRet.deletedAt) {
                transformedRet.deletedAt = new Date(transformedRet.deletedAt).toISOString();
            }

            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class Plan {
    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({ type: String, required: false })
    stripe_price_id?: string;

    @Prop({ type: String, required: false })
    stripe_product_id?: string;

    @Prop({
        type: String,
        enum: Object.values(PlanDuration),
        required: true,
    })
    duration: PlanDuration;

    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ type: String })
    description?: string;

    @Prop({
        type: String,
        enum: Object.values(PlanStatus),
        default: PlanStatus.ACTIVE,
    })
    status: PlanStatus;

    @Prop({ type: Date })
    deletedAt?: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

// Indexes
PlanSchema.index({ status: 1 });
PlanSchema.index({ createdAt: -1 });
PlanSchema.index({ title: 1 });
