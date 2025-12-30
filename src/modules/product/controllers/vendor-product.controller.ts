import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductQueryDto } from '../dto/product-query.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { ProductStatus } from 'src/common/constants/product.constants';

@ApiTags('Vendor - Products')
@ApiBearerAuth()
@Roles(UserRole.VENDOR)
@Controller('vendor/products')
export class VendorProductController {
    constructor(private readonly productService: ProductService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new product' })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    async createProduct(
        @Body() createProductDto: CreateProductDto,
        @CurrentUser() user: any,
    ) {
        return {
            message: 'Product created successfully',
            data: await this.productService.createProduct(createProductDto, user.sub || user._id),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all products for the vendor' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async getProducts(
        @Query() queryDto: ProductQueryDto,
        @CurrentUser() user: any,
    ) {
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        return await this.productService.getVendorProducts(
            user.sub || user._id,
            Number(page),
            Number(limit),
            queryDto.status,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Product does not belong to you' })
    async getProductById(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return {
            message: 'Product retrieved successfully',
            data: await this.productService.getProductById(id, user.sub || user._id),
        };
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Product does not belong to you' })
    async updateProduct(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @CurrentUser() user: any,
    ) {
        return {
            message: 'Product updated successfully',
            data: await this.productService.updateProduct(id, updateProductDto, user.sub || user._id),
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product deleted successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Product does not belong to you' })
    async deleteProduct(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return await this.productService.deleteProduct(id, user.sub || user._id);
    }
}

