import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { PricingService } from '../services/pricing.service';
import { UpdatePricingDto } from '../dto/pricing/update-pricing.dto';
import { PricingLogQueryDto } from '../dto/pricing/pricing-log-query.dto';
import { ServiceType } from '../../../common/constants/pricing.constants';

@ApiTags('Admin - Pricing')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/pricing')
export class PricingController {
    constructor(private readonly pricingService: PricingService) { }

    @Post('update')
    @ApiOperation({ summary: 'Update pricing for a service type' })
    @ApiResponse({ status: 200, description: 'Pricing updated successfully' })
    async updatePricing(@Body() updatePricingDto: UpdatePricingDto) {
        return this.pricingService.updatePricing(updatePricingDto);
    }

    @Get('current')
    @ApiOperation({ summary: 'Get current pricing for all service types' })
    @ApiResponse({ status: 200, description: 'Current pricing retrieved successfully' })
    async getCurrentPricing() {
        return this.pricingService.getCurrentPricing();
    }

    @Get('current/:serviceType')
    @ApiOperation({ summary: 'Get current pricing for a specific service type' })
    @ApiResponse({ status: 200, description: 'Pricing retrieved successfully' })
    async getCurrentPricingByType(@Param('serviceType') serviceType: ServiceType) {
        return this.pricingService.getCurrentPricing(serviceType);
    }

    @Get('logs')
    @ApiOperation({ summary: 'Get pricing logs with pagination' })
    @ApiResponse({ status: 200, description: 'Pricing logs retrieved successfully' })
    async getPricingLogs(@Query() queryDto: PricingLogQueryDto) {
        return this.pricingService.getPricingLogs(queryDto);
    }
}
