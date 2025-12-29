import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Availability, AvailabilityDocument } from '../schemas/availability.schema';
import { SlotType, DayOfWeek } from '../../common/constants/availability.constants';

@Injectable()
export class AvailabilityRepository extends BaseRepository<AvailabilityDocument> {
    constructor(
        @InjectModel(Availability.name) protected readonly availabilityModel: Model<AvailabilityDocument>,
    ) {
        super(availabilityModel);
    }

    async findByType(type: SlotType): Promise<AvailabilityDocument | null> {
        return this.availabilityModel.findOne({ type, isActive: true }).exec();
    }

    async findByTypeAndDay(type: SlotType, day: DayOfWeek): Promise<any> {
        const availability = await this.availabilityModel
            .findOne({ type, isActive: true })
            .exec();
        console.log("availability", availability);

        if (!availability) return null;

        const daySchedule = availability.weeklySchedule.find(
            (schedule) => schedule.day === day
        );

        return daySchedule || null;
    }

    async updateDayAvailability(
        type: SlotType,
        day: DayOfWeek,
        isEnabled: boolean
    ): Promise<AvailabilityDocument | null> {
        return this.availabilityModel
            .findOneAndUpdate(
                { type, 'weeklySchedule.day': day },
                { $set: { 'weeklySchedule.$.isEnabled': isEnabled } },
                { new: true }
            )
            .exec();
    }

    async addTimeSlot(
        type: SlotType,
        day: DayOfWeek,
        timeSlot: { startTime: string; endTime: string }
    ): Promise<AvailabilityDocument | null> {
        return this.availabilityModel
            .findOneAndUpdate(
                { type, 'weeklySchedule.day': day },
                { $push: { 'weeklySchedule.$.slots': timeSlot } },
                { new: true }
            )
            .exec();
    }

    async removeTimeSlot(
        type: SlotType,
        day: DayOfWeek,
        slotIndex: number
    ): Promise<AvailabilityDocument | null> {
        const availability = await this.availabilityModel.findOne({
            type,
            'weeklySchedule.day': day,
        });

        if (!availability) return null;

        const daySchedule = availability.weeklySchedule.find((s) => s.day === day);
        if (!daySchedule || !daySchedule.slots || !daySchedule.slots[slotIndex]) return null;

        daySchedule.slots.splice(slotIndex, 1);
        return availability.save();
    }

    async getAvailableSlots(
        type: SlotType,
        startDate?: Date,
        endDate?: Date
    ): Promise<AvailabilityDocument | null> {
        return this.availabilityModel
            .findOne({ type, isActive: true })
            .exec();
    }
}
