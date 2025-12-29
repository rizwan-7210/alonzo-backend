import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { SlotType } from '../../common/constants/availability.constants';

export enum BookingStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    CONFIRMED = 'confirmed',
    UPCOMING = 'upcoming',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
    REJECTED = 'rejected',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export type BookingDocument = Booking & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class Booking {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: MongooseSchema.Types.ObjectId;

    @Prop({
        type: String,
        enum: Object.values(SlotType),
        required: true,
    })
    type: SlotType;

    @Prop({ required: true })
    date: Date;

    @Prop({ type: [{ startTime: String, endTime: String }], required: true })
    slots: { startTime: string; endTime: string }[];

    @Prop({
        type: String,
        enum: Object.values(BookingStatus),
        default: BookingStatus.PENDING,
    })
    status: BookingStatus;

    @Prop({
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
    })
    paymentStatus: PaymentStatus;

    @Prop({ required: true })
    amount: number;

    @Prop({ type: Object })
    details: {
        subject?: string;
        description?: string;
        fileIds?: MongooseSchema.Types.ObjectId[];
    };

    @Prop({ type: String })
    zoomLink?: string;

    @Prop({ type: String })
    rejectionReason?: string;

    @Prop({ type: Boolean, default: false })
    isRescheduled?: boolean;

    @Prop({ type: String })
    address?: string;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ user: 1 });
BookingSchema.index({ date: 1, type: 1 });
BookingSchema.index({ status: 1 });
