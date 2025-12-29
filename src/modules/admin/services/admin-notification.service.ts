import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../../../shared/repositories/notification.repository';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import { NotificationStatus } from '../../../shared/schemas/notification.schema';
import { Types } from 'mongoose';

@Injectable()
export class AdminNotificationService {
    constructor(private readonly notificationRepository: NotificationRepository) { }

    async getAllNotifications(userId: string, queryDto: NotificationQueryDto) {
        const { page = 1, limit = 10, status } = queryDto;

        const conditions: any = {
            recipient: new Types.ObjectId(userId), // Filter by logged-in user ID
        };
        if (status) {
            conditions.status = status;
        }

        const result = await this.notificationRepository.paginate(
            page,
            limit,
            conditions,
            { sort: { createdAt: -1 } }
        );

        result.data = result.data.map(notification => this.formatNotificationResponse(notification));
        return result;
    }

    async markAsRead(userId: string, notificationId: string) {
        // Verify notification belongs to the logged-in user
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new NotFoundException('Notification not found');
        }
        if (notification.recipient.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to mark this notification as read');
        }

        const updatedNotification = await this.notificationRepository.markAsRead(notificationId);
        return this.formatNotificationResponse(updatedNotification);
    }

    async markAsUnread(userId: string, notificationId: string) {
        // Verify notification belongs to the logged-in user
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new NotFoundException('Notification not found');
        }
        if (notification.recipient.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to mark this notification as unread');
        }

        const updatedNotification = await this.notificationRepository.update(notificationId, {
            status: NotificationStatus.UNREAD,
            readAt: undefined,
        } as any);
        return this.formatNotificationResponse(updatedNotification);
    }

    async markAllAsRead(userId: string) {
        // Get all unread notifications for the logged-in user
        const result = await this.notificationRepository.paginate(
            1,
            1000, // Large limit to get all
            {
                recipient: new Types.ObjectId(userId),
                status: NotificationStatus.UNREAD,
            },
            {}
        );

        // Update each notification
        let modifiedCount = 0;
        for (const notification of result.data) {
            await this.notificationRepository.update(notification._id.toString(), {
                status: NotificationStatus.READ,
                readAt: new Date()
            } as any);
            modifiedCount++;
        }

        return {
            success: true,
            modifiedCount,
            message: `${modifiedCount} notification(s) marked as read`
        };
    }

    async getUnreadCount(userId: string) {
        return this.notificationRepository.count({
            recipient: new Types.ObjectId(userId),
            status: NotificationStatus.UNREAD
        });
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
