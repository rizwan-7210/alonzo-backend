import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RecentlyViewed, RecentlyViewedDocument } from '../schemas/recently-viewed.schema';

@Injectable()
export class RecentlyViewedRepository extends BaseRepository<RecentlyViewedDocument> {
    constructor(
        @InjectModel(RecentlyViewed.name) protected readonly recentlyViewedModel: Model<RecentlyViewedDocument>,
    ) {
        super(recentlyViewedModel);
    }

    /**
     * Find recently viewed entry by userId, viewableType, and viewableId
     */
    async findByUserAndViewable(
        userId: string,
        viewableType: string,
        viewableId: string,
    ): Promise<RecentlyViewedDocument | null> {
        if (!this.isValidObjectId(userId) || !this.isValidObjectId(viewableId)) {
            return null;
        }

        return this.recentlyViewedModel
            .findOne({
                userId: new Types.ObjectId(userId),
                viewableType,
                viewableId: new Types.ObjectId(viewableId),
            })
            .exec();
    }

    /**
     * Find or create recently viewed entry
     * If exists, updates updatedAt; else creates new entry
     */
    async findOrCreate(
        userId: string,
        viewableType: string,
        viewableId: string,
    ): Promise<RecentlyViewedDocument> {
        if (!this.isValidObjectId(userId) || !this.isValidObjectId(viewableId)) {
            throw new Error('Invalid userId or viewableId');
        }

        const existing = await this.findByUserAndViewable(userId, viewableType, viewableId);

        if (existing) {
            // Update updatedAt timestamp
            existing.updatedAt = new Date();
            return existing.save();
        }

        // Create new entry
        return this.recentlyViewedModel.create({
            userId: new Types.ObjectId(userId),
            viewableType,
            viewableId: new Types.ObjectId(viewableId),
        });
    }

    /**
     * Find all recently viewed entries for a user with pagination
     * Ordered by updatedAt DESC
     */
    async findByUserIdWithPagination(
        userId: string,
        page: number = 1,
        limit: number = 10,
    ) {
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

        return this.paginate(
            page,
            limit,
            { userId: new Types.ObjectId(userId) },
            {
                sort: { updatedAt: -1 },
                populate: [{
                    path: 'viewable',
                    // For Product, populate with files
                    populate: [{
                        path: 'files',
                        select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
                    }],
                }],
            }
        );
    }

    /**
     * Find all recently viewed entries for a user (without pagination)
     * Ordered by updatedAt DESC
     */
    async findByUserId(userId: string): Promise<RecentlyViewedDocument[]> {
        if (!this.isValidObjectId(userId)) {
            return [];
        }

        return this.recentlyViewedModel
            .find({ userId: new Types.ObjectId(userId) })
            .sort({ updatedAt: -1 })
            .populate({
                path: 'viewable',
                populate: [{
                    path: 'files',
                    select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
                }],
            })
            .exec();
    }
}
