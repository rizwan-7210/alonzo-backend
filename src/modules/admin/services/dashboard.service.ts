import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { GraphQueryDto, GraphType } from '../dto/graph-query.dto';
import { PaymentStatus, PaymentType } from '../../../common/constants/payment.constants';
import { UserRole, AccountStatus } from '../../../common/constants/user.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentLog, PaymentLogDocument } from '../../../shared/schemas/payment-log.schema';
import { User, UserDocument } from '../../../shared/schemas/user.schema';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly userRepository: UserRepository,
        @InjectModel(PaymentLog.name) private readonly paymentLogModel: Model<PaymentLogDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) { }

    async getStatistics() {
        try {
            // Count total users (role = "user" only, excluding vendors, admins, and soft-deleted)
            const totalUsers = await this.userRepository.count({
                role: UserRole.USER,
                status: { $ne: 'deleted' },
                deletedAt: null,
            });

            // Count approved vendors/pharmacies (role = vendor, accountStatus = approved, excluding soft-deleted)
            const approvedVendors = await this.userRepository.count({
                role: UserRole.VENDOR,
                accountStatus: AccountStatus.APPROVED,
                status: { $ne: 'deleted' },
                deletedAt: null,
            });

            // Calculate total subscription earnings (paymentType = subscription, status = succeeded)
            const totalSubscriptionEarnings = await this.paymentLogRepository.sumSubscriptionEarnings();

            return {
                totalUsers,
                approvedVendors,
                totalSubscriptionEarnings,
            };
        } catch (error) {
            this.logger.error(`Failed to get dashboard statistics: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve dashboard statistics');
        }
    }

    async getEarningsGraph(queryDto: GraphQueryDto) {
        try {
            const type = queryDto.type || GraphType.YEARLY;
            const now = new Date();
            let startDate: Date;
            let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let groupBy: 'month' | 'day';

            // Determine date range and grouping based on type
            if (type === GraphType.YEARLY) {
                startDate = new Date(now.getFullYear(), 0, 1);
                groupBy = 'month';
            } else if (type === GraphType.SIX_MONTHS) {
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                groupBy = 'month';
            } else { // monthly
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                groupBy = 'day';
            }

            // MongoDB aggregation pipeline
            const pipeline: any[] = [
                {
                    $match: {
                        paymentType: PaymentType.SUBSCRIPTION,
                        status: PaymentStatus.SUCCEEDED,
                        createdAt: { $gte: startDate, $lte: endDate },
                    },
                },
            ];

            if (groupBy === 'month') {
                pipeline.push(
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                            },
                            total: { $sum: '$amount' },
                        },
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1 },
                    }
                );
            } else {
                pipeline.push(
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' },
                            },
                            total: { $sum: '$amount' },
                        },
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
                    }
                );
            }

            const results = await this.paymentLogModel.aggregate(pipeline);

            // Generate labels and fill in zeros
            const { labels, data } = this.generateGraphData(type, groupBy, results, startDate, endDate);

            return { labels, data };
        } catch (error) {
            this.logger.error(`Failed to get earnings graph: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve earnings graph data');
        }
    }

    async getUsersGraph(queryDto: GraphQueryDto) {
        try {
            const type = queryDto.type || GraphType.YEARLY;
            const now = new Date();
            let startDate: Date;
            let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let groupBy: 'month' | 'day';

            // Determine date range and grouping based on type
            if (type === GraphType.YEARLY) {
                startDate = new Date(now.getFullYear(), 0, 1);
                groupBy = 'month';
            } else if (type === GraphType.SIX_MONTHS) {
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                groupBy = 'month';
            } else { // monthly
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                groupBy = 'day';
            }

            // MongoDB aggregation pipeline
            const pipeline: any[] = [
                {
                    $match: {
                        role: UserRole.USER,
                        status: { $ne: 'deleted' },
                        deletedAt: null,
                        createdAt: { $gte: startDate, $lte: endDate },
                    },
                },
            ];

            if (groupBy === 'month') {
                pipeline.push(
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1 },
                    }
                );
            } else {
                pipeline.push(
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
                    }
                );
            }

            const results = await this.userModel.aggregate(pipeline);

            // Generate labels and fill in zeros
            const { labels, data } = this.generateGraphData(type, groupBy, results, startDate, endDate, 'count');

            return { labels, data };
        } catch (error) {
            this.logger.error(`Failed to get users graph: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve users graph data');
        }
    }

    async getVendorsGraph(queryDto: GraphQueryDto) {
        try {
            const type = queryDto.type || GraphType.YEARLY;
            const now = new Date();
            let startDate: Date;
            let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let groupBy: 'month' | 'day';

            // Determine date range and grouping based on type
            if (type === GraphType.YEARLY) {
                startDate = new Date(now.getFullYear(), 0, 1);
                groupBy = 'month';
            } else if (type === GraphType.SIX_MONTHS) {
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                groupBy = 'month';
            } else { // monthly
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                groupBy = 'day';
            }

            // MongoDB aggregation pipeline
            const pipeline: any[] = [
                {
                    $match: {
                        role: UserRole.VENDOR,
                        accountStatus: AccountStatus.APPROVED,
                        status: { $ne: 'deleted' },
                        deletedAt: null,
                        createdAt: { $gte: startDate, $lte: endDate },
                    },
                },
            ];

            if (groupBy === 'month') {
                pipeline.push(
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1 },
                    }
                );
            } else {
                pipeline.push(
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
                    }
                );
            }

            const results = await this.userModel.aggregate(pipeline);

            // Generate labels and fill in zeros
            const { labels, data } = this.generateGraphData(type, groupBy, results, startDate, endDate, 'count');

            return { labels, data };
        } catch (error) {
            this.logger.error(`Failed to get vendors graph: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve vendors graph data');
        }
    }

    private generateGraphData(
        type: GraphType,
        groupBy: 'month' | 'day',
        results: any[],
        startDate: Date,
        endDate: Date,
        valueField: 'total' | 'count' = 'total'
    ): { labels: string[]; data: number[] } {
        const labels: string[] = [];
        const data: number[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Create a map of results for quick lookup
        const resultMap = new Map<string, number>();
        results.forEach((result) => {
            const key = groupBy === 'month'
                ? `${result._id.year}-${result._id.month}`
                : `${result._id.year}-${result._id.month}-${result._id.day}`;
            resultMap.set(key, result[valueField] || 0);
        });

        if (groupBy === 'month') {
            // For yearly: all 12 months of current year
            // For 6-months: last 6 months including current
            if (type === GraphType.YEARLY) {
                const currentYear = new Date().getFullYear();
                for (let month = 1; month <= 12; month++) {
                    const key = `${currentYear}-${month}`;
                    const value = resultMap.get(key) || 0;
                    labels.push(monthNames[month - 1]);
                    data.push(value);
                }
            } else {
                // 6-months: last 6 months
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const key = `${year}-${month}`;
                    const value = resultMap.get(key) || 0;
                    labels.push(monthNames[month - 1]);
                    data.push(value);
                }
            }
        } else {
            // Daily grouping for monthly type
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const currentDay = now.getDate();

            for (let day = 1; day <= currentDay; day++) {
                const key = `${currentYear}-${currentMonth + 1}-${day}`;
                const value = resultMap.get(key) || 0;
                labels.push(`${day} ${monthNames[currentMonth]}`);
                data.push(value);
            }
        }

        return { labels, data };
    }
}
