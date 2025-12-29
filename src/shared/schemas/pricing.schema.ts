import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ServiceType } from '../../common/constants/pricing.constants';

export type PricingDocument = Pricing & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class Pricing {
    @Prop({
        type: String,
        enum: Object.values(ServiceType),
        required: true,
        unique: true,
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

export const PricingSchema = SchemaFactory.createForClass(Pricing);

// Indexes
PricingSchema.index({ serviceType: 1 });
