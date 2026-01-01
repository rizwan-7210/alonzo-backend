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
            .find({ status: PlanStatus.ACTIVE, deletedAt: null })
            .sort({ amount: 1 })
            .exec();
    }

    async findByStripeProductId(stripeProductId: string): Promise<PlanDocument | null> {
        return this.planModel
            .findOne({ stripe_product_id: stripeProductId })
            .exec();
    }

    async findByStripePriceId(stripePriceId: string): Promise<PlanDocument | null> {
        return this.planModel
            .findOne({ stripe_price_id: stripePriceId })
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

    async findAllWithPagination(
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: PlanStatus,
    ) {
        const conditions: any = { deletedAt: null };

        if (search) {
            conditions.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (status) {
            conditions.status = status;
        }

        return this.paginate(page, limit, conditions, { sort: { createdAt: -1 } });
    }
}
