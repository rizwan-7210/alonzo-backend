import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { CategoryStatus } from 'src/common/constants/category.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Admin - Categories')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/categories')
export class AdminCategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new category' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Pharmacy' },
                description: { type: 'string', example: 'This is a pharmacy category description' },
                status: { type: 'string', enum: Object.values(CategoryStatus), example: CategoryStatus.ACTIVE },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Category created successfully' })
    @ApiResponse({ status: 409, description: 'Category with this title already exists' })
    async createCategory(
        @Body() createCategoryDto: CreateCategoryDto,
        @UploadedFile() file?: Express.Multer.File,
        @CurrentUser() user?: any,
    ) {
        return {
            message: 'Category created successfully',
            data: await this.categoryService.createCategory(createCategoryDto, file, user?.id),
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
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update category' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Pharmacy' },
                description: { type: 'string', example: 'This is a pharmacy category description' },
                status: { type: 'string', enum: Object.values(CategoryStatus), example: CategoryStatus.ACTIVE },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Category updated successfully' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    @ApiResponse({ status: 409, description: 'Category with this title already exists' })
    async updateCategory(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
        @UploadedFile() file?: Express.Multer.File,
        @CurrentUser() user?: any,
    ) {
        return {
            message: 'Category updated successfully',
            data: await this.categoryService.updateCategory(id, updateCategoryDto, file, user?.id),
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

