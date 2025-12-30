import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { UserRole, Permission } from '../../../common/constants/user.constants';
import { SubscriptionLogService } from '../services/subscription-log.service';
import { SubscriptionQueryDto } from '../dto/subscription-query.dto';
import { PaymentLogQueryDto } from '../dto/payment-log-query.dto';

@ApiTags('Admin - Subscription Logs')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@RequirePermission(Permission.SUBSCRIPTION_MANAGEMENT)
@Controller('admin/subscription-logs')
export class SubscriptionLogController {
    constructor(private readonly subscriptionLogService: SubscriptionLogService) { }

    // ==================== Subscription Endpoints ====================

    @Get('subscriptions')
    @ApiOperation({ summary: 'Get all user subscriptions with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
    async getAllSubscriptions(@Query() queryDto: SubscriptionQueryDto) {
        return this.subscriptionLogService.getAllSubscriptions(queryDto);
    }

    @Get('subscriptions/stats')
    @ApiOperation({ summary: 'Get subscription statistics' })
    @ApiResponse({ status: 200, description: 'Subscription statistics retrieved successfully' })
    async getSubscriptionStats() {
        return this.subscriptionLogService.getSubscriptionStats();
    }

    @Get('subscriptions/:id')
    @ApiOperation({ summary: 'Get subscription by ID' })
    @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async getSubscriptionById(@Param('id') id: string) {
        return this.subscriptionLogService.getSubscriptionById(id);
    }

    @Get('subscriptions/user/:userId')
    @ApiOperation({ summary: 'Get all subscriptions for a specific user with filters and pagination' })
    @ApiResponse({ status: 200, description: 'User subscriptions retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getSubscriptionsByUserId(
        @Param('userId') userId: string,
        @Query() queryDto: SubscriptionQueryDto,
    ) {
        return this.subscriptionLogService.getSubscriptionsByUserId(userId, queryDto);
    }

    // ==================== Payment Log Endpoints ====================

    @Get('payments')
    @ApiOperation({ summary: 'Get all payment logs with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Payment logs retrieved successfully' })
    async getAllPaymentLogs(@Query() queryDto: PaymentLogQueryDto) {
        return this.subscriptionLogService.getAllPaymentLogs(queryDto);
    }

    @Get('payments/stats')
    @ApiOperation({ summary: 'Get payment log statistics' })
    @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
    async getPaymentLogStats() {
        return this.subscriptionLogService.getPaymentLogStats();
    }

    @Get('payments/:id')
    @ApiOperation({ summary: 'Get payment log by ID' })
    @ApiResponse({ status: 200, description: 'Payment log retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Payment log not found' })
    async getPaymentLogById(@Param('id') id: string) {
        return this.subscriptionLogService.getPaymentLogById(id);
    }

    @Get('payments/user/:userId')
    @ApiOperation({ summary: 'Get all payment logs for a specific user' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'User payment logs retrieved successfully' })
    async getPaymentLogsByUserId(
        @Param('userId') userId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.subscriptionLogService.getPaymentLogsByUserId(userId, page, limit);
    }

    @Get('payments/subscription/:subscriptionId')
    @ApiOperation({ summary: 'Get all payment logs for a specific subscription' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Subscription payment logs retrieved successfully' })
    async getPaymentLogsBySubscriptionId(
        @Param('subscriptionId') subscriptionId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.subscriptionLogService.getPaymentLogsBySubscriptionId(subscriptionId, page, limit);
    }
}
