import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { UserRecentlyViewedService } from '../services/user-recently-viewed.service';
import { AddRecentlyViewedDto } from '../dto/add-recently-viewed.dto';
import { ListRecentlyViewedDto } from '../dto/list-recently-viewed.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../common/constants/user.constants';

@ApiTags('Users - Recently Viewed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller('users/recently-viewed')
export class UserRecentlyViewedController {
    constructor(
        private readonly userRecentlyViewedService: UserRecentlyViewedService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Add or update recently viewed product' })
    @ApiBody({ type: AddRecentlyViewedDto })
    @ApiResponse({
        status: 200,
        description: 'Recently viewed added/updated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Recently viewed added/updated successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        userId: { type: 'string' },
                        viewableType: { type: 'string', example: 'Product' },
                        viewableId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error or unsupported viewableType' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Product not found or not active' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async addOrUpdateRecentlyViewed(
        @CurrentUser() user: any,
        @Body() addDto: AddRecentlyViewedDto,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: 'Recently viewed added/updated successfully',
            data: await this.userRecentlyViewedService.addOrUpdateRecentlyViewed(userId, addDto),
        };
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get recently viewed products with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (min: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (min: 1)' })
    @ApiResponse({
        status: 200,
        description: 'Recently viewed products retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Recently viewed products retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    userId: { type: 'string' },
                                    viewableType: { type: 'string', example: 'Product' },
                                    viewableId: { type: 'string' },
                                    product: { type: 'object' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                page: { type: 'number' },
                                limit: { type: 'number' },
                                totalPages: { type: 'number' },
                                hasNext: { type: 'boolean' },
                                hasPrev: { type: 'boolean' },
                            },
                        },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getRecentlyViewed(
        @CurrentUser() user: any,
        @Query() queryDto: ListRecentlyViewedDto,
    ) {
        const userId = user.sub || user._id || user.id;
        return {
            message: 'Recently viewed products retrieved successfully',
            data: await this.userRecentlyViewedService.getRecentlyViewed(userId, queryDto),
        };
    }
}
