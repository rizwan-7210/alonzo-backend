import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { VendorSubscriptionLogService } from '../services/vendor-subscription-log.service';
import { VendorSubscriptionLogQueryDto } from '../dto/subscription-log-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Vendor - Subscription Logs')
@ApiBearerAuth()
@Roles(UserRole.VENDOR)
@Controller('vendor/subscription-logs')
export class VendorSubscriptionLogController {
    constructor(private readonly vendorSubscriptionLogService: VendorSubscriptionLogService) { }

    @Get('subscriptions')
    @ApiOperation({ summary: 'Get my subscription logs' })
    @ApiResponse({
        status: 200,
        description: 'Subscription logs retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    data: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                },
            },
        },
    })
    async getMySubscriptions(
        @CurrentUser() user: any,
        @Query() queryDto: VendorSubscriptionLogQueryDto,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.vendorSubscriptionLogService.getMySubscriptions(userId, queryDto),
        };
    }

    @Get('subscriptions/:id')
    @ApiOperation({ summary: 'Get subscription details by ID' })
    @ApiParam({ name: 'id', description: 'Subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'Subscription details retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    id: '...',
                    plan: {},
                    amountPaid: 100,
                    status: 'paid',
                    duration: 'monthly',
                    expiryDate: '2024-12-31T00:00:00.000Z',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Subscription not found',
    })
    async getMySubscriptionById(
        @CurrentUser() user: any,
        @Param('id') subscriptionId: string,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.vendorSubscriptionLogService.getMySubscriptionById(userId, subscriptionId),
        };
    }

    @Get('payment-logs')
    @ApiOperation({ summary: 'Get my subscription payment logs' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
    @ApiResponse({
        status: 200,
        description: 'Payment logs retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    data: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                },
            },
        },
    })
    async getMyPaymentLogs(
        @CurrentUser() user: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.vendorSubscriptionLogService.getMyPaymentLogs(
                userId,
                page ? Number(page) : 1,
                limit ? Number(limit) : 10,
            ),
        };
    }

    @Get('subscriptions/:id/payment-logs')
    @ApiOperation({ summary: 'Get payment logs for a specific subscription' })
    @ApiParam({ name: 'id', description: 'Subscription ID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
    @ApiResponse({
        status: 200,
        description: 'Payment logs retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    data: [],
                    total: 0,
                    page: 1,
                    limit: 10,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Subscription not found',
    })
    async getPaymentLogsBySubscriptionId(
        @CurrentUser() user: any,
        @Param('id') subscriptionId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.vendorSubscriptionLogService.getPaymentLogsBySubscriptionId(
                userId,
                subscriptionId,
                page ? Number(page) : 1,
                limit ? Number(limit) : 10,
            ),
        };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get my subscription statistics' })
    @ApiResponse({
        status: 200,
        description: 'Subscription statistics retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    total: 5,
                    paid: 3,
                    unpaid: 2,
                    active: 1,
                    currentSubscription: {},
                },
            },
        },
    })
    async getMySubscriptionStats(@CurrentUser() user: any) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.vendorSubscriptionLogService.getMySubscriptionStats(userId),
        };
    }
}

