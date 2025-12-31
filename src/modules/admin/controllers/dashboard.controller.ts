import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { DashboardQueryDto, GroupBy } from '../dto/dashboard-query.dto';
import { GraphQueryDto, GraphType } from '../dto/graph-query.dto';
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

    @Get('statistics')
    @ApiOperation({ summary: 'Get admin dashboard statistics' })
    @ApiResponse({
        status: 200,
        description: 'Dashboard statistics retrieved successfully',
        schema: {
            example: {
                success: true,
                message: 'Dashboard statistics retrieved successfully',
                data: {
                    totalUsers: 150,
                    approvedVendors: 45,
                    totalSubscriptionEarnings: 125000.50
                },
                timestamp: '2024-01-15T10:30:00.000Z'
            }
        }
    })
    async getStatistics() {
        const statistics = await this.dashboardService.getStatistics();
        return {
            message: 'Dashboard statistics retrieved successfully',
            data: statistics,
        };
    }

    @Get('earnings-graph')
    @ApiOperation({ summary: 'Get earnings graph data for admin dashboard' })
    @ApiQuery({ name: 'type', required: false, enum: GraphType, example: GraphType.YEARLY, description: 'Graph type: yearly, 6-months, or monthly' })
    @ApiResponse({
        status: 200,
        description: 'Earnings graph data retrieved successfully',
        schema: {
            example: {
                success: true,
                message: 'Earnings graph data retrieved successfully',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    data: [1000, 1500, 2000, 1800, 2200, 2500, 3000, 2800, 3200, 3500, 4000, 4500]
                },
                timestamp: '2024-01-15T10:30:00.000Z'
            }
        }
    })
    async getEarningsGraph(@Query() queryDto: GraphQueryDto) {
        const graphData = await this.dashboardService.getEarningsGraph(queryDto);
        return {
            message: 'Earnings graph data retrieved successfully',
            data: graphData,
        };
    }

    @Get('users-graph')
    @ApiOperation({ summary: 'Get users graph data for admin dashboard' })
    @ApiQuery({ name: 'type', required: false, enum: GraphType, example: GraphType.YEARLY, description: 'Graph type: yearly, 6-months, or monthly' })
    @ApiResponse({
        status: 200,
        description: 'Users graph data retrieved successfully',
        schema: {
            example: {
                success: true,
                message: 'Users graph data retrieved successfully',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    data: [10, 15, 20, 18, 22, 25, 30, 28, 32, 35, 40, 45]
                },
                timestamp: '2024-01-15T10:30:00.000Z'
            }
        }
    })
    async getUsersGraph(@Query() queryDto: GraphQueryDto) {
        const graphData = await this.dashboardService.getUsersGraph(queryDto);
        return {
            message: 'Users graph data retrieved successfully',
            data: graphData,
        };
    }

    @Get('vendors-graph')
    @ApiOperation({ summary: 'Get vendors (pharmacies) graph data for admin dashboard' })
    @ApiQuery({ name: 'type', required: false, enum: GraphType, example: GraphType.YEARLY, description: 'Graph type: yearly, 6-months, or monthly' })
    @ApiResponse({
        status: 200,
        description: 'Vendors graph data retrieved successfully',
        schema: {
            example: {
                success: true,
                message: 'Vendor graph data retrieved successfully',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    data: [5, 8, 10, 9, 12, 15, 18, 16, 20, 22, 25, 28]
                },
                timestamp: '2024-01-15T10:30:00.000Z'
            }
        }
    })
    async getVendorsGraph(@Query() queryDto: GraphQueryDto) {
        const graphData = await this.dashboardService.getVendorsGraph(queryDto);
        return {
            message: 'Vendor graph data retrieved successfully',
            data: graphData,
        };
    }

}
