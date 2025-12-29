import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SlotType, DayOfWeek } from '../../common/constants/availability.constants';

export type AvailabilityDocument = Availability & Document;

class TimeSlot {
    @Prop({ required: true })
    startTime: string; // Format: HH:mm (e.g., "09:00")

    @Prop({ required: true })
    endTime: string; // Format: HH:mm (e.g., "10:00")

    @Prop({ default: true })
    isEnabled?: boolean;
}

class DayAvailability {
    @Prop({
        type: String,
        enum: Object.values(DayOfWeek),
        required: true,
    })
    day: DayOfWeek;

    @Prop({ default: true })
    isEnabled?: boolean;

    @Prop({ type: [TimeSlot], default: [] })
    slots?: TimeSlot[];
}

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class Availability {
    @Prop({
        type: String,
        enum: Object.values(SlotType),
        required: true,
    })
    type: SlotType;

    @Prop({ type: [DayAvailability], default: [] })
    weeklySchedule: DayAvailability[];

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Indexes
AvailabilitySchema.index({ type: 1 });
AvailabilitySchema.index({ isActive: 1 });
AvailabilitySchema.index({ 'weeklySchedule.day': 1 });
