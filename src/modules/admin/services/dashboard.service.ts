import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { DashboardQueryDto, GroupBy } from '../dto/dashboard-query.dto';
import { GraphQueryDto, GraphType } from '../dto/graph-query.dto';
import { PaymentStatus, PaymentType } from '../../../common/constants/payment.constants';
import { SubscriptionStatus } from '../../../common/constants/subscription.constants';
import { UserRole, AccountStatus } from '../../../common/constants/user.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentLog, PaymentLogDocument } from '../../../shared/schemas/payment-log.schema';
import { User, UserDocument } from '../../../shared/schemas/user.schema';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly userRepository: UserRepository,
        @InjectModel(PaymentLog.name) private readonly paymentLogModel: Model<PaymentLogDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) { }

    async getOverview() {
        try {
            // Get all payment logs for earnings calculation
            const allPayments = await this.paymentLogRepository.findAll();
            const succeededPayments = allPayments.filter(log => log.status === PaymentStatus.SUCCEEDED);
            const totalEarnings = succeededPayments.reduce((sum, log) => sum + (log.amount || 0), 0);

            // Get subscription counts
            const [totalSubscriptions, activeSubscriptions, totalUsers] = await Promise.all([
                this.userSubscriptionRepository.count({}),
                this.userSubscriptionRepository.count({ status: SubscriptionStatus.ACTIVE }),
                this.userRepository.count({}),
            ]);

            // Calculate growth (compare current month vs previous month)
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

            // Current month earnings
            const currentMonthPayments = succeededPayments.filter(log => {
                const createdAt = new Date((log as any).createdAt);
                return createdAt >= currentMonthStart;
            });
            const currentMonthEarnings = currentMonthPayments.reduce((sum, log) => sum + (log.amount || 0), 0);

            // Previous month earnings
            const previousMonthPayments = succeededPayments.filter(log => {
                const createdAt = new Date((log as any).createdAt);
                return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
            });
            const previousMonthEarnings = previousMonthPayments.reduce((sum, log) => sum + (log.amount || 0), 0);

            // Calculate earnings growth
            const earningsGrowth = this.calculateGrowth(currentMonthEarnings, previousMonthEarnings);

            // Get all subscriptions for growth calculation
            const allSubscriptions = await this.userSubscriptionRepository.findAll();

            const currentMonthSubs = allSubscriptions.filter(sub => {
                const createdAt = new Date((sub as any).createdAt);
                return createdAt >= currentMonthStart;
            }).length;

            const previousMonthSubs = allSubscriptions.filter(sub => {
                const createdAt = new Date((sub as any).createdAt);
                return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
            }).length;

            const subscriptionsGrowth = this.calculateGrowth(currentMonthSubs, previousMonthSubs);

            return {
                totalEarnings,
                totalSubscriptions,
                activeSubscriptions,
                totalUsers,
                recentGrowth: {
                    earnings: {
                        value: earningsGrowth.percentage,
                        trend: earningsGrowth.trend
                    },
                    subscriptions: {
                        value: subscriptionsGrowth.percentage,
                        trend: subscriptionsGrowth.trend
                    }
                }
            };
        } catch (error) {
            this.logger.error(`Failed to get dashboard overview: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve dashboard overview');
        }
    }

    async getEarningsAnalytics(queryDto: DashboardQueryDto) {
        try {
            const year = queryDto.year || new Date().getFullYear();
            const groupBy = queryDto.groupBy || GroupBy.MONTH;

            // Get all succeeded payments
            const allPayments = await this.paymentLogRepository.findAll();
            const succeededPayments = allPayments.filter(log => log.status === PaymentStatus.SUCCEEDED);

            // Filter by year and group by period
            const groupedData = this.groupDataByPeriod(succeededPayments, year, groupBy, 'earnings');

            // Calculate total
            const total = succeededPayments
                .filter(log => new Date((log as any).createdAt).getFullYear() === year)
                .reduce((sum, log) => sum + (log.amount || 0), 0);

            // Calculate growth (current year vs previous year)
            const previousYearTotal = succeededPayments
                .filter(log => new Date((log as any).createdAt).getFullYear() === year - 1)
                .reduce((sum, log) => sum + (log.amount || 0), 0);

            const growth = this.calculateGrowth(total, previousYearTotal);

            return {
                total,
                data: groupedData,
                growth: {
                    percentage: growth.percentage,
                    trend: growth.trend
                }
            };
        } catch (error) {
            this.logger.error(`Failed to get earnings analytics: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve earnings analytics');
        }
    }

    async getSubscriptionsAnalytics(queryDto: DashboardQueryDto) {
        try {
            const year = queryDto.year || new Date().getFullYear();
            const groupBy = queryDto.groupBy || GroupBy.MONTH;

            // Get all subscriptions
            const allSubscriptions = await this.userSubscriptionRepository.findAll();

            // Group by period
            const groupedData = this.groupDataByPeriod(allSubscriptions, year, groupBy, 'subscriptions');

            // Get current counts
            const [total, active] = await Promise.all([
                this.userSubscriptionRepository.count({}),
                this.userSubscriptionRepository.count({ status: SubscriptionStatus.ACTIVE }),
            ]);

            // Calculate growth (current year vs previous year)
            const currentYearSubs = allSubscriptions.filter(sub =>
                new Date((sub as any).createdAt).getFullYear() === year
            ).length;

            const previousYearSubs = allSubscriptions.filter(sub =>
                new Date((sub as any).createdAt).getFullYear() === year - 1
            ).length;

            const growth = this.calculateGrowth(currentYearSubs, previousYearSubs);

            return {
                total,
                active,
                data: groupedData,
                growth: {
                    percentage: growth.percentage,
                    trend: growth.trend
                }
            };
        } catch (error) {
            this.logger.error(`Failed to get subscriptions analytics: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve subscriptions analytics');
        }
    }

    private groupDataByPeriod(data: any[], year: number, groupBy: GroupBy, type: 'earnings' | 'subscriptions') {
        const periods = this.generatePeriods(year, groupBy);

        return periods.map(period => {
            const periodData = data.filter(item => {
                const itemDate = new Date((item as any).createdAt);
                return this.isInPeriod(itemDate, period, groupBy);
            });

            if (type === 'earnings') {
                const amount = periodData.reduce((sum, log) => sum + (log.amount || 0), 0);
                return {
                    period: this.formatPeriodLabel(period, groupBy),
                    month: period.getMonth() + 1,
                    year: period.getFullYear(),
                    amount,
                    count: periodData.length
                };
            } else if (type === 'subscriptions') {
                // For subscriptions, count new subscriptions in this period
                const newSubscriptions = periodData.length;

                // Count canceled subscriptions in this period
                const canceledSubscriptions = periodData.filter(sub => {
                    if (!sub.canceledAt) return false;
                    const cancelDate = new Date(sub.canceledAt);
                    return this.isInPeriod(cancelDate, period, groupBy);
                }).length;

                // Calculate cumulative count up to and including this period
                const allSubsUpToPeriod = data.filter(item => {
                    const itemDate = new Date((item as any).createdAt);
                    return this.isUpToPeriod(itemDate, period, groupBy);
                });

                return {
                    period: this.formatPeriodLabel(period, groupBy),
                    month: period.getMonth() + 1,
                    year: period.getFullYear(),
                    count: allSubsUpToPeriod.length,
                    newSubscriptions,
                    canceledSubscriptions
                };
            }
        });
    }

    private generatePeriods(year: number, groupBy: GroupBy): Date[] {
        const periods: Date[] = [];

        if (groupBy === GroupBy.MONTH) {
            for (let month = 0; month < 12; month++) {
                periods.push(new Date(year, month, 1));
            }
        } else if (groupBy === GroupBy.WEEK) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);
            let currentDate = new Date(startOfYear);

            while (currentDate <= endOfYear) {
                periods.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 7);
            }
        } else if (groupBy === GroupBy.DAY) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);
            let currentDate = new Date(startOfYear);

            while (currentDate <= endOfYear) {
                periods.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return periods;
    }

    private isInPeriod(date: Date, period: Date, groupBy: GroupBy): boolean {
        if (groupBy === GroupBy.MONTH) {
            return date.getMonth() === period.getMonth() &&
                date.getFullYear() === period.getFullYear();
        } else if (groupBy === GroupBy.WEEK) {
            const weekEnd = new Date(period);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return date >= period && date <= weekEnd;
        } else if (groupBy === GroupBy.DAY) {
            return date.getDate() === period.getDate() &&
                date.getMonth() === period.getMonth() &&
                date.getFullYear() === period.getFullYear();
        }
        return false;
    }

    private isUpToPeriod(date: Date, period: Date, groupBy: GroupBy): boolean {
        if (groupBy === GroupBy.MONTH) {
            // Check if date is in the same year and same or earlier month
            if (date.getFullYear() < period.getFullYear()) {
                return true;
            }
            if (date.getFullYear() === period.getFullYear()) {
                return date.getMonth() <= period.getMonth();
            }
            return false;
        } else if (groupBy === GroupBy.WEEK) {
            // Check if date is up to the end of the week
            const weekEnd = new Date(period);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            return date <= weekEnd;
        } else if (groupBy === GroupBy.DAY) {
            // Check if date is on or before the period day
            const periodEnd = new Date(period);
            periodEnd.setHours(23, 59, 59, 999);
            return date <= periodEnd;
        }
        return false;
    }

    private formatPeriodLabel(date: Date, groupBy: GroupBy): string {
        const monthNames = ['Jan', 'Feb', 'March', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const year = date.getFullYear().toString().slice(-2);

        if (groupBy === GroupBy.MONTH) {
            return `${monthNames[date.getMonth()]} ${year}`;
        } else if (groupBy === GroupBy.WEEK) {
            const weekEnd = new Date(date);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return `Week ${Math.ceil(date.getDate() / 7)} ${monthNames[date.getMonth()]}`;
        } else {
            return `${monthNames[date.getMonth()]} ${date.getDate()}`;
        }
    }

    private calculateGrowth(current: number, previous: number): { percentage: number; trend: 'up' | 'down' | 'stable' } {
        if (previous === 0) {
            return { percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'stable' };
        }

        const percentage = ((current - previous) / previous) * 100;
        const roundedPercentage = Math.round(percentage * 10) / 10; // Round to 1 decimal

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (roundedPercentage > 0) trend = 'up';
        else if (roundedPercentage < 0) trend = 'down';

        return { percentage: Math.abs(roundedPercentage), trend };
    }

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
