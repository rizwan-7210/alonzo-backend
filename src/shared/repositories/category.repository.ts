import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { CategoryStatus } from '../../common/constants/category.constants';

@Injectable()
export class CategoryRepository extends BaseRepository<CategoryDocument> {
    constructor(
        @InjectModel(Category.name) protected readonly categoryModel: Model<CategoryDocument>,
    ) {
        super(categoryModel);
    }

    async findActiveCategories(): Promise<CategoryDocument[]> {
        return this.categoryModel
            .find({ status: CategoryStatus.ACTIVE })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByStatus(status: CategoryStatus): Promise<CategoryDocument[]> {
        return this.categoryModel
            .find({ status })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByTitle(title: string): Promise<CategoryDocument | null> {
        return this.categoryModel
            .findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } })
            .exec();
    }

    async findByIdWithFile(id: string): Promise<CategoryDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return this.categoryModel
            .findById(id)
            .populate({
                path: 'file',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            })
            .exec();
    }

    async findAllWithFile(conditions: any = {}, sort: any = { createdAt: -1 }): Promise<CategoryDocument[]> {
        return this.categoryModel
            .find(conditions)
            .sort(sort)
            .populate({
                path: 'file',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            })
            .exec();
    }
}

