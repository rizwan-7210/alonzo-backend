import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardQueryDto, GroupBy } from '../dto/dashboard-query.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
    ) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get dashboard overview with summary statistics' })
    @ApiResponse({
        status: 200,
        description: 'Dashboard overview retrieved successfully',
        schema: {
            example: {
                totalEarnings: 15000.00,
                totalSubscriptions: 33,
                activeSubscriptions: 25,
                totalUsers: 150,
                recentGrowth: {
                    earnings: {
                        value: 12.5,
                        trend: 'up'
                    },
                    subscriptions: {
                        value: 8.3,
                        trend: 'up'
                    }
                }
            }
        }
    })
    async getOverview() {
        return this.dashboardService.getOverview();
    }

    @Get('earnings')
    @ApiOperation({ summary: 'Get earnings analytics grouped by time period' })
    @ApiQuery({ name: 'year', required: false, type: Number, example: 2024 })
    @ApiQuery({ name: 'groupBy', required: false, enum: GroupBy, example: GroupBy.MONTH })
    @ApiResponse({
        status: 200,
        description: 'Earnings analytics retrieved successfully',
        schema: {
            example: {
                total: 15000.00,
                data: [
                    {
                        period: 'Jan 22',
                        month: 1,
                        year: 2022,
                        amount: 1200.50,
                        count: 15
                    },
                    {
                        period: 'Feb 22',
                        month: 2,
                        year: 2022,
                        amount: 1500.00,
                        count: 20
                    }
                ],
                growth: {
                    percentage: 12.5,
                    trend: 'up'
                }
            }
        }
    })
    async getEarningsAnalytics(@Query() queryDto: DashboardQueryDto) {
        return this.dashboardService.getEarningsAnalytics(queryDto);
    }

    @Get('subscriptions')
    @ApiOperation({ summary: 'Get subscriptions analytics grouped by time period' })
    @ApiQuery({ name: 'year', required: false, type: Number, example: 2024 })
    @ApiQuery({ name: 'groupBy', required: false, enum: GroupBy, example: GroupBy.MONTH })
    @ApiResponse({
        status: 200,
        description: 'Subscriptions analytics retrieved successfully',
        schema: {
            example: {
                total: 33,
                active: 25,
                data: [
                    {
                        period: 'Jan 22',
                        month: 1,
                        year: 2022,
                        count: 280,
                        newSubscriptions: 25,
                        canceledSubscriptions: 5
                    },
                    {
                        period: 'Feb 22',
                        month: 2,
                        year: 2022,
                        count: 300,
                        newSubscriptions: 30,
                        canceledSubscriptions: 10
                    }
                ],
                growth: {
                    percentage: 8.3,
                    trend: 'up'
                }
            }
        }
    })
    async getSubscriptionsAnalytics(@Query() queryDto: DashboardQueryDto) {
        return this.dashboardService.getSubscriptionsAnalytics(queryDto);
    }

}
