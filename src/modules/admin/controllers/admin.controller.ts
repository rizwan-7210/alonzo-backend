import { UserManagementService } from '../services/user-management.service';
import { UserRole, UserStatus } from 'src/common/constants/user.constants';
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
// import { Roles } from '../../../../common/decorators/roles.decorator';
// import { UserRole } from '../../../../common/constants/user.constants';
import { CreateUserDto } from '../dto/create-user.dto';
import { Roles } from 'src/common/decorators/roles.decorator';


@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
    constructor(private readonly userManagementService: UserManagementService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.userManagementService.createUser(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all users with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'role', required: false, enum: UserRole })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    async getUsers(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
        @Query('role') role?: UserRole,
    ) {
        return this.userManagementService.getAllUsers(page, limit, search, role);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get user statistics' })
    @ApiResponse({ status: 200, description: 'User stats retrieved successfully' })
    async getUserStats() {
        return this.userManagementService.getUserStats();
    }

    @Get('search')
    @ApiOperation({ summary: 'Search users' })
    @ApiQuery({ name: 'q', required: true, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Users searched successfully' })
    async searchUsers(
        @Query('q') search: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.userManagementService.searchUsers(search, page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    async getUser(@Param('id') id: string) {
        return this.userManagementService.getUserById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    async updateUser(@Param('id') id: string, @Body() updateData: any) {
        return this.userManagementService.updateUser(id, updateData);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete user (soft delete)' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    async deleteUser(@Param('id') id: string) {
        return this.userManagementService.deleteUser(id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Change user status' })
    @ApiResponse({ status: 200, description: 'User status updated successfully' })
    async changeUserStatus(@Param('id') id: string, @Body('status') status: UserStatus) {
        return this.userManagementService.changeUserStatus(id, status);
    }
}