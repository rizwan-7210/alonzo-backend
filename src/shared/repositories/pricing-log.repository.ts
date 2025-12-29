import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PricingLog, PricingLogDocument } from '../schemas/pricing-log.schema';
import { ServiceType } from '../../common/constants/pricing.constants';

@Injectable()
export class PricingLogRepository extends BaseRepository<PricingLogDocument> {
    constructor(
        @InjectModel(PricingLog.name) protected readonly pricingLogModel: Model<PricingLogDocument>,
    ) {
        super(pricingLogModel);
    }

    async findByServiceType(
        serviceType: ServiceType,
        page: number = 1,
        limit: number = 10
    ): Promise<{
        data: PricingLogDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        return this.paginate(
            page,
            limit,
            { serviceType },
            { sort: { createdAt: -1 } }
        );
    }

    async createLog(
        serviceType: ServiceType,
        amount: number,
        currency?: string
    ): Promise<PricingLogDocument> {
        return this.create({ serviceType, amount, currency: currency || 'USD' });
    }
}
