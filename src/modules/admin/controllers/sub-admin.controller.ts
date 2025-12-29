import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SubAdminService } from '../services/sub-admin.service';
import { CreateSubAdminDto } from '../dto/create-sub-admin.dto';
import { UpdateSubAdminDto } from '../dto/update-sub-admin.dto';
import { SubAdminQueryDto } from '../dto/sub-admin-query.dto';
import { UpdateSubAdminPermissionsDto } from '../dto/update-sub-admin-permissions.dto';

@ApiTags('Admin - Sub Admin Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/sub-admins')
export class SubAdminController {
    constructor(private readonly subAdminService: SubAdminService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new sub-admin' })
    @ApiResponse({ status: 201, description: 'Sub-admin created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async createSubAdmin(@Body() createSubAdminDto: CreateSubAdminDto) {
        return this.subAdminService.createSubAdmin(createSubAdminDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all sub-admins with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Sub-admins retrieved successfully' })
    async getAllSubAdmins(@Query() queryDto: SubAdminQueryDto) {
        return this.subAdminService.getAllSubAdmins(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get sub-admin details by ID' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Sub-admin details retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    async getSubAdminById(@Param('id') subAdminId: string) {
        return this.subAdminService.getSubAdminById(subAdminId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update sub-admin' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Sub-admin updated successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async updateSubAdmin(
        @Param('id') subAdminId: string,
        @Body() updateSubAdminDto: UpdateSubAdminDto,
    ) {
        return this.subAdminService.updateSubAdmin(subAdminId, updateSubAdminDto);
    }

    @Put(':id/permissions')
    @ApiOperation({ summary: 'Update sub-admin permissions' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    async updateSubAdminPermissions(
        @Param('id') subAdminId: string,
        @Body() updatePermissionsDto: UpdateSubAdminPermissionsDto,
    ) {
        return this.subAdminService.updateSubAdminPermissions(subAdminId, updatePermissionsDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete sub-admin (soft delete)' })
    @ApiParam({ name: 'id', description: 'Sub-admin ID' })
    @ApiResponse({ status: 200, description: 'Sub-admin deleted successfully' })
    @ApiResponse({ status: 404, description: 'Sub-admin not found' })
    async deleteSubAdmin(@Param('id') subAdminId: string) {
        return this.subAdminService.deleteSubAdmin(subAdminId);
    }
}

