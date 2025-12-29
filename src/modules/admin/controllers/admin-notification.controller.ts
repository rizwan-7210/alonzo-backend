import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AdminNotificationService } from '../services/admin-notification.service';
import { NotificationQueryDto } from '../dto/notification-query.dto';

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
@Controller('admin/notifications')
export class AdminNotificationController {
    constructor(private readonly adminNotificationService: AdminNotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all notifications with pagination and filters' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async getAllNotifications(
        @CurrentUser() user: any,
        @Query() queryDto: NotificationQueryDto,
    ) {
        return this.adminNotificationService.getAllNotifications(user.id, queryDto);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notifications count' })
    @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
    async getUnreadCount(@CurrentUser() user: any) {
        const count = await this.adminNotificationService.getUnreadCount(user.id);
        return { count };
    }

    @Patch(':id/mark-as-read')
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.adminNotificationService.markAsRead(user.id, id);
    }

    @Patch(':id/mark-as-unread')
    @ApiOperation({ summary: 'Mark notification as unread' })
    @ApiResponse({ status: 200, description: 'Notification marked as unread' })
    async markAsUnread(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.adminNotificationService.markAsUnread(user.id, id);
    }

    @Patch('mark-all-as-read')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read' })
    async markAllAsRead(@CurrentUser() user: any) {
        return this.adminNotificationService.markAllAsRead(user.id);
    }
}