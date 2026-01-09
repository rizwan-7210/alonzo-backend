import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, HttpCode, HttpStatus, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ToggleProductStatusDto } from '../dto/toggle-product-status.dto';
import { ToggleStatusDto } from '../dto/toggle-status.dto';
import { ToggleInventoryStatusDto } from '../dto/toggle-inventory-status.dto';
import { ProductQueryDto } from '../dto/product-query.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { ProductStatus, InventoryStatus } from 'src/common/constants/product.constants';

@ApiTags('Vendor - Products')
@ApiBearerAuth()
@Roles(UserRole.VENDOR)
@Controller('vendor/products')
export class VendorProductController {
    constructor(private readonly productService: ProductService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FilesInterceptor('files', 10))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new product' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Paracetamol 500mg' },
                amount: { type: 'number', example: 100.50 },
                hasDiscount: { type: 'boolean', example: false },
                discountPercentage: { type: 'number', example: 10 },
                description: { type: 'string', example: 'High-quality paracetamol tablets' },
                status: { type: 'string', enum: Object.values(ProductStatus), example: ProductStatus.ACTIVE },
                inventoryStatus: { type: 'string', enum: Object.values(InventoryStatus), example: InventoryStatus.IN_STOCK },
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Product images (min 1, max 10, only jpeg, png, webp). In Postman, add multiple fields all named "files"',
                },
            },
            required: ['title', 'amount', 'files'],
        },
    })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    async createProduct(
        @Body() createProductDto: CreateProductDto,
        @UploadedFiles() files: Express.Multer.File[],
        @CurrentUser() user: any,
    ) {
        // Validate files are provided
        if (!files || files.length === 0) {
            throw new BadRequestException('At least 1 image is required');
        }

        return {
            message: 'Product created successfully',
            data: await this.productService.createProduct(
                createProductDto,
                files,
                user.sub || user._id || user.id,
                user,
            ),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all products for the vendor' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product title' })
    @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Filter products from this date (ISO 8601 format)', example: '2024-01-01' })
    @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Filter products until this date (ISO 8601 format)', example: '2024-12-31' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async getProducts(
        @Query() queryDto: ProductQueryDto,
        @CurrentUser() user: any,
    ) {
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        return await this.productService.getVendorProducts(
            user.sub || user._id || user.id,
            Number(page),
            Number(limit),
            queryDto.status,
            queryDto.search,
            queryDto.fromDate,
            queryDto.toDate,
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
            data: await this.productService.getProductById(id, user.sub || user._id || user.id),
        };
    }

    @Put(':id')
    @UseInterceptors(FilesInterceptor('files', 10))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update product' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'Paracetamol 500mg' },
                amount: { type: 'number', example: 100.50 },
                hasDiscount: { type: 'boolean', example: false },
                discountPercentage: { type: 'number', example: 10 },
                description: { type: 'string', example: 'High-quality paracetamol tablets' },
                status: { type: 'string', enum: Object.values(ProductStatus) },
                inventoryStatus: { type: 'string', enum: Object.values(InventoryStatus) },
                fileDeleteIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of file IDs to delete. Can be sent as JSON string or array. Example: ["fileId1", "fileId2"]',
                },
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'New product images to add (optional, will be added to existing images). Max 10 total images allowed.',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Product does not belong to you' })
    async updateProduct(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @UploadedFiles() files: Express.Multer.File[] | undefined,
        @CurrentUser() user: any,
    ) {
        return {
            message: 'Product updated successfully',
            data: await this.productService.updateProduct(
                id,
                updateProductDto,
                files,
                user.sub || user._id || user.id,
                user,
            ),
        };
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Toggle product status (active/inactive)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product status updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Product does not belong to you' })
    @ApiResponse({ status: 400, description: 'Invalid status value' })
    async toggleStatus(
        @Param('id') id: string,
        @Body() toggleDto: ToggleStatusDto,
        @CurrentUser() user: any,
    ) {
        return {
            message: 'Product status updated successfully',
            data: await this.productService.toggleStatus(
                id,
                toggleDto.status,
                user.sub || user._id || user.id,
            ),
        };
    }

    @Patch(':id/inventory-status')
    @ApiOperation({ summary: 'Toggle product inventory status (inStock/outOfStock)' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiResponse({ status: 200, description: 'Product inventory status updated successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - Product does not belong to you' })
    @ApiResponse({ status: 400, description: 'Invalid inventory status value' })
    async toggleInventoryStatus(
        @Param('id') id: string,
        @Body() toggleDto: ToggleInventoryStatusDto,
        @CurrentUser() user: any,
    ) {
        return {
            message: 'Product inventory status updated successfully',
            data: await this.productService.toggleInventoryStatus(
                id,
                toggleDto.inventoryStatus,
                user.sub || user._id || user.id,
            ),
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
        return await this.productService.deleteProduct(id, user.sub || user._id || user.id);
    }
}
