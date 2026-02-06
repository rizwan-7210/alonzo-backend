import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { SubscriptionLogService } from '../services/subscription-log.service';
import { SubscriptionQueryDto } from '../dto/subscription-query.dto';
import { PaymentLogQueryDto } from '../dto/payment-log-query.dto';

@ApiTags('Admin - Subscription Logs')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/subscription-logs')
export class SubscriptionLogController {
    constructor(private readonly subscriptionLogService: SubscriptionLogService) { }

    // ==================== Subscription Endpoints ====================

    @Get('subscriptions')
    @ApiOperation({ summary: 'Get all user subscriptions with filters and pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter by subscription creation date from (ISO date)' })
    @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter by subscription creation date to (ISO date)' })
    @ApiQuery({ name: 'fromExpiryDate', required: false, type: String, description: 'Filter by subscription expiry from (ISO date)' })
    @ApiQuery({ name: 'toExpiryDate', required: false, type: String, description: 'Filter by subscription expiry to (ISO date)' })
    @ApiQuery({ name: 'duration', required: false, enum: ['monthly', 'yearly'], description: 'Filter by plan duration' })
    @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
    @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
    async getAllSubscriptions(@Query() queryDto: SubscriptionQueryDto) {
        return this.subscriptionLogService.getAllSubscriptions(queryDto);
    }

    // ==================== Payment Log Endpoints ====================

    @Get('payments')
    @ApiOperation({ summary: 'Get all payment logs with filters and pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter by payment date from (ISO date)' })
    @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter by payment date to (ISO date)' })
    @ApiQuery({ name: 'fromExpiryDate', required: false, type: String, description: 'Filter by subscription expiry from (ISO date)' })
    @ApiQuery({ name: 'toExpiryDate', required: false, type: String, description: 'Filter by subscription expiry to (ISO date)' })
    @ApiQuery({ name: 'duration', required: false, enum: ['monthly', 'yearly'], description: 'Filter by plan duration' })
    @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
    @ApiResponse({ status: 200, description: 'Payment logs retrieved successfully' })
    async getAllPaymentLogs(@Query() queryDto: PaymentLogQueryDto) {
        return this.subscriptionLogService.getAllPaymentLogs(queryDto);
    }

}
