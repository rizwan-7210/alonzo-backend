import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Product, ProductDocument } from '../schemas/product.schema';
import { ProductStatus, InventoryStatus } from '../../common/constants/product.constants';

@Injectable()
export class ProductRepository extends BaseRepository<ProductDocument> {
    constructor(
        @InjectModel(Product.name) protected readonly productModel: Model<ProductDocument>,
    ) {
        super(productModel);
    }

    async findByUserId(userId: string): Promise<ProductDocument[]> {
        if (!this.isValidObjectId(userId)) {
            return [];
        }
        return this.productModel
            .find({ userId: new Types.ObjectId(userId), ...this.notDeletedCondition() })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByUserIdAndStatus(userId: string, status: ProductStatus): Promise<ProductDocument[]> {
        if (!this.isValidObjectId(userId)) {
            return [];
        }
        return this.productModel
            .find({ userId: new Types.ObjectId(userId), status, ...this.notDeletedCondition() })
            .sort({ createdAt: -1 })
            .exec();
    }

    private notDeletedCondition(): { deletedAt: null } {
        return { deletedAt: null };
    }

    async findActiveProducts(page: number = 1, limit: number = 10): Promise<{
        data: ProductDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        return this.paginate(page, limit, { status: ProductStatus.ACTIVE, ...this.notDeletedCondition() }, {
            sort: { createdAt: -1 },
            populate: [{
                path: 'files',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            }],
        });
    }

    async findActiveProductsByUserId(userId: string, page: number = 1, limit: number = 10): Promise<{
        data: ProductDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        if (!this.isValidObjectId(userId)) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
            };
        }
        return this.paginate(page, limit, {
            userId: new Types.ObjectId(userId),
            status: ProductStatus.ACTIVE,
            ...this.notDeletedCondition(),
        }, {
            sort: { createdAt: -1 },
        });
    }

    async findByIdAndUserId(id: string, userId: string): Promise<ProductDocument | null> {
        if (!this.isValidObjectId(id) || !this.isValidObjectId(userId)) {
            return null;
        }
        return this.productModel
            .findOne({
                _id: new Types.ObjectId(id),
                userId: new Types.ObjectId(userId),
                deletedAt: null,
            })
            .exec();
    }

    async findActiveById(id: string): Promise<ProductDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return this.productModel
            .findOne({
                _id: new Types.ObjectId(id),
                status: ProductStatus.ACTIVE,
                deletedAt: null,
            })
            .exec();
    }

    async findByIdWithFiles(id: string): Promise<ProductDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return this.productModel
            .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
            .populate({
                path: 'files',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            })
            .exec();
    }

    async softDelete(id: string): Promise<ProductDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return this.productModel
            .findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true })
            .exec();
    }

    async findAllWithFiles(conditions: any = {}, sort: any = { createdAt: -1 }): Promise<ProductDocument[]> {
        return this.productModel
            .find(conditions)
            .sort(sort)
            .populate({
                path: 'files',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            })
            .exec();
    }
}

