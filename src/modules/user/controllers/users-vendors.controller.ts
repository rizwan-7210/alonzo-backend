import {
    Controller,
    Get,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { ListVendorsDto } from '../dto/list-vendors.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Users - Vendors')
@Public()
@Controller('users/vendors')
export class UsersVendorsController {
    constructor(
        private readonly usersService: UsersService,
    ) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get list of active approved vendors (user-side)' })
    @ApiQuery({ name: 'page', required: true, type: Number, example: 1, description: 'Page number (min: 1)' })
    @ApiQuery({ name: 'limit', required: true, type: Number, example: 10, description: 'Items per page (min: 1, max: 100)' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or email' })
    @ApiResponse({
        status: 200,
        description: 'Vendors retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Vendors retrieved successfully' },
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
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async listVendors(@Query() queryDto: ListVendorsDto) {
        return this.usersService.listActiveVendors(queryDto);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get vendor details by ID (user-side)' })
    @ApiParam({ name: 'id', description: 'Vendor ID' })
    @ApiResponse({
        status: 200,
        description: 'Vendor details retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Vendor details retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string', example: 'vendor' },
                        status: { type: 'string', example: 'active' },
                        accountStatus: { type: 'string', example: 'approved' },
                        profileImage: { type: 'object', nullable: true },
                        categoryId: { type: 'object', nullable: true },
                        pharmacyLicense: { type: 'object', nullable: true },
                        registrationCertificate: { type: 'object', nullable: true },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Vendor not found or not available' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getVendorDetails(@Param('id') id: string) {
        return this.usersService.getVendorDetails(id);
    }
}
