import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { SubscriptionQueryDto } from '../dto/subscription-query.dto';
import { PaymentLogQueryDto } from '../dto/payment-log-query.dto';
import { Types } from 'mongoose';
import { SubscriptionStatus } from '../../../common/constants/subscription.constants';
import { PaymentStatus, PaymentType } from '../../../common/constants/payment.constants';
import { FormatterService } from '../../../shared/services/formatter.service';

@Injectable()
export class SubscriptionLogService {
    private readonly logger = new Logger(SubscriptionLogService.name);

    constructor(
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly userRepository: UserRepository,
        private readonly formatterService: FormatterService,
    ) { }

    async getAllSubscriptions(queryDto: SubscriptionQueryDto) {
        try {
            const { page = 1, limit = 10, status, userId, planId, startDate, endDate, search } = queryDto;

            // Build filter conditions
            const conditions: any = {};

            if (status) {
                conditions.status = status;
            }

            if (userId) {
                conditions.userId = new Types.ObjectId(userId);
            }

            if (planId) {
                conditions.planId = new Types.ObjectId(planId);
            }

            if (startDate || endDate) {
                conditions.createdAt = {};
                if (startDate) {
                    conditions.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    conditions.createdAt.$lte = new Date(endDate);
                }
            }

            // If search is provided, we need to search by user email/name
            if (search) {
                const users = await this.userRepository.findAll();
                const filteredUsers = users.filter(user =>
                    user.email?.toLowerCase().includes(search.toLowerCase()) ||
                    user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                    user.lastName?.toLowerCase().includes(search.toLowerCase())
                );
                const userIds = filteredUsers.map(user => user._id);
                conditions.userId = { $in: userIds };
            }

            const result = await this.userSubscriptionRepository.paginate(
                page,
                limit,
                conditions,
                {
                    populate: ['userId', 'planId']
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
            this.logger.error(`Failed to get subscriptions: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve subscriptions');
        }
    }

    async getSubscriptionById(subscriptionId: string) {
        try {
            const subscription = await this.userSubscriptionRepository.findById(
                subscriptionId,
                {
                    populate: ['userId', 'planId']
                }
            );

            if (!subscription) {
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

    async getSubscriptionsByUserId(userId: string, queryDto: SubscriptionQueryDto) {
        try {
            // Verify user exists
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const { page = 1, limit = 10, status, planId, startDate, endDate } = queryDto;

            // Build query conditions
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
                    populate: ['userId', 'planId']
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
            this.logger.error(`Failed to get subscriptions by user ID: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve user subscriptions');
        }
    }

    async getSubscriptionStats() {
        try {
            const [
                totalSubscriptions,
                activeSubscriptions,
                canceledSubscriptions,
                trialingSubscriptions,
                pastDueSubscriptions,
            ] = await Promise.all([
                this.userSubscriptionRepository.count({}),
                this.userSubscriptionRepository.count({ status: SubscriptionStatus.ACTIVE }),
                this.userSubscriptionRepository.count({ status: SubscriptionStatus.CANCELED }),
                this.userSubscriptionRepository.count({ status: SubscriptionStatus.TRIALING }),
                this.userSubscriptionRepository.count({ status: SubscriptionStatus.PAST_DUE }),
            ]);

            return {
                total: totalSubscriptions,
                active: activeSubscriptions,
                canceled: canceledSubscriptions,
                trialing: trialingSubscriptions,
                pastDue: pastDueSubscriptions,
            };
        } catch (error) {
            this.logger.error(`Failed to get subscription stats: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve subscription statistics');
        }
    }

    async getAllPaymentLogs(queryDto: PaymentLogQueryDto) {
        try {
            const { page = 1, limit = 10, paymentType, status, userId, subscriptionId, bookingId, startDate, endDate, search } = queryDto;

            // Build filter conditions
            const conditions: any = {};

            if (paymentType) {
                conditions.paymentType = paymentType;
            }

            if (status) {
                conditions.status = status;
            }

            if (userId) {
                conditions.userId = new Types.ObjectId(userId);
            }

            if (subscriptionId) {
                conditions.subscriptionId = new Types.ObjectId(subscriptionId);
            }

            if (bookingId) {
                conditions.bookingId = new Types.ObjectId(bookingId);
            }

            if (startDate || endDate) {
                conditions.createdAt = {};
                if (startDate) {
                    conditions.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    conditions.createdAt.$lte = new Date(endDate);
                }
            }

            // If search is provided, search by user email, user name, booking ID, or payment intent ID
            if (search) {
                const users = await this.userRepository.findAll();
                const filteredUsers = users.filter(user =>
                    user.email?.toLowerCase().includes(search.toLowerCase()) ||
                    user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                    user.lastName?.toLowerCase().includes(search.toLowerCase())
                );
                const userIds = filteredUsers.map(user => user._id);
                
                // Check if search is a valid ObjectId (for booking ID search)
                const searchConditions: any[] = [
                    { userId: { $in: userIds } },
                    { paymentIntentId: { $regex: search, $options: 'i' } },
                ];
                
                // If search looks like an ObjectId, also search by bookingId
                if (/^[0-9a-fA-F]{24}$/.test(search)) {
                    searchConditions.push({ bookingId: new Types.ObjectId(search) });
                }
                
                conditions.$or = searchConditions;
            }

            const result = await this.paymentLogRepository.paginate(
                page,
                limit,
                conditions,
                {
                    sort: { createdAt: -1 },
                    populate: [
                        {
                            path: 'userId',
                            select: 'firstName lastName email phone',
                        },
                        {
                            path: 'planId',
                            select: 'name amount currency',
                        },
                        {
                            path: 'subscriptionId',
                            select: 'status currentPeriodStart currentPeriodEnd',
                        },
                        {
                            path: 'bookingId',
                            select: 'type date slots status',
                        },
                    ],
                }
            );

            // Format the response using centralized formatter
            const formattedData = result.data.map((log: any, index: number) => {
                return this.formatterService.formatPaymentLogForListing(log, index, page, limit);
            }).filter(item => item !== null);

            return {
                data: formattedData,
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            };
        } catch (error) {
            this.logger.error(`Failed to get payment logs: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve payment logs');
        }
    }

    async getPaymentLogById(paymentLogId: string) {
        try {
            const paymentLog = await this.paymentLogRepository.findById(
                paymentLogId,
                {
                    populate: ['userId', 'planId', 'subscriptionId']
                }
            );

            if (!paymentLog) {
                throw new NotFoundException('Payment log not found');
            }

            return this.formatPaymentLogResponse(paymentLog);
        } catch (error) {
            this.logger.error(`Failed to get payment log by ID: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve payment log');
        }
    }

    async getPaymentLogsByUserId(userId: string, page: number = 1, limit: number = 10) {
        try {
            const conditions = { userId: new Types.ObjectId(userId) };

            const result = await this.paymentLogRepository.paginate(
                page,
                limit,
                conditions,
                {
                    populate: ['userId', 'planId', 'subscriptionId']
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
            this.logger.error(`Failed to get payment logs by user ID: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve user payment logs');
        }
    }

    async getPaymentLogsBySubscriptionId(subscriptionId: string, page: number = 1, limit: number = 10) {
        try {
            const conditions = { subscriptionId: new Types.ObjectId(subscriptionId) };

            const result = await this.paymentLogRepository.paginate(
                page,
                limit,
                conditions,
                {
                    populate: ['userId', 'planId', 'subscriptionId']
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
            throw new InternalServerErrorException('Failed to retrieve subscription payment logs');
        }
    }

    async getPaymentLogStats() {
        try {
            const [
                totalPayments,
                succeededPayments,
                pendingPayments,
                failedPayments,
                subscriptionPayments,
                bookingPayments,
            ] = await Promise.all([
                this.paymentLogRepository.count({}),
                this.paymentLogRepository.count({ status: PaymentStatus.SUCCEEDED }),
                this.paymentLogRepository.count({ status: PaymentStatus.PENDING }),
                this.paymentLogRepository.count({ status: PaymentStatus.FAILED }),
                this.paymentLogRepository.count({ paymentType: PaymentType.SUBSCRIPTION }),
                this.paymentLogRepository.count({ paymentType: PaymentType.BOOKING }),
            ]);

            // Calculate total revenue from succeeded payments
            const allLogs = await this.paymentLogRepository.findAll();
            const succeededLogs = allLogs.filter(log => log.status === PaymentStatus.SUCCEEDED);
            const totalRevenue = succeededLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

            return {
                total: totalPayments,
                succeeded: succeededPayments,
                pending: pendingPayments,
                failed: failedPayments,
                subscriptionPayments,
                bookingPayments,
                totalRevenue,
            };
        } catch (error) {
            this.logger.error(`Failed to get payment log stats: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve payment log statistics');
        }
    }

    private formatSubscriptionResponse(subscription: any) {
        if (!subscription) return null;

        const subObj = subscription.toObject ? subscription.toObject() : { ...subscription };

        return {
            id: subObj._id?.toString() || subObj.id,
            user: subObj.userId,
            plan: subObj.planId,
            stripeSubscriptionId: subObj.stripeSubscriptionId,
            stripeCustomerId: subObj.stripeCustomerId,
            status: subObj.status,
            currentPeriodStart: subObj.currentPeriodStart,
            currentPeriodEnd: subObj.currentPeriodEnd,
            cancelAtPeriodEnd: subObj.cancelAtPeriodEnd,
            canceledAt: subObj.canceledAt,
            endedAt: subObj.endedAt,
            createdAt: subObj.createdAt,
            updatedAt: subObj.updatedAt,
        };
    }

    private formatPaymentLogResponse(paymentLog: any) {
        if (!paymentLog) return null;

        const logObj = paymentLog.toObject ? paymentLog.toObject() : { ...paymentLog };

        return {
            id: logObj._id?.toString() || logObj.id,
            user: logObj.userId,
            paymentType: logObj.paymentType,
            plan: logObj.planId,
            subscription: logObj.subscriptionId,
            bookingId: logObj.bookingId?.toString(),
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
