import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { NotificationRepository } from '../../../shared/repositories/notification.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { UserNotificationQueryDto } from '../dto/notification-query.dto';
import { NotificationStatus, NotificationType } from '../../../shared/schemas/notification.schema';
import { Types } from 'mongoose';

@Injectable()
export class UserNotificationService {
    private readonly logger = new Logger(UserNotificationService.name);

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
    ) { }

    async getMyNotifications(userId: string, queryDto: UserNotificationQueryDto) {
        // Only get notifications that belong to this user (filtered by recipient)
        const { page = 1, limit = 10, status } = queryDto;

        const conditions: any = {
            recipient: new Types.ObjectId(userId), // Only this user's notifications
        };
        if (status) {
            conditions.status = status;
        }

        const result = await this.notificationRepository.paginate(
            page,
            limit,
            conditions,
            {
                sort: { createdAt: -1 },
                populate: [{
                    path: 'sender',
                    select: 'firstName lastName email',
                }],
            }
        );

        return {
            data: result.data.map(notification => this.formatNotificationResponse(notification)),
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            },
        };
    }

    async getUnreadCount(userId: string) {
        // Only count unread notifications that belong to this user (filtered by recipient)
        const count = await this.notificationRepository.getUnreadCount(userId);
        return { count };
    }

    async toggleReadStatus(userId: string, notificationId: string) {
        // Verify notification belongs to the logged-in user before toggling
        const notification = await this.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new NotFoundException('Notification not found');
        }
        
        // Ensure notification belongs to this user (ownership verification)
        const notificationRecipientId = notification.recipient.toString();
        if (notificationRecipientId !== userId) {
            throw new ForbiddenException('You do not have permission to modify this notification');
        }

        // Toggle status: if read, make unread; if unread, make read
        // Only updates notifications that belong to this user (verified above)
        let updatedNotification;
        if (notification.status === NotificationStatus.READ) {
            updatedNotification = await this.notificationRepository.markAsUnread(notificationId);
        } else {
            updatedNotification = await this.notificationRepository.markAsRead(notificationId);
        }

        return this.formatNotificationResponse(updatedNotification);
    }

    async markAllAsRead(userId: string) {
        // Only update notifications that belong to this user (filtered by recipient)
        const result = await this.notificationRepository.markAllAsRead(userId);
        this.logger.log(`Marked ${result.modifiedCount} notification(s) as read for user ${userId}`);
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            message: `${result.modifiedCount} notification(s) marked as read`,
        };
    }

    async markAllAsUnread(userId: string) {
        // Only update notifications that belong to this user (filtered by recipient)
        const result = await this.notificationRepository.markAllAsUnread(userId);
        this.logger.log(`Marked ${result.modifiedCount} notification(s) as unread for user ${userId}`);
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            message: `${result.modifiedCount} notification(s) marked as unread`,
        };
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

        // Ensure recipient is always included and properly formatted
        if (notificationObj.recipient) {
            if (typeof notificationObj.recipient === 'object') {
                // If populated, extract the ID
                response.recipient = notificationObj.recipient._id 
                    ? notificationObj.recipient._id.toString() 
                    : notificationObj.recipient.toString();
            } else {
                response.recipient = notificationObj.recipient.toString();
            }
        } else if (notificationObj.recipient === undefined && notification.recipient) {
            // Fallback: get from original notification object if not in toObject result
            response.recipient = notification.recipient.toString();
        }

        // Convert sender ObjectId to string or object if populated
        if (response.sender && typeof response.sender === 'object') {
            if (response.sender._id) {
                response.sender = {
                    id: response.sender._id.toString(),
                    firstName: response.sender.firstName,
                    lastName: response.sender.lastName,
                    email: response.sender.email,
                };
            } else {
                response.sender = response.sender.toString();
            }
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
