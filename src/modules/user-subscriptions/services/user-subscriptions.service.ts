import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { ListUserSubscriptionsDto } from '../dto/list-user-subscriptions.dto';

@Injectable()
export class UserSubscriptionsService {
    private readonly logger = new Logger(UserSubscriptionsService.name);

    constructor(
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
    ) { }

    async findAll(queryDto: ListUserSubscriptionsDto, currentUserId?: string, isAdmin: boolean = false) {
        try {
            const page = queryDto.page || 1;
            const limit = queryDto.limit || 10;
            const status = queryDto.status;
            
            // If not admin, only show current user's subscriptions
            const userId = isAdmin ? queryDto.userId : currentUserId;

            const result = await this.userSubscriptionRepository.findAllWithPagination(page, limit, userId, status);

            return {
                message: 'User subscriptions retrieved successfully',
                data: {
                    subscriptions: result.data,
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
            this.logger.error('Error retrieving user subscriptions:', error);
            throw new InternalServerErrorException('Failed to retrieve user subscriptions');
        }
    }

    async findOne(id: string, currentUserId?: string, isAdmin: boolean = false) {
        try {
            const subscription = await this.userSubscriptionRepository.findById(id, {
                populate: [
                    { path: 'planId' },
                    { path: 'userId', select: 'firstName lastName email' },
                ],
            });

            if (!subscription) {
                throw new NotFoundException('User subscription not found');
            }

            // If not admin, ensure user can only access their own subscriptions
            if (!isAdmin) {
                const subscriptionUserId = subscription.userId?.toString ? subscription.userId.toString() : String(subscription.userId);
                if (subscriptionUserId !== currentUserId) {
                    throw new ForbiddenException('You can only access your own subscriptions');
                }
            }

            return {
                message: 'User subscription retrieved successfully',
                data: subscription,
            };
        } catch (error) {
            this.logger.error(`Error retrieving user subscription ${id}:`, error);
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve user subscription');
        }
    }
}

