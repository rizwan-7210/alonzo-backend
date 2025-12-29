// src/modules/admin/services/tutorial.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { TutorialRepository } from 'src/shared/repositories/tutorial.repository';
import { CreateTutorialDto } from '../dto/tutorial/create-tutorial.dto';
import { Status } from 'src/common/constants/tutorial.constants';
import { FileCategory, FileType } from 'src/common/constants/file.constants';
import { TutorialQueryDto } from '../dto/tutorial/tutorial-query.dto';
import { UpdateTutorialDto } from '../dto/tutorial/update-tutorial.dto';

@Injectable()
export class TutorialService {
    private readonly logger = new Logger(TutorialService.name);

    constructor(
        private readonly tutorialRepository: TutorialRepository,
        private readonly fileRepository: FileRepository,
    ) { }

    async createTutorial(createTutorialDto: CreateTutorialDto, userId: string, video?: Express.Multer.File, thumbnail?: Express.Multer.File) {
        try {
            // Check if tutorial with same title exists
            const existingTutorial = await this.tutorialRepository.findOne({
                title: createTutorialDto.title.trim(),
                status: { $ne: Status.DELETED }
            });

            if (existingTutorial) {
                throw new ConflictException('Tutorial with this title already exists');
            }

            // Create tutorial
            const tutorial = await this.tutorialRepository.create({
                title: createTutorialDto.title.trim(),
                description: createTutorialDto.description.trim(),
                status: createTutorialDto.status || Status.ACTIVE,
                duration: createTutorialDto.duration || 0,
                createdBy: new Types.ObjectId(userId),
            });

            // Handle video upload
            if (video) {
                await this.handleTutorialFileUpload(tutorial, video, FileType.VIDEO, 'video');
            }

            // Handle thumbnail upload
            if (thumbnail) {
                await this.handleTutorialFileUpload(tutorial, thumbnail, FileType.IMAGE, 'thumbnail');
            }

            // Get tutorial with files
            const tutorialWithFiles = await this.tutorialRepository.findWithFiles(tutorial._id.toString());

            // Return just the formatted data - TransformInterceptor will wrap it
            return this.formatTutorialResponse(tutorialWithFiles);

        } catch (error) {
            this.logger.error(`Failed to create tutorial: ${error.message}`);
            throw error;
        }
    }

    async getAllTutorials(queryDto: TutorialQueryDto) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                status,
                sortBy = 'createdAt',  // Ensure default value
                sortOrder = 'desc',     // Ensure default value
                startDate,
                endDate
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

            // Filter by date range
            if (startDate || endDate) {
                conditions.createdAt = {};
                if (startDate) {
                    conditions.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    conditions.createdAt.$lte = new Date(endDate);
                }
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

    async updateTutorial(id: string, updateTutorialDto: UpdateTutorialDto, userId: string, video?: Express.Multer.File, thumbnail?: Express.Multer.File) {
        try {
            const tutorial = await this.tutorialRepository.findById(id);

            if (!tutorial) {
                throw new NotFoundException('Tutorial not found');
            }

            // Check if title is being updated and if it's unique
            if (updateTutorialDto.title && updateTutorialDto.title !== tutorial.title) {
                const existingTutorial = await this.tutorialRepository.findOne({
                    title: updateTutorialDto.title.trim(),
                    _id: { $ne: new Types.ObjectId(id) },
                    status: { $ne: Status.DELETED }
                });

                if (existingTutorial) {
                    throw new ConflictException('Tutorial with this title already exists');
                }
            }

            // Prepare update data
            const updateData: any = { ...updateTutorialDto };
            if (updateData.title) updateData.title = updateData.title.trim();
            if (updateData.description) updateData.description = updateData.description.trim();

            // Update tutorial
            const updatedTutorial = await this.tutorialRepository.update(id, updateData);

            if (!updatedTutorial) {
                throw new InternalServerErrorException('Failed to update tutorial');
            }

            // Handle file updates
            if (video) {
                await this.updateTutorialFile(updatedTutorial, video, FileType.VIDEO, 'video');
            }

            if (thumbnail) {
                await this.updateTutorialFile(updatedTutorial, thumbnail, FileType.IMAGE, 'thumbnail');
            }

            // Get updated tutorial with files
            const tutorialWithFiles = await this.tutorialRepository.findWithFiles(id);

            // Return just the formatted data - TransformInterceptor will wrap it
            return this.formatTutorialResponse(tutorialWithFiles);

        } catch (error) {
            this.logger.error(`Failed to update tutorial ${id}: ${error.message}`);
            throw error;
        }
    }

    async deleteTutorial(id: string) {
        try {
            const tutorial = await this.tutorialRepository.findById(id);

            if (!tutorial) {
                throw new NotFoundException('Tutorial not found');
            }

            // Soft delete
            const deletedTutorial = await this.tutorialRepository.softDelete(id);

            // Return just the formatted data - TransformInterceptor will wrap it
            return this.formatTutorialResponse(deletedTutorial);

        } catch (error) {
            this.logger.error(`Failed to delete tutorial ${id}: ${error.message}`);
            throw error;
        }
    }

    async changeTutorialStatus(id: string, status: Status) {
        try {
            const tutorial = await this.tutorialRepository.findById(id);

            if (!tutorial) {
                throw new NotFoundException('Tutorial not found');
            }

            const updatedTutorial = await this.tutorialRepository.update(id, { status });
            const tutorialWithFiles = await this.tutorialRepository.findWithFiles(id);
            // Return just the formatted data - TransformInterceptor will wrap it
            return this.formatTutorialResponse(tutorialWithFiles);

        } catch (error) {
            this.logger.error(`Failed to change tutorial status ${id}: ${error.message}`);
            throw error;
        }
    }

    async getTutorialStats() {
        try {
            const stats = await this.tutorialRepository.getTutorialStats();

            // Return just the data - TransformInterceptor will wrap it
            return stats;

        } catch (error) {
            this.logger.error(`Failed to get tutorial stats: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve tutorial statistics');
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

    private async handleTutorialFileUpload(
        tutorial: any,
        file: Express.Multer.File,
        fileType: FileType,
        category: string
    ): Promise<void> {
        try {
            await this.fileRepository.create({
                name: file.filename,
                originalName: file.originalname,
                path: file.filename,
                mimeType: file.mimetype,
                size: file.size,
                type: fileType,
                category: FileCategory.ATTACHMENT,
                fileableId: new Types.ObjectId(tutorial._id),
                fileableType: 'Tutorial',
                uploadedBy: new Types.ObjectId(tutorial.createdBy),
                isActive: true,
            });

        } catch (error) {
            this.logger.error(`Failed to upload ${category} for tutorial ${tutorial._id}:`, error);
            throw new BadRequestException(`Failed to upload ${category}`);
        }
    }

    private async updateTutorialFile(
        tutorial: any,
        file: Express.Multer.File,
        fileType: FileType,
        category: string
    ): Promise<void> {
        try {
            // First, deactivate old file
            await this.fileRepository.deleteTutorialFile(tutorial._id.toString(), fileType);

            // Create new file
            await this.handleTutorialFileUpload(tutorial, file, fileType, category);

        } catch (error) {
            this.logger.error(`Failed to update ${category} for tutorial ${tutorial._id}:`, error);
            throw new BadRequestException(`Failed to update ${category}`);
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