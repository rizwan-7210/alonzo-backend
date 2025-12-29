import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingRepository } from '../../../shared/repositories/pricing.repository';
import { ServiceType } from '../../../common/constants/pricing.constants';

@Injectable()
export class PricingService {
    constructor(
        private readonly pricingRepository: PricingRepository,
    ) { }

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

}
