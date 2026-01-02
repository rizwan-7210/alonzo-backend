import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ContactService } from '../services/contact.service';
import { ListContactDto } from '../dto/list-contact.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin - Contact')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/contacts')
export class AdminContactController {
    constructor(
        private readonly contactService: ContactService,
    ) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List all contact messages with pagination' })
    @ApiQuery({ name: 'page', required: true, type: Number, example: 1, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: true, type: Number, example: 10, description: 'Items per page' })
    @ApiResponse({
        status: 200,
        description: 'Contact messages retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Contact messages retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        contacts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    userId: { type: 'string', nullable: true },
                                    userType: { type: 'string', enum: ['guest', 'vendor', 'user'] },
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    subject: { type: 'string' },
                                    message: { type: 'string' },
                                    status: { type: 'string', enum: ['pending', 'resolved'] },
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
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findAll(@Query() queryDto: ListContactDto) {
        return this.contactService.findAll(queryDto);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get contact message details by ID' })
    @ApiParam({ name: 'id', description: 'Contact message ID' })
    @ApiResponse({
        status: 200,
        description: 'Contact message retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Contact message retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        userId: { type: 'string', nullable: true },
                        userType: { type: 'string', enum: ['guest', 'vendor', 'user'] },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        subject: { type: 'string' },
                        message: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'resolved'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid contact ID' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiResponse({ status: 404, description: 'Contact message not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findOne(@Param('id') id: string) {
        return this.contactService.findOne(id);
    }
}

