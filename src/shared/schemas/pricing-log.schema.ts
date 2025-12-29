import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ServiceType } from '../../common/constants/pricing.constants';

export type PricingLogDocument = PricingLog & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class PricingLog {
    @Prop({
        type: String,
        enum: Object.values(ServiceType),
        required: true,
    })
    serviceType: ServiceType;

    @Prop({ required: true, type: Number })
    amount: number;

    @Prop({ default: 'USD' })
    currency?: string;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const PricingLogSchema = SchemaFactory.createForClass(PricingLog);

// Indexes
PricingLogSchema.index({ serviceType: 1, createdAt: -1 });
