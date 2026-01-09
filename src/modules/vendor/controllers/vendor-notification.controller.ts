import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { VendorNotificationService } from '../services/vendor-notification.service';
import { VendorNotificationQueryDto } from '../dto/notification-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Vendor - Notifications')
@ApiBearerAuth()
@Roles(UserRole.VENDOR)
@Controller('vendor/notifications')
export class VendorNotificationController {
    constructor(private readonly vendorNotificationService: VendorNotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all notifications for the vendor with pagination' })
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
        @Query() queryDto: VendorNotificationQueryDto,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: 'Notifications retrieved successfully',
            data: await this.vendorNotificationService.getMyNotifications(userId, queryDto),
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
            data: await this.vendorNotificationService.getUnreadCount(userId),
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
            data: await this.vendorNotificationService.toggleReadStatus(userId, notificationId),
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
            data: await this.vendorNotificationService.markAllAsRead(userId),
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
            data: await this.vendorNotificationService.markAllAsUnread(userId),
        };
    }
}

