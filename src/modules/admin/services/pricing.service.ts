import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingRepository } from '../../../shared/repositories/pricing.repository';
import { PricingLogRepository } from '../../../shared/repositories/pricing-log.repository';
import { UpdatePricingDto } from '../dto/pricing/update-pricing.dto';
import { PricingLogQueryDto } from '../dto/pricing/pricing-log-query.dto';
import { ServiceType } from '../../../common/constants/pricing.constants';

@Injectable()
export class PricingService {
    constructor(
        private readonly pricingRepository: PricingRepository,
        private readonly pricingLogRepository: PricingLogRepository,
    ) { }

    async updatePricing(updatePricingDto: UpdatePricingDto) {
        const { serviceType, amount, currency } = updatePricingDto;

        // Update or create pricing
        const pricing = await this.pricingRepository.upsertByServiceType(
            serviceType,
            amount,
            currency
        );

        // Create log entry
        await this.pricingLogRepository.createLog(serviceType, amount, currency);

        return this.formatPricingResponse(pricing);
    }

    async getCurrentPricing(serviceType?: ServiceType) {
        if (serviceType) {
            const pricing = await this.pricingRepository.findByServiceType(serviceType);
            if (!pricing) {
                throw new NotFoundException(`Pricing for ${serviceType} not found`);
            }
            return this.formatPricingResponse(pricing);
        }

        const allPricing = await this.pricingRepository.getAllPricing();
        return allPricing.map(p => this.formatPricingResponse(p));
    }

    async getPricingLogs(queryDto: PricingLogQueryDto) {
        const { serviceType, page = 1, limit = 10 } = queryDto;

        if (serviceType) {
            const result = await this.pricingLogRepository.findByServiceType(
                serviceType,
                page,
                limit
            );
            result.data = result.data.map(log => this.formatPricingLogResponse(log));
            return result;
        }

        const result = await this.pricingLogRepository.paginate(
            page,
            limit,
            {},
            { sort: { createdAt: -1 } }
        );
        result.data = result.data.map(log => this.formatPricingLogResponse(log));
        return result;
    }

    private formatPricingResponse(pricing: any) {
        if (!pricing) return null;

        const pricingObj = pricing.toObject
            ? pricing.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(pricing));

        const response: any = {};

        if (pricingObj._id) {
            response.id = pricingObj._id.toString();
        }

        const properties = ['serviceType', 'amount', 'currency', 'createdAt', 'updatedAt'];

        properties.forEach(prop => {
            if (pricingObj[prop] !== undefined) {
                response[prop] = pricingObj[prop];
            }
        });

        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }

    private formatPricingLogResponse(log: any) {
        if (!log) return null;

        const logObj = log.toObject
            ? log.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(log));

        const response: any = {};

        if (logObj._id) {
            response.id = logObj._id.toString();
        }

        const properties = ['serviceType', 'amount', 'currency', 'createdAt', 'updatedAt'];

        properties.forEach(prop => {
            if (logObj[prop] !== undefined) {
                response[prop] = logObj[prop];
            }
        });

        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }
}
