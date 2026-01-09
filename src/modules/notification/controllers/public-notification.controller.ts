import { Controller, Post, Body, HttpCode, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { NotificationService } from '../services/notification.service';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { CreateNotificationByEmailDto } from '../../vendor/dto/create-notification-by-email.dto';
import { NotificationType } from '../../../shared/schemas/notification.schema';
import { Logger } from '@nestjs/common';

@ApiTags('Notifications - Public')
@Public()
@Controller('notifications')
export class PublicNotificationController {
    private readonly logger = new Logger(PublicNotificationController.name);

    constructor(
        private readonly notificationService: NotificationService,
        private readonly userRepository: UserRepository,
    ) { }

    @Post('create-by-email')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create notification by user email (public endpoint)' })
    @ApiBody({ type: CreateNotificationByEmailDto })
    @ApiResponse({
        status: 201,
        description: 'Notification created successfully',
        schema: {
            example: {
                success: true,
                message: 'Notification created successfully',
                data: {
                    id: '...',
                    title: 'Notification Title',
                    message: 'Notification body',
                    type: 'system',
                    status: 'unread',
                    recipient: 'userId123',
                    sender: null,
                    data: {},
                    readAt: null,
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'User with this email not found' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    async createNotificationByEmail(@Body() createDto: CreateNotificationByEmailDto) {
        const { email, title, body } = createDto;

        // Find user by email
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User with this email not found');
        }

        // Create notification
        try {
            const notification = await this.notificationService.createUserNotification({
                title,
                message: body,
                type: NotificationType.SYSTEM,
                recipient: user._id.toString(),
            });

            this.logger.log(`Notification created for user ${email}: ${title}`);
            return {
                message: 'Notification created successfully',
                data: this.formatNotificationResponse(notification),
            };
        } catch (error) {
            this.logger.error(`Failed to create notification for user ${email}:`, error);
            throw new BadRequestException(`Failed to create notification: ${error.message}`);
        }
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
            response.sender = response.sender._id ? response.sender._id.toString() : response.sender.toString();
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

