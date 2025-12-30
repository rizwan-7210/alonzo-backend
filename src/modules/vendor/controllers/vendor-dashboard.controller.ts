import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VendorDashboardService } from '../services/vendor-dashboard.service';
import { DashboardChartDto, ChartType } from '../dto/dashboard-chart.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';

@ApiTags('Vendor - Dashboard')
@ApiBearerAuth()
@Roles(UserRole.VENDOR)
@Controller('vendor/dashboard')
export class VendorDashboardController {
    constructor(private readonly vendorDashboardService: VendorDashboardService) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get vendor dashboard statistics' })
    @ApiResponse({
        status: 200,
        description: 'Statistics retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    totalProducts: 25
                },
                timestamp: '2025-12-30T...'
            }
        }
    })
    async getStatistics(@CurrentUser() user: any) {
        return {
            message: null,
            data: await this.vendorDashboardService.getStatistics(user.sub || user._id),
        };
    }

    @Get('chart')
    @ApiOperation({ summary: 'Get vendor dashboard chart data' })
    @ApiQuery({
        name: 'type',
        enum: ChartType,
        example: ChartType.YEARLY,
        description: 'Chart type: yearly (current year), monthly (current month), or 6-months (last 6 months)'
    })
    @ApiResponse({
        status: 200,
        description: 'Chart data retrieved successfully',
        schema: {
            example: {
                success: true,
                message: null,
                data: {
                    label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    data: [10, 15, 8, 12, 20, 18, 22, 25, 20, 15, 10, 8]
                },
                timestamp: '2025-12-30T...'
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid chart type'
    })
    async getChartData(
        @Query() chartDto: DashboardChartDto,
        @CurrentUser() user: any,
    ) {
        return {
            message: null,
            data: await this.vendorDashboardService.getChartData(user.sub || user._id, chartDto.type),
        };
    }
}

