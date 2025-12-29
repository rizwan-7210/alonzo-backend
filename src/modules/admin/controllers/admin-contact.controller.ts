import { Controller, Get, Query, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ContactService } from 'src/modules/contact/services/contact.service';
import { ContactStatus } from 'src/shared/schemas/contact.schema';
import { ContactQueryDto } from '../dto/contact-query.dto';

@ApiTags('Admin - Contacts')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/contacts')
export class AdminContactController {
    constructor(private readonly contactService: ContactService) { }

    @Get()
    @ApiOperation({ summary: 'Get all contact forms' })
    @ApiResponse({ status: 200, description: 'Contact forms retrieved successfully' })
    async getAllContacts(@Query() queryDto: ContactQueryDto) {
        return this.contactService.getAllContacts(queryDto);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get contact form statistics' })
    @ApiResponse({ status: 200, description: 'Contact stats retrieved successfully' })
    async getContactStats() {
        return this.contactService.getContactStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get contact form by ID' })
    @ApiResponse({ status: 200, description: 'Contact form retrieved successfully' })
    async getContactById(@Param('id') id: string) {
        return this.contactService.getContactById(id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Update contact form status' })
    @ApiResponse({ status: 200, description: 'Contact form status updated successfully' })
    async updateContactStatus(
        @Param('id') id: string,
        @Body('status') status: ContactStatus,
    ) {
        return this.contactService.updateContactStatus(id, status);
    }
}