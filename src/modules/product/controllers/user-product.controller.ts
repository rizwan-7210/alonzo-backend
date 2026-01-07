import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductQueryDto } from '../dto/product-query.dto';
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
