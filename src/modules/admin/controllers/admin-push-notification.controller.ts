import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminPushNotificationService } from '../services/admin-push-notification.service';
import { CreatePushNotificationDto } from '../dto/create-push-notification.dto';
import { PushNotificationQueryDto } from '../dto/push-notification-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin - Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/push-notifications')
export class AdminPushNotificationController {
    constructor(
        private readonly adminPushNotificationService: AdminPushNotificationService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send push notification to all users' })
    @ApiBody({ type: CreatePushNotificationDto })
    @ApiResponse({
        status: 200,
        description: 'Push notification sent successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Push notification sent successfully to 150 user(s)' },
                data: {
                    type: 'object',
                    properties: {
                        pushNotification: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                message: { type: 'string' },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' },
                            },
                        },
                        sentCount: { type: 'number', example: 150 },
                        totalUsers: { type: 'number', example: 150 },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async sendPushNotification(
        @CurrentUser() user: any,
        @Body() createDto: CreatePushNotificationDto,
    ) {
        return this.adminPushNotificationService.sendPushNotificationToAllUsers(user.id, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'List push notifications with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Push notifications retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Push notifications retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        notifications: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    title: { type: 'string' },
                                    message: { type: 'string' },
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
    async getPushNotifications(@Query() queryDto: PushNotificationQueryDto) {
        return this.adminPushNotificationService.getPushNotifications(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get push notification details by ID' })
    @ApiParam({ name: 'id', description: 'Push notification ID' })
    @ApiResponse({
        status: 200,
        description: 'Push notification retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Push notification retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid notification ID' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Push notification not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getPushNotificationById(@Param('id') id: string) {
        return this.adminPushNotificationService.getPushNotificationById(id);
    }
}

