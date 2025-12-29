// src/modules/user/services/tutorial.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { TutorialRepository } from 'src/shared/repositories/tutorial.repository';
import { Status } from 'src/common/constants/tutorial.constants';
import { TutorialQueryDto } from '../dto/tutorial/tutorial-query.dto';

@Injectable()
export class TutorialService {
    private readonly logger = new Logger(TutorialService.name);

    constructor(
        private readonly tutorialRepository: TutorialRepository,
    ) { }

    async getAllTutorials(queryDto: TutorialQueryDto) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                status,
                sortBy = 'createdAt',  // Ensure default value
                sortOrder = 'desc'     // Ensure default value
            } = queryDto;

            let conditions: any = {
                status: { $ne: Status.DELETED }
            };

            // Filter by status
            if (status) {
                conditions.status = status;
            }

            // Search functionality
            if (search) {
                conditions.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                ];
            }

            // Sort configuration - Now sortBy is guaranteed to have a value
            const sort: any = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Get paginated results
            const result = await this.tutorialRepository.paginate(
                page,
                limit,
                conditions,
                sort
            );

            // Get tutorials with files
            const tutorialsWithFiles = await this.tutorialRepository.findAllWithFiles({
                _id: { $in: result.data.map(t => t._id) }
            });

            // Format response
            result.data = tutorialsWithFiles.map(tutorial =>
                this.formatTutorialResponse(tutorial)
            );

            // Return just the data - TransformInterceptor will wrap it
            return result;

        } catch (error) {
            this.logger.error(`Failed to get tutorials: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve tutorials');
        }
    }

    async getFilteredTutorials(filters: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        minDuration?: number;
        maxDuration?: number;
        minViews?: number;
    }) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                minDuration,
                maxDuration,
                minViews = 0
            } = filters;

            // Users can ONLY see ACTIVE tutorials
            const conditions: any = {
                status: Status.ACTIVE,
                viewCount: { $gte: minViews }
            };

            // Search functionality
            if (search && search.trim()) {
                conditions.$or = [
                    { title: { $regex: search.trim(), $options: 'i' } },
                    { description: { $regex: search.trim(), $options: 'i' } },
                ];
            }

            // Duration filtering
            if (minDuration !== undefined || maxDuration !== undefined) {
                conditions.duration = {};
                if (minDuration !== undefined) {
                    conditions.duration.$gte = minDuration;
                }
                if (maxDuration !== undefined) {
                    conditions.duration.$lte = maxDuration;
                }
            }

            // Validate sort field
            const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'viewCount', 'duration'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

            // Sort configuration
            const sort: any = {};
            sort[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

            // Get paginated results
            const result = await this.tutorialRepository.paginate(
                page,
                limit,
                conditions,
                sort
            );

            // Get tutorials with files
            const tutorialsWithFiles = await this.tutorialRepository.findAllWithFiles({
                _id: { $in: result.data.map(t => t._id) },
                status: Status.ACTIVE
            });

            // Format response
            result.data = tutorialsWithFiles.map(tutorial =>
                this.formatTutorialResponse(tutorial)
            );

            return result;

        } catch (error) {
            this.logger.error(`Failed to get filtered tutorials: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve tutorials');
        }
    }

    async getTutorialById(id: string) {
        try {
            const tutorial = await this.tutorialRepository.findWithFiles(id);

            if (!tutorial) {
                throw new NotFoundException('Tutorial not found');
            }

            // Increment view count
            await this.tutorialRepository.incrementViewCount(id);

            // Return just the formatted data - TransformInterceptor will wrap it
            return this.formatTutorialResponse(tutorial);

        } catch (error) {
            this.logger.error(`Failed to get tutorial ${id}: ${error.message}`);
            throw error;
        }
    }

    async getPopularTutorials(limit: number = 10) {
        try {
            const tutorials = await this.tutorialRepository.findPopular(limit);

            // Return just the formatted data - TransformInterceptor will wrap it
            return tutorials.map(tutorial => this.formatTutorialResponse(tutorial));

        } catch (error) {
            this.logger.error(`Failed to get popular tutorials: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve popular tutorials');
        }
    }


    private formatTutorialResponse(tutorial: any) {
        if (!tutorial) return null;

        // Force conversion to plain object
        const tutorialObj = tutorial.toObject
            ? tutorial.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(tutorial));

        // Don't destructure - create new object directly
        const response: any = {};

        // Map properties explicitly
        if (tutorialObj._id) {
            response.id = tutorialObj._id.toString();
        }

        const properties = ['title', 'description', 'status', 'viewCount', 'duration', 'createdAt', 'updatedAt'];
        properties.forEach(prop => {
            if (tutorialObj[prop] !== undefined) {
                response[prop] = tutorialObj[prop];
            }
        });

        // Handle virtual fields
        if (tutorialObj.videoUrl) {
            const videoObj = tutorialObj.videoUrl.toObject ?
                tutorialObj.videoUrl.toObject() : tutorialObj.videoUrl;
            response.video = videoObj.url || null;
        }

        if (tutorialObj.thumbnailUrl) {
            const thumbObj = tutorialObj.thumbnailUrl.toObject ?
                tutorialObj.thumbnailUrl.toObject() : tutorialObj.thumbnailUrl;
            response.thumbnail = thumbObj.url || null;
        }

        // Convert dates
        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }
}