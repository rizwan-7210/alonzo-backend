import { Controller, Get, Patch, Param, Query, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserNotificationService } from '../services/user-notification.service';
import { UserNotificationQueryDto } from '../dto/user-notification-query.dto';

@ApiTags('User - Notifications')
@ApiBearerAuth()
@Controller('user/notifications')
export class UserNotificationController {
    constructor(private readonly userNotificationService: UserNotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get user notifications with pagination and filters' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async getUserNotifications(
        @CurrentUser() user: any,
        @Query() queryDto: UserNotificationQueryDto,
    ) {
        return this.userNotificationService.getUserNotifications(user.id, queryDto);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notifications count' })
    @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
    async getUnreadCount(@CurrentUser() user: any) {
        const count = await this.userNotificationService.getUnreadCount(user.id);
        return { count };
    }

    @Patch(':id/mark-as-read')
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
        return this.userNotificationService.markAsRead(id, user.id);
    }

    @Patch(':id/mark-as-unread')
    @ApiOperation({ summary: 'Mark notification as unread' })
    @ApiResponse({ status: 200, description: 'Notification marked as unread' })
    async markAsUnread(@Param('id') id: string, @CurrentUser() user: any) {
        return this.userNotificationService.markAsUnread(id, user.id);
    }

    @Patch('mark-all-as-read')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read' })
    async markAllAsRead(@CurrentUser() user: any) {
        return this.userNotificationService.markAllAsRead(user.id);
    }
}