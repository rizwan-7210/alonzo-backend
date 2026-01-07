import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { VendorSubscriptionLogQueryDto } from '../dto/subscription-log-query.dto';
import { Types } from 'mongoose';
import { UserSubscriptionStatus } from '../../../common/constants/subscription.constants';
import { PaymentType } from '../../../common/constants/payment.constants';

@Injectable()
export class VendorSubscriptionLogService {
    private readonly logger = new Logger(VendorSubscriptionLogService.name);

    constructor(
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly userRepository: UserRepository,
    ) { }

    async getMySubscriptions(userId: string, queryDto: VendorSubscriptionLogQueryDto) {
        try {
            const { page = 1, limit = 10, status, planId, startDate, endDate } = queryDto;

            // Build query conditions - always filter by current user
            const conditions: any = {
                userId: new Types.ObjectId(userId),
            };

            // Filter by status
            if (status) {
                conditions.status = status;
            }

            // Filter by plan ID
            if (planId) {
                conditions.planId = new Types.ObjectId(planId);
            }

            // Filter by date range (using createdAt)
            if (startDate || endDate) {
                conditions.createdAt = {};
                if (startDate) {
                    conditions.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    // Set end date to end of day (23:59:59.999)
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    conditions.createdAt.$lte = endDateTime;
                }
            }

            const result = await this.userSubscriptionRepository.paginate(
                page,
                limit,
                conditions,
                {
                    sort: { createdAt: -1 },
                    populate: ['planId'],
                }
            );

            return {
                data: result.data.map(sub => this.formatSubscriptionResponse(sub)),
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            };
        } catch (error) {
            this.logger.error(`Failed to get subscriptions for user ${userId}: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve subscriptions');
        }
    }

    async getMySubscriptionById(userId: string, subscriptionId: string) {
        try {
            const subscription = await this.userSubscriptionRepository.findById(
                subscriptionId,
                {
                    populate: ['planId'],
                }
            );

            if (!subscription) {
                throw new NotFoundException('Subscription not found');
            }

            // Verify the subscription belongs to the current user
            const subscriptionUserId = subscription.userId?.toString() || (subscription.userId as any)?._id?.toString();
            if (subscriptionUserId !== userId) {
                throw new NotFoundException('Subscription not found');
            }

            return this.formatSubscriptionResponse(subscription);
        } catch (error) {
            this.logger.error(`Failed to get subscription by ID: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve subscription');
        }
    }

    async getMyPaymentLogs(userId: string, page: number = 1, limit: number = 10) {
        try {
            // Get payment logs for subscription payments only, filtered by user
            const conditions = {
                userId: new Types.ObjectId(userId),
                paymentType: PaymentType.SUBSCRIPTION,
            };

            const result = await this.paymentLogRepository.paginate(
                page,
                limit,
                conditions,
                {
                    sort: { createdAt: -1 },
                    populate: [
                        {
                            path: 'planId',
                            select: 'title amount duration',
                        },
                        {
                            path: 'subscriptionId',
                            select: 'status expiryDate amountPaid',
                        },
                    ],
                }
            );

            return {
                data: result.data.map(log => this.formatPaymentLogResponse(log)),
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            };
        } catch (error) {
            this.logger.error(`Failed to get payment logs for user ${userId}: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve payment logs');
        }
    }

    async getPaymentLogsBySubscriptionId(userId: string, subscriptionId: string, page: number = 1, limit: number = 10) {
        try {
            // First verify the subscription belongs to the user
            const subscription = await this.userSubscriptionRepository.findById(subscriptionId);
            if (!subscription) {
                throw new NotFoundException('Subscription not found');
            }

            const subscriptionUserId = subscription.userId?.toString() || (subscription.userId as any)?._id?.toString();
            if (subscriptionUserId !== userId) {
                throw new NotFoundException('Subscription not found');
            }

            const conditions = {
                subscriptionId: new Types.ObjectId(subscriptionId),
                userId: new Types.ObjectId(userId),
            };

            const result = await this.paymentLogRepository.paginate(
                page,
                limit,
                conditions,
                {
                    sort: { createdAt: -1 },
                    populate: [
                        {
                            path: 'planId',
                            select: 'title amount duration',
                        },
                        {
                            path: 'subscriptionId',
                            select: 'status expiryDate amountPaid',
                        },
                    ],
                }
            );

            return {
                data: result.data.map(log => this.formatPaymentLogResponse(log)),
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            };
        } catch (error) {
            this.logger.error(`Failed to get payment logs by subscription ID: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve subscription payment logs');
        }
    }

    async getMySubscriptionStats(userId: string) {
        try {
            const [
                totalSubscriptions,
                paidSubscriptions,
                unpaidSubscriptions,
                activeSubscriptions,
            ] = await Promise.all([
                this.userSubscriptionRepository.count({ userId: new Types.ObjectId(userId) }),
                this.userSubscriptionRepository.count({
                    userId: new Types.ObjectId(userId),
                    status: UserSubscriptionStatus.PAID,
                }),
                this.userSubscriptionRepository.count({
                    userId: new Types.ObjectId(userId),
                    status: UserSubscriptionStatus.UNPAID,
                }),
                this.userSubscriptionRepository.findActiveByUserId(userId),
            ]);

            return {
                total: totalSubscriptions,
                paid: paidSubscriptions,
                unpaid: unpaidSubscriptions,
                active: activeSubscriptions ? 1 : 0,
                currentSubscription: activeSubscriptions ? this.formatSubscriptionResponse(activeSubscriptions) : null,
            };
        } catch (error) {
            this.logger.error(`Failed to get subscription stats for user ${userId}: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve subscription statistics');
        }
    }

    private formatSubscriptionResponse(subscription: any) {
        if (!subscription) return null;

        const subObj = subscription.toObject ? subscription.toObject() : { ...subscription };

        return {
            id: subObj._id?.toString() || subObj.id,
            plan: subObj.planId,
            amountPaid: subObj.amountPaid,
            status: subObj.status,
            duration: subObj.duration,
            expiryDate: subObj.expiryDate,
            createdAt: subObj.createdAt,
            updatedAt: subObj.updatedAt,
        };
    }

    private formatPaymentLogResponse(paymentLog: any) {
        if (!paymentLog) return null;

        const logObj = paymentLog.toObject ? paymentLog.toObject() : { ...paymentLog };

        return {
            id: logObj._id?.toString() || logObj.id,
            paymentType: logObj.paymentType,
            plan: logObj.planId,
            subscription: logObj.subscriptionId,
            paymentIntentId: logObj.paymentIntentId,
            amount: logObj.amount,
            currency: logObj.currency,
            status: logObj.status,
            metadata: logObj.metadata,
            createdAt: logObj.createdAt,
            updatedAt: logObj.updatedAt,
        };
    }
}

