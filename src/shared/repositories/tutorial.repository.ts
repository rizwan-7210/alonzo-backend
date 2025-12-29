// src/shared/repositories/tutorial.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Tutorial, TutorialDocument } from '../schemas/tutorial.schema';
import { Status } from '../../common/constants/tutorial.constants';

@Injectable()
export class TutorialRepository extends BaseRepository<TutorialDocument> {
    constructor(
        @InjectModel(Tutorial.name) protected readonly tutorialModel: Model<TutorialDocument>,
    ) {
        super(tutorialModel);
    }

    async findByStatus(status: Status): Promise<TutorialDocument[]> {
        return this.tutorialModel
            .find({ status })
            .populate('videoUrl')
            .populate('thumbnailUrl')
            .exec();
    }

    async softDelete(tutorialId: string): Promise<TutorialDocument | null> {
        return this.tutorialModel
            .findByIdAndUpdate(
                new Types.ObjectId(tutorialId),
                {
                    status: Status.DELETED,
                    deletedAt: new Date()
                },
                { new: true }
            )
            .exec();
    }

    async findWithFiles(id: string): Promise<TutorialDocument | null> {
        return this.tutorialModel
            .findById(new Types.ObjectId(id))
            .populate('videoUrl')
            .populate('thumbnailUrl')
            .exec();
    }

    async findAllWithFiles(conditions: any = {}): Promise<TutorialDocument[]> {
        return this.tutorialModel
            .find(conditions)
            .populate('videoUrl')
            .populate('thumbnailUrl')
            .exec();
    }

    async searchTutorials(search: string, page: number = 1, limit: number = 10): Promise<any> {
        const conditions = {
            status: { $ne: Status.DELETED },
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ],
        };

        return this.paginate(page, limit, conditions);
    }

    async findPopular(limit: number = 10): Promise<TutorialDocument[]> {
        return this.tutorialModel
            .find({
                status: Status.ACTIVE,
                viewCount: { $gt: 0 }
            })
            .sort({ viewCount: -1 })
            .limit(limit)
            .populate('videoUrl')
            .populate('thumbnailUrl')
            .exec();
    }

    async incrementViewCount(tutorialId: string): Promise<TutorialDocument | null> {
        return this.tutorialModel
            .findByIdAndUpdate(
                new Types.ObjectId(tutorialId),
                { $inc: { viewCount: 1 } },
                { new: true }
            )
            .exec();
    }

    async findByCreator(userId: string): Promise<TutorialDocument[]> {
        return this.tutorialModel
            .find({
                createdBy: new Types.ObjectId(userId),
                status: { $ne: Status.DELETED }
            })
            .populate('videoUrl')
            .populate('thumbnailUrl')
            .exec();
    }

    async getTutorialStats(): Promise<any> {
        const [
            totalTutorials,
            activeTutorials,
            inactiveTutorials,
            totalViews,
            avgDuration
        ] = await Promise.all([
            this.tutorialModel.countDocuments({ status: { $ne: Status.DELETED } }),
            this.tutorialModel.countDocuments({ status: Status.ACTIVE }),
            this.tutorialModel.countDocuments({ status: Status.INACTIVE }),
            this.tutorialModel.aggregate([
                { $match: { status: { $ne: Status.DELETED } } },
                { $group: { _id: null, total: { $sum: '$viewCount' } } }
            ]),
            this.tutorialModel.aggregate([
                { $match: { status: { $ne: Status.DELETED }, duration: { $gt: 0 } } },
                { $group: { _id: null, avg: { $avg: '$duration' } } }
            ])
        ]);

        return {
            total: totalTutorials,
            active: activeTutorials,
            inactive: inactiveTutorials,
            totalViews: totalViews[0]?.total || 0,
            avgDuration: avgDuration[0]?.avg || 0,
        };
    }

    async findActiveWithFiles(
        conditions: any = {},
        page: number = 1,
        limit: number = 10,
        sort: any = { createdAt: -1 }
    ): Promise<{
        data: TutorialDocument[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        // Ensure only active tutorials
        const finalConditions = {
            ...conditions,
            status: Status.ACTIVE
        };

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.tutorialModel
                .find(finalConditions)
                .populate('videoUrl')
                .populate('thumbnailUrl')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.tutorialModel.countDocuments(finalConditions).exec(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            total,
            page,
            limit,
            totalPages,
        };
    }
}