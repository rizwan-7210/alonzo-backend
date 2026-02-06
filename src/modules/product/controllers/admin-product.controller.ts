import { Controller, Get, Query, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { AdminProductQueryDto } from '../dto/admin-product-query.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { ProductStatus, InventoryStatus } from 'src/common/constants/product.constants';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class AdminProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    @ApiOperation({ summary: 'Get products with optional filters (admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by vendor (user) ID' })
    @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter from date (ISO 8601)', example: '2024-01-01' })
    @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter to date (ISO 8601)', example: '2024-12-31' })
    @ApiQuery({ name: 'inventoryStatus', required: false, enum: InventoryStatus })
    @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product title' })
    @ApiResponse({
        status: 200,
        description: 'Products retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', nullable: true },
                data: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        totalPages: { type: 'number' },
                        hasNext: { type: 'boolean' },
                        hasPrev: { type: 'boolean' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getProducts(@Query() queryDto: AdminProductQueryDto) {
        const result = await this.productService.getProductsForAdmin({
            page: queryDto.page,
            limit: queryDto.limit,
            userId: queryDto.userId,
            fromDate: queryDto.fromDate,
            toDate: queryDto.toDate,
            inventoryStatus: queryDto.inventoryStatus,
            status: queryDto.status,
            search: queryDto.search,
        });
        return {
            message: 'Products retrieved successfully',
            data: {
                data: result.data,
                total: result.pagination.total,
                page: result.pagination.page,
                limit: result.pagination.limit,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNext,
                hasPrev: result.pagination.hasPrev,
            },
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product details by ID (admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({
        status: 200,
        description: 'Product retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Product retrieved successfully' },
                data: { type: 'object', description: 'Product object with files' },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getProductById(@Param('id') id: string) {
        return {
            message: 'Product retrieved successfully',
            data: await this.productService.getProductById(id),
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Soft-delete product by ID (admin)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async deleteProduct(@Param('id') id: string) {
        return await this.productService.deleteProductForAdmin(id);
    }
}
