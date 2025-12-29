import {
    Controller,
    Get,
    Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { PricingService } from '../services/pricing.service';
import { ServiceType } from '../../../common/constants/pricing.constants';

@ApiTags('User - Pricing')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Get('current/:serviceType')
    @ApiOperation({ summary: 'Get current pricing for a specific service type' })
    @ApiResponse({ status: 200, description: 'Pricing retrieved successfully' })
    async getCurrentPricingByType(@Param('serviceType') serviceType: ServiceType) {
        return this.pricingService.getCurrentPricing(serviceType);
    }
}
