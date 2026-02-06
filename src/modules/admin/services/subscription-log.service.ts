import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { SubscriptionQueryDto } from '../dto/subscription-query.dto';
import { PaymentLogQueryDto } from '../dto/payment-log-query.dto';
import { Types } from 'mongoose';
import { PaymentStatus, PaymentType } from '../../../common/constants/payment.constants';
import { PlanDuration } from '../../../common/constants/plan.constants';
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
            const {
                page = 1,
                limit = 10,
                status,
                userId,
                planId,
                startDate,
                endDate,
                fromDate,
                toDate,
                fromExpiryDate,
                toExpiryDate,
                duration,
                search,
            } = queryDto;

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

            const dateFrom = fromDate || startDate;
            const dateTo = toDate || endDate;
            if (dateFrom || dateTo) {
                conditions.createdAt = {};
                if (dateFrom) {
                    conditions.createdAt.$gte = new Date(dateFrom);
                }
                if (dateTo) {
                    const end = new Date(dateTo);
                    end.setHours(23, 59, 59, 999);
                    conditions.createdAt.$lte = end;
                }
            }

            if (fromExpiryDate || toExpiryDate) {
                conditions.expiryDate = {};
                if (fromExpiryDate) {
                    conditions.expiryDate.$gte = new Date(fromExpiryDate);
                }
                if (toExpiryDate) {
                    const end = new Date(toExpiryDate);
                    end.setHours(23, 59, 59, 999);
                    conditions.expiryDate.$lte = end;
                }
            }

            if (duration) {
                conditions.duration = duration;
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

    async getAllPaymentLogs(queryDto: PaymentLogQueryDto) {
        try {
            const {
                page = 1,
                limit = 10,
                paymentType,
                status,
                userId,
                subscriptionId,
                bookingId,
                startDate,
                endDate,
                fromDate,
                toDate,
                fromExpiryDate,
                toExpiryDate,
                duration,
                search,
            } = queryDto;

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

            const dateFrom = fromDate || startDate;
            const dateTo = toDate || endDate;
            if (dateFrom || dateTo) {
                conditions.createdAt = {};
                if (dateFrom) {
                    conditions.createdAt.$gte = new Date(dateFrom);
                }
                if (dateTo) {
                    const end = new Date(dateTo);
                    end.setHours(23, 59, 59, 999);
                    conditions.createdAt.$lte = end;
                }
            }

            if (fromExpiryDate || toExpiryDate || duration) {
                const subscriptionIds = await this.userSubscriptionRepository.findIdsByExpiryAndDuration(
                    fromExpiryDate,
                    toExpiryDate,
                    duration as PlanDuration,
                );
                conditions.subscriptionId = { $in: subscriptionIds };
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
                            select: '_id firstName lastName email',
                        },
                        {
                            path: 'planId',
                            select: '_id title amount duration description status',
                        },
                        {
                            path: 'subscriptionId',
                            select: 'status expiryDate duration amountPaid',
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

}
