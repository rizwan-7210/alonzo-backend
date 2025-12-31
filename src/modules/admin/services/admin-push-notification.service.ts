import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PushNotificationRepository } from '../../../shared/repositories/push-notification.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { CreatePushNotificationDto } from '../dto/create-push-notification.dto';
import { PushNotificationQueryDto } from '../dto/push-notification-query.dto';
import { UserRole } from '../../../common/constants/user.constants';
import { NotificationType } from '../../../shared/schemas/notification.schema';

@Injectable()
export class AdminPushNotificationService {
    private readonly logger = new Logger(AdminPushNotificationService.name);

    constructor(
        private readonly pushNotificationRepository: PushNotificationRepository,
        private readonly userRepository: UserRepository,
        private readonly notificationService: NotificationService,
    ) { }

    async sendPushNotificationToAllUsers(adminId: string, createDto: CreatePushNotificationDto) {
        try {
            // Validate input
            if (!createDto.title || !createDto.message) {
                throw new BadRequestException('Title and message are required');
            }

            // Save push notification record
            const pushNotification = await this.pushNotificationRepository.create({
                title: createDto.title.trim(),
                message: createDto.message.trim(),
            });

            this.logger.log(`Push notification record created: ${pushNotification.id}`);

            // Get all users with role "user" (excluding vendors and admins)
            const users = await this.userRepository.findUsersWithRole(UserRole.USER);

            if (!users || users.length === 0) {
                this.logger.warn('No users found. Push notification record saved but no notifications sent.');
                return {
                    message: 'Push notification saved successfully, but no users found to send notifications',
                    data: pushNotification,
                };
            }

            this.logger.log(`Sending push notification to ${users.length} user(s): ${createDto.title}`);

            // Send notification to each user
            const notificationPromises = users.map(async (user) => {
                try {
                    const userId = user._id?.toString ? user._id.toString() : String(user._id);
                    return await this.notificationService.createUserNotification({
                        title: createDto.title,
                        message: createDto.message,
                        type: NotificationType.SYSTEM,
                        recipient: userId,
                        sender: adminId,
                        data: {
                            pushNotificationId: pushNotification.id,
                        },
                    });
                } catch (error) {
                    this.logger.error(`Failed to send notification to user ${user._id}:`, error);
                    return null;
                }
            });

            const notifications = await Promise.all(notificationPromises);
            const successfulNotifications = notifications.filter(n => n !== null);

            this.logger.log(
                `Successfully sent ${successfulNotifications.length} out of ${users.length} notifications`
            );

            return {
                message: `Push notification sent successfully to ${successfulNotifications.length} user(s)`,
                data: {
                    pushNotification,
                    sentCount: successfulNotifications.length,
                    totalUsers: users.length,
                },
            };
        } catch (error) {
            this.logger.error('Error sending push notification to all users:', error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to send push notification');
        }
    }

    async getPushNotifications(queryDto: PushNotificationQueryDto) {
        try {
            const page = queryDto.page || 1;
            const limit = queryDto.limit || 10;

            const result = await this.pushNotificationRepository.findAllWithPagination(page, limit);

            return {
                message: 'Push notifications retrieved successfully',
                data: {
                    notifications: result.data,
                    pagination: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        hasNext: result.hasNext,
                        hasPrev: result.hasPrev,
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error retrieving push notifications:', error);
            throw new InternalServerErrorException('Failed to retrieve push notifications');
        }
    }

    async getPushNotificationById(id: string) {
        try {
            // Check if valid ObjectId using regex
            if (!/^[0-9a-fA-F]{24}$/.test(id)) {
                throw new BadRequestException('Invalid notification ID');
            }

            const notification = await this.pushNotificationRepository.findById(id);

            if (!notification) {
                throw new NotFoundException('Push notification not found');
            }

            return {
                message: 'Push notification retrieved successfully',
                data: notification,
            };
        } catch (error) {
            this.logger.error(`Error retrieving push notification ${id}:`, error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve push notification');
        }
    }
}

