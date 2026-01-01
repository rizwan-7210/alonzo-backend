import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PlansService } from '../services/plans.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { ListPlansDto } from '../dto/list-plans.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin - Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/plans')
export class AdminPlansController {
    constructor(
        private readonly plansService: PlansService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new plan' })
    @ApiBody({ type: CreatePlanDto })
    @ApiResponse({
        status: 201,
        description: 'Plan created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plan created successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        stripe_price_id: { type: 'string' },
                        stripe_product_id: { type: 'string' },
                        duration: { type: 'string' },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async create(@Body() createDto: CreatePlanDto) {
        return this.plansService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'List all plans with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title or description' })
    @ApiQuery({ name: 'status', required: false, type: String, enum: ['active', 'inactive'], description: 'Filter by status' })
    @ApiResponse({
        status: 200,
        description: 'Plans retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plans retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        plans: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    title: { type: 'string' },
                                    stripe_price_id: { type: 'string' },
                                    stripe_product_id: { type: 'string' },
                                    duration: { type: 'string' },
                                    amount: { type: 'number' },
                                    description: { type: 'string' },
                                    status: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        pagination: {
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
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findAll(@Query() queryDto: ListPlansDto) {
        return this.plansService.findAll(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get plan details by ID' })
    @ApiParam({ name: 'id', description: 'Plan ID' })
    @ApiResponse({
        status: 200,
        description: 'Plan retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plan retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        stripe_price_id: { type: 'string' },
                        stripe_product_id: { type: 'string' },
                        duration: { type: 'string' },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid plan ID' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findOne(@Param('id') id: string) {
        return this.plansService.findOne(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update plan by ID' })
    @ApiParam({ name: 'id', description: 'Plan ID' })
    @ApiBody({ type: UpdatePlanDto })
    @ApiResponse({
        status: 200,
        description: 'Plan updated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plan updated successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        stripe_price_id: { type: 'string' },
                        stripe_product_id: { type: 'string' },
                        duration: { type: 'string' },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid plan ID or validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async update(@Param('id') id: string, @Body() updateDto: UpdatePlanDto) {
        return this.plansService.update(id, updateDto);
    }

    @Patch(':id/toggle-status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle plan status (activate/deactivate)' })
    @ApiParam({ name: 'id', description: 'Plan ID' })
    @ApiResponse({
        status: 200,
        description: 'Plan status toggled successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Plan activated successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid plan ID' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async toggleStatus(@Param('id') id: string) {
        return this.plansService.toggleStatus(id);
    }
}

