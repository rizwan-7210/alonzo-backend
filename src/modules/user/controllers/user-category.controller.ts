import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CategoryService } from '../../admin/services/category.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';

@ApiTags('User - Categories')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/categories')
export class UserCategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Get()
    @ApiOperation({ summary: 'Get all active categories (sorted alphabetically by title)' })
    @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
    async getCategories() {
        return {
            message: 'Categories retrieved successfully',
            data: await this.categoryService.getActiveCategories(),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get category details by ID' })
    @ApiParam({ name: 'id', description: 'Category ID' })
    @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Category not found' })
    async getCategoryById(@Param('id') id: string) {
        return {
            message: 'Category retrieved successfully',
            data: await this.categoryService.getCategoryDetails(id),
        };
    }
}

