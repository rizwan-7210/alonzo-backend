import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductQueryDto } from '../dto/product-query.dto';
import { SimilarProductsQueryDto } from '../dto/similar-products-query.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Products')
@Public()
@Controller('products')
export class UserProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    @ApiOperation({ summary: 'Get all active products (read-only)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product title' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async getProducts(@Query() queryDto: ProductQueryDto) {
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        return {
            message: 'Products retrieved successfully',
            data: await this.productService.getActiveProducts(Number(page), Number(limit), queryDto.search),
        };
    }

    @Get('similar/:productId')
    @ApiOperation({ summary: 'Get similar products (read-only, only active products)' })
    @ApiParam({ name: 'productId', description: 'Product ID to find similar products for' })
    @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter products by category ID' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of similar products to return', example: 10 })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort products (e.g., price:ASC, price:DESC, name:ASC, name:DESC)', example: 'price:ASC' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search products by title or description' })
    @ApiResponse({ 
        status: 200, 
        description: 'Similar products retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Similar products retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { type: 'object' }
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                limit: { type: 'number' }
                            }
                        }
                    }
                },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 404, description: 'Product not found or is not active' })
    @ApiResponse({ status: 500, description: 'Server error' })
    async getSimilarProducts(
        @Param('productId') productId: string,
        @Query() queryDto: SimilarProductsQueryDto,
    ) {
        const limit = queryDto.limit || 10;
        return {
            message: 'Similar products retrieved successfully',
            data: await this.productService.getSimilarProducts(
                productId,
                limit,
                queryDto.categoryId,
                queryDto.sortBy,
                queryDto.search,
            ),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product details by ID (read-only, only active products)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found or is not active' })
    async getProductById(@Param('id') id: string) {
        return {
            message: 'Product retrieved successfully',
            data: await this.productService.getActiveProductById(id),
        };
    }
}
