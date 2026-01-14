import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { UserNotificationService } from '../services/user-notification.service';
import { UserNotificationQueryDto } from '../dto/notification-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Users - Notifications')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('users/notifications')
export class UserNotificationController {
    constructor(private readonly userNotificationService: UserNotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all notifications for the user with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: ['read', 'unread', 'archived'] })
    @ApiResponse({
        status: 200,
        description: 'Notifications retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    data: [
                        {
                            id: '...',
                            title: 'Notification Title',
                            message: 'Notification message',
                            type: 'system',
                            status: 'unread',
                            recipient: 'userId123',
                            sender: null,
                            data: {},
                            readAt: null,
                            createdAt: '2024-01-01T00:00:00.000Z',
                            updatedAt: '2024-01-01T00:00:00.000Z',
                        },
                    ],
                    meta: {
                        total: 1,
                        page: 1,
                        limit: 10,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false,
                    },
                },
            },
        },
    })
    async getMyNotifications(
        @CurrentUser() user: any,
        @Query() queryDto: UserNotificationQueryDto,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: 'Notifications retrieved successfully',
            data: await this.userNotificationService.getMyNotifications(userId, queryDto),
        };
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    @ApiResponse({
        status: 200,
        description: 'Unread count retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    count: 5,
                },
            },
        },
    })
    async getUnreadCount(@CurrentUser() user: any) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.userNotificationService.getUnreadCount(userId),
        };
    }

    @Patch(':id/toggle-read')
    @ApiOperation({ summary: 'Toggle notification read/unread status' })
    @ApiParam({ name: 'id', description: 'Notification ID' })
    @ApiResponse({
        status: 200,
        description: 'Notification status toggled successfully',
        schema: {
            example: {
                success: true,
                message: 'Notification status toggled successfully',
                data: {
                    id: '...',
                    title: 'Notification Title',
                    message: 'Notification message',
                    type: 'system',
                    status: 'read',
                    recipient: 'userId123',
                    sender: null,
                    data: {},
                    readAt: '2024-01-01T00:00:00.000Z',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Notification not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Notification does not belong to you' })
    async toggleReadStatus(
        @CurrentUser() user: any,
        @Param('id') notificationId: string,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: 'Notification status toggled successfully',
            data: await this.userNotificationService.toggleReadStatus(userId, notificationId),
        };
    }

    @Patch('mark-all-read')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({
        status: 200,
        description: 'All notifications marked as read',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    success: true,
                    modifiedCount: 5,
                    message: '5 notification(s) marked as read',
                },
            },
        },
    })
    async markAllAsRead(@CurrentUser() user: any) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.userNotificationService.markAllAsRead(userId),
        };
    }

    @Patch('mark-all-unread')
    @ApiOperation({ summary: 'Mark all notifications as unread' })
    @ApiResponse({
        status: 200,
        description: 'All notifications marked as unread',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    success: true,
                    modifiedCount: 3,
                    message: '3 notification(s) marked as unread',
                },
            },
        },
    })
    async markAllAsUnread(@CurrentUser() user: any) {
        const userId = user.sub || user._id || user.id;
        return {
            message: null,
            data: await this.userNotificationService.markAllAsUnread(userId),
        };
    }
}
