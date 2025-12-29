import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { SlotType } from '../../common/constants/availability.constants';

export enum RescheduleRequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum RescheduleRequestedBy {
    USER = 'user',
    ADMIN = 'admin',
}

export type RescheduleRequestDocument = RescheduleRequest & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class RescheduleRequest {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
    booking: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    requestedDate: Date;

    @Prop({ type: [{ startTime: String, endTime: String }], required: true })
    requestedSlots: { startTime: string; endTime: string }[];

    @Prop({
        type: String,
        enum: Object.values(RescheduleRequestStatus),
        default: RescheduleRequestStatus.PENDING,
    })
    status: RescheduleRequestStatus;

    @Prop({
        type: String,
        enum: Object.values(RescheduleRequestedBy),
        default: RescheduleRequestedBy.USER,
    })
    requestedBy: RescheduleRequestedBy;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    reviewedBy?: MongooseSchema.Types.ObjectId;

    @Prop({ type: Date })
    reviewedAt?: Date;

    @Prop({ type: String })
    adminNotes?: string;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const RescheduleRequestSchema = SchemaFactory.createForClass(RescheduleRequest);

RescheduleRequestSchema.index({ booking: 1 });
RescheduleRequestSchema.index({ user: 1 });
RescheduleRequestSchema.index({ status: 1 });
RescheduleRequestSchema.index({ createdAt: -1 });


