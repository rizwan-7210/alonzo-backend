import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PushNotification, PushNotificationDocument } from '../schemas/push-notification.schema';

@Injectable()
export class PushNotificationRepository extends BaseRepository<PushNotificationDocument> {
    constructor(
        @InjectModel(PushNotification.name) protected readonly pushNotificationModel: Model<PushNotificationDocument>,
    ) {
        super(pushNotificationModel);
    }

    async findAllWithPagination(page: number = 1, limit: number = 10): Promise<{
        data: PushNotificationDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        return this.paginate(page, limit, {}, {
            sort: { createdAt: -1 }, // Latest first
        });
    }
}

