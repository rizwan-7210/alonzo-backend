import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserSubscriptionsService } from '../services/user-subscriptions.service';
import { ListUserSubscriptionsDto } from '../dto/list-user-subscriptions.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('User - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user/subscriptions')
export class UserSubscriptionsController {
    constructor(
        private readonly userSubscriptionsService: UserSubscriptionsService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List logged-in user subscriptions' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, type: String, enum: ['paid', 'unpaid'], description: 'Filter by status' })
    @ApiResponse({
        status: 200,
        description: 'User subscriptions retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'User subscriptions retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        subscriptions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    planId: { type: 'object' },
                                    userId: { type: 'object' },
                                    amountPaid: { type: 'number' },
                                    status: { type: 'string' },
                                    duration: { type: 'string' },
                                    expiryDate: { type: 'string', format: 'date-time' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                page: { type: 'number' },
                                limit: { type: 'number' },
                                totalPages: { type: 'number' },
                                hasNext: { type: 'boolean' },
                                hasPrev: { type: 'boolean' },
                            },
                        },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findAll(
        @Query() queryDto: ListUserSubscriptionsDto,
        @CurrentUser() user: any,
    ) {
        return this.userSubscriptionsService.findAll(queryDto, user.id, false);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user subscription details by ID' })
    @ApiParam({ name: 'id', description: 'User subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'User subscription retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'User subscription retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        planId: { type: 'object' },
                        userId: { type: 'object' },
                        amountPaid: { type: 'number' },
                        status: { type: 'string' },
                        duration: { type: 'string' },
                        expiryDate: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid subscription ID' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - You can only access your own subscriptions' })
    @ApiResponse({ status: 404, description: 'User subscription not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.userSubscriptionsService.findOne(id, user.id, false);
    }
}

