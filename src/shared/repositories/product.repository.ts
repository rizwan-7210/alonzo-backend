import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Product, ProductDocument } from '../schemas/product.schema';
import { ProductStatus } from '../../common/constants/product.constants';

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
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByUserIdAndStatus(userId: string, status: ProductStatus): Promise<ProductDocument[]> {
        if (!this.isValidObjectId(userId)) {
            return [];
        }
        return this.productModel
            .find({ userId: new Types.ObjectId(userId), status })
            .sort({ createdAt: -1 })
            .exec();
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
        return this.paginate(page, limit, { status: ProductStatus.ACTIVE }, {
            sort: { createdAt: -1 },
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
            })
            .exec();
    }
}

