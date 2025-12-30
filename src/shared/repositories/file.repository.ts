import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { File, FileDocument } from '../schemas/file.schema';
import { FileType, FileCategory } from '../../common/constants/file.constants';
import * as fs from 'fs/promises';
import * as path from 'path';
@Injectable()
export class FileRepository extends BaseRepository<FileDocument> {
    private readonly logger = new Logger(FileRepository.name);
    constructor(
        @InjectModel(File.name) protected readonly fileModel: Model<FileDocument>,
    ) {
        super(fileModel);
    }

    async findByUser(userId: string): Promise<FileDocument[]> {
        return this.fileModel
            .find({ uploadedBy: userId, isActive: true })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByEntity(
        fileableId: string,
        fileableType: string,
    ): Promise<FileDocument[]> {
        return this.fileModel
            .find({ fileableId, fileableType, isActive: true })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByTypeAndCategory(
        type: FileType,
        category: FileCategory,
        userId: string,
    ): Promise<FileDocument[]> {
        return this.fileModel
            .find({ type, category, uploadedBy: userId, isActive: true })
            .exec();
    }

    async softDelete(fileId: string): Promise<FileDocument | null> {
        return this.fileModel
            .findByIdAndUpdate(fileId, { isActive: false }, { new: true })
            .exec();
    }

    async deactivateUserAvatar(userId: string): Promise<void> {
        await this.fileModel.updateMany(
            {
                fileableId: new Types.ObjectId(userId),
                fileableType: 'User',
                category: FileCategory.AVATAR,
                isActive: true,
            },
            {
                isActive: false,
                updatedAt: new Date()
            }
        );
    }

    private async deleteFilesFromDisk(files: FileDocument[]): Promise<void> {
        const uploadsDir = path.join(process.cwd(), 'uploads');

        for (const file of files) {
            try {
                if (file.path) {
                    // Extract filename from path
                    let filename: string;
                    if (file.path.startsWith('/uploads/')) {
                        filename = file.path.replace('/uploads/', '');
                    } else if (file.path.startsWith('uploads/')) {
                        filename = file.path.replace('uploads/', '');
                    } else {
                        filename = file.path;
                    }

                    const filePath = path.join(uploadsDir, filename);

                    // Check if file exists
                    try {
                        await fs.access(filePath);

                        // Delete the file
                        await fs.unlink(filePath);
                        this.logger.log(`Deleted file from disk: ${filePath}`);

                        // Optional: Delete empty directories
                        await this.cleanupEmptyDirectories(path.dirname(filePath));

                    } catch (error) {
                        // File doesn't exist or can't be accessed
                        this.logger.warn(`File not found or can't be deleted: ${filePath}`, error.message);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to delete file ${file._id} from disk:`, error.message);
                // Continue with other files even if one fails
            }
        }
    }

    private async cleanupEmptyDirectories(dirPath: string): Promise<void> {
        try {
            const uploadsBaseDir = path.join(process.cwd(), 'uploads');

            // Only clean up directories within uploads folder
            if (!dirPath.startsWith(uploadsBaseDir)) {
                return;
            }

            // Don't delete the base uploads directory
            if (dirPath === uploadsBaseDir) {
                return;
            }

            // Check if directory is empty
            const files = await fs.readdir(dirPath);

            if (files.length === 0) {
                // Directory is empty, delete it
                await fs.rmdir(dirPath);
                this.logger.log(`Deleted empty directory: ${dirPath}`);

                // Recursively check parent directory
                const parentDir = path.dirname(dirPath);
                await this.cleanupEmptyDirectories(parentDir);
            }
        } catch (error) {
            this.logger.warn(`Failed to cleanup directory ${dirPath}:`, error.message);
        }
    }

}