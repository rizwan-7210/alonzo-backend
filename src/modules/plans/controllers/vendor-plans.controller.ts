import {
    Controller,
    Get,
    Post,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PlansService } from '../services/plans.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Vendor - Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/plans')
export class VendorPlansController {
    constructor(
        private readonly plansService: PlansService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all active plans' })
    @ApiResponse({
        status: 200,
        description: 'Active plans retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Active plans retrieved successfully' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            stripe_price_id: { type: 'string' },
                            stripe_product_id: { type: 'string' },
                            duration: { type: 'string' },
                            amount: { type: 'number' },
                            description: { type: 'string' },
                            status: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findAll() {
        return this.plansService.findActivePlans();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get plan details by ID' })
    @ApiParam({ name: 'id', description: 'Plan ID' })
    @ApiResponse({
        status: 200,
        description: 'Plan retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plan retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        stripe_price_id: { type: 'string' },
                        stripe_product_id: { type: 'string' },
                        duration: { type: 'string' },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid plan ID' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findOne(@Param('id') id: string) {
        return this.plansService.findOne(id);
    }

    @Post(':id/purchase')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Purchase plan (API structure only)' })
    @ApiParam({ name: 'id', description: 'Plan ID' })
    @ApiResponse({
        status: 200,
        description: 'Plan purchase initiated',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plan purchase endpoint - structure only' },
                data: {
                    type: 'object',
                    properties: {
                        planId: { type: 'string' },
                        message: { type: 'string', example: 'Purchase logic to be implemented' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid plan ID or plan is not active' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async purchase(@Param('id') id: string) {
        // Validate plan exists and is active
        const planResponse = await this.plansService.findOne(id);
        const plan = planResponse.data;
        
        if (plan.status !== 'active') {
            throw new BadRequestException('Plan is not active');
        }
        
        return {
            message: 'Plan purchase endpoint - structure only',
            data: {
                planId: id,
                message: 'Purchase logic to be implemented',
            },
        };
    }
}

