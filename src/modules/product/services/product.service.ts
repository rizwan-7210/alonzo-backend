import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from 'src/shared/repositories/product.repository';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { FileService } from 'src/modules/file/services/file.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ToggleProductStatusDto } from '../dto/toggle-product-status.dto';
import { ProductStatus, InventoryStatus } from 'src/common/constants/product.constants';
import { FileCategory, FileMimeTypes, FileType } from 'src/common/constants/file.constants';
import { Types } from 'mongoose';

@Injectable()
export class ProductService {
    constructor(
        private readonly productRepository: ProductRepository,
        private readonly fileRepository: FileRepository,
        private readonly fileService: FileService,
    ) { }

    async createProduct(
        createProductDto: CreateProductDto,
        files: Express.Multer.File[],
        userId: string,
        user?: any,
    ) {
        const { title, amount, hasDiscount, discountPercentage, description, inventoryStatus, status } = createProductDto;

        // Validate files
        if (!files || files.length === 0) {
            throw new BadRequestException('At least 1 image is required');
        }

        if (files.length > 10) {
            throw new BadRequestException('Maximum 10 images allowed');
        }

        // Validate file types (only images)
        for (const file of files) {
            if (!FileMimeTypes[FileType.IMAGE].includes(file.mimetype)) {
                throw new BadRequestException(`File ${file.originalname} is not a valid image. Only jpeg, png, and webp are allowed.`);
            }
        }

        // Validate discount fields
        // Only validate if hasDiscount is explicitly true
        if (hasDiscount === true) {
            if (!discountPercentage || discountPercentage <= 0) {
                throw new BadRequestException('Discount percentage is required when hasDiscount is true');
            }
        }

        // If hasDiscount is false or undefined, discountPercentage should not be provided
        if ((hasDiscount === false || hasDiscount === undefined) && discountPercentage !== undefined && discountPercentage !== null) {
            throw new BadRequestException('hasDiscount must be true when discountPercentage is provided');
        }

        // Create product
        const product = await this.productRepository.create({
            userId: new Types.ObjectId(userId),
            title: title.trim(),
            amount,
            hasDiscount: hasDiscount || false,
            discountPercentage: hasDiscount ? discountPercentage : undefined,
            description: description?.trim(),
            status: status || ProductStatus.ACTIVE,
            inventoryStatus: inventoryStatus || InventoryStatus.IN_STOCK,
        });

        // Upload files
        try {
            for (const file of files) {
                await this.fileService.uploadFile(
                    file,
                    product._id.toString(),
                    'Product',
                    FileCategory.ATTACHMENT,
                    'Product image',
                    userId,
                    user,
                );
            }
        } catch (error) {
            // If file upload fails, delete the product
            await this.productRepository.delete(product._id.toString());
            throw new BadRequestException(`Failed to upload files: ${error.message}`);
        }

        // Load product with files
        const productWithFiles = await this.productRepository.findByIdWithFiles(product._id.toString());
        return this.formatProductResponse(productWithFiles || product);
    }

    async updateProduct(
        id: string,
        updateProductDto: UpdateProductDto,
        files: Express.Multer.File[] | undefined,
        userId: string,
        user?: any,
    ) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to update it');
        }

        const { title, amount, hasDiscount, discountPercentage, status, description, inventoryStatus } = updateProductDto;

        // Validate discount fields
        // Only validate if hasDiscount is explicitly true
        if (hasDiscount === true) {
            if (!discountPercentage || discountPercentage <= 0) {
                throw new BadRequestException('Discount percentage is required when hasDiscount is true');
            }
        }

        // If hasDiscount is false or undefined, discountPercentage should not be provided
        if ((hasDiscount === false || hasDiscount === undefined) && discountPercentage !== undefined && discountPercentage !== null) {
            throw new BadRequestException('hasDiscount must be true when discountPercentage is provided');
        }

        // Validate files if provided
        if (files !== undefined) {
            if (files.length === 0) {
                throw new BadRequestException('At least 1 image is required');
            }

            if (files.length > 10) {
                throw new BadRequestException('Maximum 10 images allowed');
            }

            // Validate file types (only images)
            for (const file of files) {
                if (!FileMimeTypes[FileType.IMAGE].includes(file.mimetype)) {
                    throw new BadRequestException(`File ${file.originalname} is not a valid image. Only jpeg, png, and webp are allowed.`);
                }
            }
        }

        const updateData: any = {};
        if (title !== undefined) {
            updateData.title = title.trim();
        }
        if (amount !== undefined) {
            updateData.amount = amount;
        }
        if (hasDiscount !== undefined) {
            updateData.hasDiscount = hasDiscount;
            if (hasDiscount) {
                updateData.discountPercentage = discountPercentage;
            } else {
                updateData.discountPercentage = undefined;
            }
        } else if (discountPercentage !== undefined) {
            updateData.discountPercentage = discountPercentage;
        }
        if (status !== undefined) {
            updateData.status = status;
        }
        if (description !== undefined) {
            updateData.description = description?.trim();
        }
        if (inventoryStatus !== undefined) {
            updateData.inventoryStatus = inventoryStatus;
        }

        const updatedProduct = await this.productRepository.update(id, updateData);
        if (!updatedProduct) {
            throw new NotFoundException('Product not found');
        }

        // Handle file updates if provided
        if (files !== undefined) {
            // Remove existing files
            await this.removeProductFiles(id);

            // Upload new files
            try {
                for (const file of files) {
                    await this.fileService.uploadFile(
                        file,
                        id,
                        'Product',
                        FileCategory.ATTACHMENT,
                        'Product image',
                        userId,
                        user,
                    );
                }
            } catch (error) {
                throw new BadRequestException(`Failed to upload files: ${error.message}`);
            }
        }

        // Load product with files
        const productWithFiles = await this.productRepository.findByIdWithFiles(id);
        return this.formatProductResponse(productWithFiles || updatedProduct);
    }

    async toggleProductStatus(id: string, toggleDto: ToggleProductStatusDto, userId: string) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to update it');
        }

        const { status, inventoryStatus } = toggleDto;

        // At least one field must be provided
        if (!status && !inventoryStatus) {
            throw new BadRequestException('At least one of status or inventoryStatus must be provided');
        }

        const updateData: any = {};
        if (status !== undefined) {
            updateData.status = status;
        }
        if (inventoryStatus !== undefined) {
            updateData.inventoryStatus = inventoryStatus;
        }

        const updatedProduct = await this.productRepository.update(id, updateData);
        if (!updatedProduct) {
            throw new NotFoundException('Product not found');
        }

        // Load product with files
        const productWithFiles = await this.productRepository.findByIdWithFiles(id);
        return this.formatProductResponse(productWithFiles || updatedProduct);
    }

    async toggleStatus(id: string, status: ProductStatus, userId: string) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to update it');
        }

        const updatedProduct = await this.productRepository.update(id, { status });
        if (!updatedProduct) {
            throw new NotFoundException('Product not found');
        }

        // Load product with files
        const productWithFiles = await this.productRepository.findByIdWithFiles(id);
        return this.formatProductResponse(productWithFiles || updatedProduct);
    }

    async toggleInventoryStatus(id: string, inventoryStatus: InventoryStatus, userId: string) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to update it');
        }

        const updatedProduct = await this.productRepository.update(id, { inventoryStatus });
        if (!updatedProduct) {
            throw new NotFoundException('Product not found');
        }

        // Load product with files
        const productWithFiles = await this.productRepository.findByIdWithFiles(id);
        return this.formatProductResponse(productWithFiles || updatedProduct);
    }

    async deleteProduct(id: string, userId: string) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to delete it');
        }

        // Remove files
        await this.removeProductFiles(id);

        // Delete product
        await this.productRepository.delete(id);
        return {
            message: 'Product deleted successfully',
        };
    }

    async getProductById(id: string, userId?: string) {
        const product = await this.productRepository.findByIdWithFiles(id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // If userId is provided, verify ownership (for vendor endpoints)
        if (userId && product.userId.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to access this product');
        }

        return this.formatProductResponse(product);
    }

    async getVendorProducts(
        userId: string,
        page: number = 1,
        limit: number = 10,
        status?: ProductStatus,
        search?: string,
        fromDate?: string,
        toDate?: string,
    ) {
        const conditions: any = { userId: new Types.ObjectId(userId) };
        
        if (status) {
            conditions.status = status;
        }

        // Search by title
        if (search) {
            conditions.title = { $regex: search, $options: 'i' };
        }

        // Filter by date range (using createdAt)
        if (fromDate || toDate) {
            conditions.createdAt = {};
            if (fromDate) {
                conditions.createdAt.$gte = new Date(fromDate);
            }
            if (toDate) {
                // Set end date to end of day (23:59:59.999)
                const endDateTime = new Date(toDate);
                endDateTime.setHours(23, 59, 59, 999);
                conditions.createdAt.$lte = endDateTime;
            }
        }

        const result = await this.productRepository.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [{
                path: 'files',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            }],
        });

        return {
            data: result.data.map(product => this.formatProductResponse(product)),
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            },
        };
    }

    // Public methods for users (read-only)
    async getActiveProducts(page: number = 1, limit: number = 10, search?: string) {
        const conditions: any = { status: ProductStatus.ACTIVE };

        // Search by title
        if (search) {
            conditions.title = { $regex: search, $options: 'i' };
        }

        const result = await this.productRepository.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [{
                path: 'files',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            }],
        });

        return {
            data: result.data.map(product => this.formatProductResponse(product)),
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            },
        };
    }

    async getActiveProductById(id: string) {
        const product = await this.productRepository.findByIdWithFiles(id);
        if (!product) {
            throw new NotFoundException('Product not found or is not active');
        }

        if (product.status !== ProductStatus.ACTIVE) {
            throw new NotFoundException('Product not found or is not active');
        }

        return this.formatProductResponse(product);
    }

    private async removeProductFiles(productId: string): Promise<void> {
        // Find existing files for this product
        const existingFiles = await this.fileRepository.findByEntity(productId, 'Product');

        // Soft delete all existing files
        for (const file of existingFiles) {
            await this.fileRepository.softDelete(file._id.toString());
        }
    }

    private formatProductResponse(product: any) {
        const productObj = product.toObject ? product.toObject({ virtuals: true }) : product;

        // Calculate discounted price if applicable
        let finalAmount = productObj.amount;
        if (productObj.hasDiscount && productObj.discountPercentage) {
            finalAmount = productObj.amount - (productObj.amount * productObj.discountPercentage / 100);
        }

        // Format files
        let filesArray: any[] = [];
        if (productObj.files && Array.isArray(productObj.files)) {
            filesArray = productObj.files.map((file: any) => {
                const fileObj = file.toObject ? file.toObject() : file;

                // Build complete URL for the file
                let fileUrl: string | null = null;
                if (fileObj.path) {
                    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
                    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

                    if (fileObj.path.startsWith('/uploads/')) {
                        fileUrl = `${cleanBaseUrl}${fileObj.path}`;
                    } else if (fileObj.path.startsWith('http')) {
                        fileUrl = fileObj.path;
                    } else {
                        fileUrl = `${cleanBaseUrl}/uploads/${fileObj.path}`;
                    }
                }

                const finalUrl = fileUrl || fileObj.url;

                return {
                    id: fileObj._id ? fileObj._id.toString() : fileObj.id,
                    name: fileObj.name,
                    originalName: fileObj.originalName,
                    path: fileObj.path,
                    path_link: finalUrl,
                    mimeType: fileObj.mimeType,
                    size: fileObj.size,
                    type: fileObj.type,
                    category: fileObj.category,
                    subType: fileObj.subType,
                    description: fileObj.description,
                    createdAt: fileObj.createdAt ? new Date(fileObj.createdAt).toISOString() : null,
                    updatedAt: fileObj.updatedAt ? new Date(fileObj.updatedAt).toISOString() : null,
                };
            });
        }

        return {
            id: productObj._id ? productObj._id.toString() : productObj.id,
            userId: productObj.userId ? (typeof productObj.userId === 'object' ? productObj.userId.toString() : productObj.userId) : null,
            title: productObj.title,
            amount: productObj.amount,
            hasDiscount: productObj.hasDiscount || false,
            discountPercentage: productObj.discountPercentage || null,
            finalAmount: parseFloat(finalAmount.toFixed(2)),
            status: productObj.status,
            inventoryStatus: productObj.inventoryStatus || InventoryStatus.IN_STOCK,
            description: productObj.description || null,
            files: filesArray,
            createdAt: productObj.createdAt ? new Date(productObj.createdAt).toISOString() : null,
            updatedAt: productObj.updatedAt ? new Date(productObj.updatedAt).toISOString() : null,
        };
    }
}
