import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { CategoryStatus } from 'src/common/constants/category.constants';

@ApiTags('Admin - Categories')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/categories')
export class AdminCategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new category' })
    @ApiResponse({ status: 201, description: 'Category created successfully' })
    @ApiResponse({ status: 409, description: 'Category with this title already exists' })
    async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
        return {
            message: 'Category created successfully',
            data: await this.categoryService.createCategory(createCategoryDto),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all categories with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: CategoryStatus })
    @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
    async getCategories(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('status') status?: CategoryStatus,
    ) {
        return await this.categoryService.getAllCategories(Number(page), Number(limit), status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category by ID' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async getCategoryById(@Param('id') id: string) {
        return {
            message: 'Category retrieved successfully',
            data: await this.categoryService.getCategoryById(id),
        };
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update category' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category updated successfully' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    @ApiResponse({ status: 409, description: 'Category with this title already exists' })
    async updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        return {
            message: 'Category updated successfully',
            data: await this.categoryService.updateCategory(id, updateCategoryDto),
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete category' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category deleted successfully' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async deleteCategory(@Param('id') id: string) {
        return await this.categoryService.deleteCategory(id);
    }

    @Put(':id/toggle-status')
    @ApiOperation({ summary: 'Toggle category status (active/inactive)' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category status toggled successfully' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async toggleStatus(@Param('id') id: string) {
        return {
            message: 'Category status toggled successfully',
            data: await this.categoryService.toggleCategoryStatus(id),
        };
    }
}

