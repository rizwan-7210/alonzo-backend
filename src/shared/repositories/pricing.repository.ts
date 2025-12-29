import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Pricing, PricingDocument } from '../schemas/pricing.schema';
import { ServiceType } from '../../common/constants/pricing.constants';

@Injectable()
export class PricingRepository extends BaseRepository<PricingDocument> {
    constructor(
        @InjectModel(Pricing.name) protected readonly pricingModel: Model<PricingDocument>,
    ) {
        super(pricingModel);
    }

    async findByServiceType(serviceType: ServiceType): Promise<PricingDocument | null> {
        return this.pricingModel.findOne({ serviceType }).exec();
    }

    async upsertByServiceType(
        serviceType: ServiceType,
        amount: number,
        currency?: string
    ): Promise<PricingDocument | null> {
        return this.pricingModel
            .findOneAndUpdate(
                { serviceType },
                { amount, currency: currency || 'USD' },
                { new: true, upsert: true }
            )
            .exec();
    }

    async getAllPricing(): Promise<PricingDocument[]> {
        return this.pricingModel.find().exec();
    }
}
