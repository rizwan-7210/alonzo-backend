import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { PlansService } from '../services/plans.service';
import { PaymentSuccessDto } from '../dto/payment-success.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

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

    @Post('payment-success')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Record successful plan payment (add active subscription and log)',
        operationId: 'vendorPlansPaymentSuccess',
    })
    @ApiBody({ type: PaymentSuccessDto })
    @ApiResponse({
        status: 200,
        description: 'Subscription and payment log created',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Payment recorded successfully' },
                data: {
                    type: 'object',
                    properties: {
                        subscription: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                planId: { type: 'string' },
                                userId: { type: 'string' },
                                amountPaid: { type: 'number' },
                                status: { type: 'string', example: 'paid' },
                                duration: { type: 'string' },
                                expiryDate: { type: 'string', format: 'date-time' },
                            },
                        },
                        paymentLog: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                paymentIntentId: { type: 'string' },
                                amount: { type: 'number' },
                                status: { type: 'string', example: 'succeeded' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Payment not succeeded or invalid metadata' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async paymentSuccess(
        @Body() dto: PaymentSuccessDto,
        @CurrentUser() user: any,
    ) {
        const userId = user?.sub || user?._id || user?.id;
        if (!userId) {
            throw new UnauthorizedException('User not found in request');
        }
        const result = await this.plansService.recordPaymentSuccess(dto.paymentIntentId, userId);
        return {
            message: 'Payment recorded successfully',
            data: result,
        };
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
    @ApiOperation({ summary: 'Create Stripe PaymentIntent for plan purchase' })
    @ApiParam({ name: 'id', description: 'Plan ID' })
    @ApiResponse({
        status: 200,
        description: 'Stripe PaymentIntent created; use clientSecret on client to confirm payment',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Payment intent created successfully' },
                data: {
                    type: 'object',
                    properties: {
                        clientSecret: { type: 'string', description: 'Use with Stripe.js to confirm payment' },
                        paymentIntentId: { type: 'string' },
                        amount: { type: 'number', description: 'Plan amount in dollars' },
                        currency: { type: 'string', example: 'usd' },
                        planId: { type: 'string' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid plan ID, plan is not active, or user already has an active subscription' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async purchase(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        const userId = user?.sub || user?._id || user?.id;
        if (!userId) {
            throw new UnauthorizedException('User not found in request');
        }
        const paymentIntent = await this.plansService.createPurchasePaymentIntent(id, userId);
        return {
            message: 'Payment intent created successfully',
            data: paymentIntent,
        };
    }
}

