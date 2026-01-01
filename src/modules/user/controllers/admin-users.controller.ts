import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { ListUsersDto } from '../dto/list-users.dto';
import { VendorActionDto } from '../dto/vendor-action.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminUsersController {
    constructor(
        private readonly usersService: UsersService,
    ) { }

    @Get('users')
    @ApiOperation({ summary: 'List users (role = USER) with pagination' })
    @ApiQuery({ name: 'page', required: true, type: Number, example: 1, description: 'Page number (min: 1)' })
    @ApiQuery({ name: 'limit', required: true, type: Number, example: 10, description: 'Items per page (min: 1, max: 100)' })
    @ApiResponse({
        status: 200,
        description: 'Users retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Users retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        users: {
                            type: 'array',
                            items: { type: 'object' },
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
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async listUsers(@Query() queryDto: ListUsersDto) {
        return this.usersService.listUsers(queryDto);
    }

    @Get('vendors')
    @ApiOperation({ summary: 'List approved vendors with pagination' })
    @ApiQuery({ name: 'page', required: true, type: Number, example: 1, description: 'Page number (min: 1)' })
    @ApiQuery({ name: 'limit', required: true, type: Number, example: 10, description: 'Items per page (min: 1, max: 100)' })
    @ApiResponse({
        status: 200,
        description: 'Approved vendors retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Approved vendors retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        vendors: {
                            type: 'array',
                            items: { type: 'object' },
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
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async listApprovedVendors(@Query() queryDto: ListUsersDto) {
        return this.usersService.listApprovedVendors(queryDto);
    }

    @Get('vendor-requests')
    @ApiOperation({ summary: 'List vendor requests (pending or rejected) with pagination' })
    @ApiQuery({ name: 'page', required: true, type: Number, example: 1, description: 'Page number (min: 1)' })
    @ApiQuery({ name: 'limit', required: true, type: Number, example: 10, description: 'Items per page (min: 1, max: 100)' })
    @ApiResponse({
        status: 200,
        description: 'Vendor requests retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Vendor requests retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        vendors: {
                            type: 'array',
                            items: { type: 'object' },
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
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async listVendorRequests(@Query() queryDto: ListUsersDto) {
        return this.usersService.listVendorRequests(queryDto);
    }

    @Get('users/:id')
    @ApiOperation({ summary: 'Get user/vendor details by ID with files' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({
        status: 200,
        description: 'User details retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'User details retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        status: { type: 'string' },
                        accountStatus: { type: 'string' },
                        profileImage: { type: 'object' },
                        license: { type: 'object', nullable: true },
                        certificate: { type: 'object', nullable: true },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getUserDetails(@Param('id') id: string) {
        return this.usersService.getUserDetails(id);
    }

    @Patch('vendors/:id/status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Approve or reject vendor' })
    @ApiParam({ name: 'id', description: 'Vendor ID' })
    @ApiBody({ type: VendorActionDto })
    @ApiResponse({
        status: 200,
        description: 'Vendor status updated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Vendor approved successfully' },
                data: { type: 'object' },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error or user is not a vendor' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async updateVendorStatus(
        @Param('id') id: string,
        @Body() vendorActionDto: VendorActionDto,
    ) {
        return this.usersService.updateVendorStatus(id, vendorActionDto);
    }

    @Patch('users/:id/toggle-status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle user status (active/inactive)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({
        status: 200,
        description: 'User status toggled successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'User activated successfully' },
                data: { type: 'object' },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async toggleUserStatus(@Param('id') id: string) {
        return this.usersService.toggleUserStatus(id);
    }
}

