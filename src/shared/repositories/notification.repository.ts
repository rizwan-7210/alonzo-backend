import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Notification, NotificationDocument, NotificationStatus, NotificationType } from '../schemas/notification.schema';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationDocument> {
    constructor(
        @InjectModel(Notification.name) protected readonly notificationModel: Model<NotificationDocument>,
    ) {
        super(notificationModel);
    }

    async paginateUserNotifications(
        recipientId: string,
        page: number,
        limit: number,
        status?: NotificationStatus
    ) {
        // Only get notifications that belong to the specified recipient (user)
        const query: any = { recipient: new Types.ObjectId(recipientId) };
        if (status) {
            query.status = status;
        }

        return this.paginate(page, limit, query, { sort: { createdAt: -1 } });
    }

    async findByRecipient(recipientId: string, status?: NotificationStatus): Promise<NotificationDocument[]> {
        const query: any = { recipient: new Types.ObjectId(recipientId) };
        if (status) {
            query.status = status;
        }

        return this.notificationModel
            .find(query)
            .populate('sender', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .exec();
    }

    async markAsRead(notificationId: string): Promise<NotificationDocument | null> {
        // Note: Ownership should be verified before calling this method
        // The service layer ensures only user's own notifications are updated
        return this.notificationModel
            .findByIdAndUpdate(
                notificationId,
                {
                    status: NotificationStatus.READ,
                    readAt: new Date()
                },
                { new: true }
            )
            .exec();
    }

    async markAllAsRead(recipientId: string): Promise<{ modifiedCount: number }> {
        // Only update notifications that belong to the specified recipient (user)
        const result = await this.notificationModel
            .updateMany(
                {
                    recipient: new Types.ObjectId(recipientId),
                    status: NotificationStatus.UNREAD
                },
                {
                    status: NotificationStatus.READ,
                    readAt: new Date()
                }
            )
            .exec();

        return { modifiedCount: result.modifiedCount };
    }

    async markAllAsUnread(recipientId: string): Promise<{ modifiedCount: number }> {
        // Only update notifications that belong to the specified recipient (user)
        const result = await this.notificationModel
            .updateMany(
                {
                    recipient: new Types.ObjectId(recipientId),
                    status: NotificationStatus.READ
                },
                {
                    $set: { status: NotificationStatus.UNREAD },
                    $unset: { readAt: '' }
                }
            )
            .exec();

        return { modifiedCount: result.modifiedCount };
    }

    async markAsUnread(notificationId: string): Promise<NotificationDocument | null> {
        // Note: Ownership should be verified before calling this method
        // The service layer ensures only user's own notifications are updated
        return this.notificationModel
            .findByIdAndUpdate(
                notificationId,
                {
                    $set: { status: NotificationStatus.UNREAD },
                    $unset: { readAt: '' }
                },
                { new: true }
            )
            .exec();
    }

    async getUnreadCount(recipientId: string): Promise<number> {
        // Only count unread notifications that belong to the specified recipient (user)
        return this.notificationModel
            .countDocuments({
                recipient: new Types.ObjectId(recipientId),
                status: NotificationStatus.UNREAD
            })
            .exec();
    }

    async createNotification(data: {
        title: string;
        message: string;
        type: NotificationType;
        recipient: string;         // <-- incoming string ID
        sender?: string;
        data?: Record<string, any>;
    }): Promise<NotificationDocument> {

        return this.create({
            ...data,
            recipient: new Types.ObjectId(data.recipient), // <-- FIX
        } as any); // <-- required because TS expects Partial<NotificationDocument>
    }
}