import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductQueryDto } from '../dto/product-query.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';

@ApiTags('User - Products')
@ApiBearerAuth()
@Roles(UserRole.USER)
@Controller('user/products')
export class UserProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    @ApiOperation({ summary: 'Get all active products (read-only)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async getProducts(@Query() queryDto: ProductQueryDto) {
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        return {
            message: 'Products retrieved successfully',
            data: await this.productService.getActiveProducts(Number(page), Number(limit)),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product details by ID (read-only)' })
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

