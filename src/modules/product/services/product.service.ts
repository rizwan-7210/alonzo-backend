import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from 'src/shared/repositories/product.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductStatus } from 'src/common/constants/product.constants';
import { Types } from 'mongoose';

@Injectable()
export class ProductService {
    constructor(private readonly productRepository: ProductRepository) { }

    async createProduct(createProductDto: CreateProductDto, userId: string) {
        const { title, amount, hasDiscount, discountPercentage } = createProductDto;

        // Validate discount fields
        if (hasDiscount && (!discountPercentage || discountPercentage <= 0)) {
            throw new BadRequestException('Discount percentage is required when hasDiscount is true');
        }

        if (!hasDiscount && discountPercentage) {
            throw new BadRequestException('hasDiscount must be true when discountPercentage is provided');
        }

        const product = await this.productRepository.create({
            userId: new Types.ObjectId(userId),
            title: title.trim(),
            amount,
            hasDiscount: hasDiscount || false,
            discountPercentage: hasDiscount ? discountPercentage : undefined,
            status: ProductStatus.ACTIVE,
        });

        return this.formatProductResponse(product);
    }

    async updateProduct(id: string, updateProductDto: UpdateProductDto, userId: string) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to update it');
        }

        const { title, amount, hasDiscount, discountPercentage, status } = updateProductDto;

        // Validate discount fields
        if (hasDiscount !== undefined && hasDiscount && (!discountPercentage || discountPercentage <= 0)) {
            throw new BadRequestException('Discount percentage is required when hasDiscount is true');
        }

        if (hasDiscount !== undefined && !hasDiscount && discountPercentage) {
            throw new BadRequestException('hasDiscount must be true when discountPercentage is provided');
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

        const updatedProduct = await this.productRepository.update(id, updateData);
        if (!updatedProduct) {
            throw new NotFoundException('Product not found');
        }

        return this.formatProductResponse(updatedProduct);
    }

    async deleteProduct(id: string, userId: string) {
        // Check if product exists and belongs to user
        const product = await this.productRepository.findByIdAndUserId(id, userId);
        if (!product) {
            throw new NotFoundException('Product not found or you do not have permission to delete it');
        }

        await this.productRepository.delete(id);
        return {
            message: 'Product deleted successfully',
        };
    }

    async getProductById(id: string, userId?: string) {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // If userId is provided, verify ownership (for vendor endpoints)
        if (userId && product.userId.toString() !== userId) {
            throw new ForbiddenException('You do not have permission to access this product');
        }

        return this.formatProductResponse(product);
    }

    async getVendorProducts(userId: string, page: number = 1, limit: number = 10, status?: ProductStatus) {
        const conditions: any = { userId: new Types.ObjectId(userId) };
        if (status) {
            conditions.status = status;
        }

        const result = await this.productRepository.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
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
    async getActiveProducts(page: number = 1, limit: number = 10) {
        const result = await this.productRepository.findActiveProducts(page, limit);

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
        const product = await this.productRepository.findActiveById(id);
        if (!product) {
            throw new NotFoundException('Product not found or is not active');
        }

        return this.formatProductResponse(product);
    }

    private formatProductResponse(product: any) {
        const productObj = product.toObject ? product.toObject() : product;

        // Calculate discounted price if applicable
        let finalAmount = productObj.amount;
        if (productObj.hasDiscount && productObj.discountPercentage) {
            finalAmount = productObj.amount - (productObj.amount * productObj.discountPercentage / 100);
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
            createdAt: productObj.createdAt ? new Date(productObj.createdAt).toISOString() : null,
            updatedAt: productObj.updatedAt ? new Date(productObj.updatedAt).toISOString() : null,
        };
    }
}

