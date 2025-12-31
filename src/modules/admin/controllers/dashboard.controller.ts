import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
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
