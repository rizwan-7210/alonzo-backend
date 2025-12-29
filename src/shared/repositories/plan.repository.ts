import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import { PlanStatus } from '../../common/constants/plan.constants';

@Injectable()
export class PlanRepository extends BaseRepository<PlanDocument> {
    constructor(
        @InjectModel(Plan.name) protected readonly planModel: Model<PlanDocument>,
    ) {
        super(planModel);
    }

    async findActivePlans(): Promise<PlanDocument[]> {
        return this.planModel
            .find({ status: PlanStatus.ACTIVE })
            .sort({ amount: 1 })
            .exec();
    }

    async findByStripeProductId(stripeProductId: string): Promise<PlanDocument | null> {
        return this.planModel
            .findOne({ stripeProductId })
            .exec();
    }

    async findByStripePriceId(stripePriceId: string): Promise<PlanDocument | null> {
        return this.planModel
            .findOne({ stripePriceId })
            .exec();
    }

    async softDelete(id: string): Promise<PlanDocument | null> {
        return this.planModel
            .findByIdAndUpdate(
                id,
                {
                    status: PlanStatus.INACTIVE,
                    deletedAt: new Date(),
                },
                { new: true },
            )
            .exec();
    }

    async findAllNonDeleted(): Promise<PlanDocument[]> {
        return this.planModel.find({ deletedAt: null }).exec();
    }
}
