import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationRepository } from '../../../shared/repositories/notification.repository';
import { UserNotificationQueryDto } from '../dto/user-notification-query.dto';
import { NotificationStatus } from '../../../shared/schemas/notification.schema';

@Injectable()
export class UserNotificationService {
    constructor(private readonly notificationRepository: NotificationRepository) { }

    async getUserNotifications(userId: string, queryDto: UserNotificationQueryDto) {
        const { page = 1, limit = 10, status } = queryDto;

        const result = await this.notificationRepository.paginateUserNotifications(
            userId,
            page,
            limit,
            status
        );

        result.data = result.data.map(notification => this.formatNotificationResponse(notification));
        return result;
    }

    async markAsRead(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findById(notificationId);

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.recipient.toString() !== userId) {
            throw new ForbiddenException('Not allowed');
        }

        const updatedNotification = await this.notificationRepository.markAsRead(notificationId);
        return this.formatNotificationResponse(updatedNotification);
    }

    async markAsUnread(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findById(notificationId);

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.recipient.toString() !== userId) {
            throw new ForbiddenException('Not allowed');
        }

        const updatedNotification = await this.notificationRepository.update(notificationId, {
            status: NotificationStatus.UNREAD,
            readAt: undefined,
        } as any);
        return this.formatNotificationResponse(updatedNotification);
    }

    async markAllAsRead(userId: string) {
        return this.notificationRepository.markAllAsRead(userId);
    }

    async getUnreadCount(userId: string) {
        return this.notificationRepository.getUnreadCount(userId);
    }

    private formatNotificationResponse(notification: any) {
        if (!notification) return null;

        const notificationObj = notification.toObject
            ? notification.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(notification));

        const response: any = {};

        if (notificationObj._id) {
            response.id = notificationObj._id.toString();
        }

        const properties = [
            'title',
            'message',
            'type',
            'status',
            'recipient',
            'sender',
            'data',
            'readAt',
            'createdAt',
            'updatedAt'
        ];

        properties.forEach(prop => {
            if (notificationObj[prop] !== undefined) {
                response[prop] = notificationObj[prop];
            }
        });

        // Convert ObjectIds to strings
        if (response.recipient && typeof response.recipient === 'object') {
            response.recipient = response.recipient.toString();
        }
        if (response.sender && typeof response.sender === 'object') {
            response.sender = response.sender.toString();
        }

        // Convert dates
        if (response.readAt) {
            response.readAt = new Date(response.readAt).toISOString();
        }
        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }
}
