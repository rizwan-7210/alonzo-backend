import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { FileType, FileCategory, FileMimeTypes } from '../../../common/constants/file.constants';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { NotificationService } from 'src/modules/notification/services/notification.service';

@Injectable()
export class FileService {
    constructor(
        private readonly fileRepository: FileRepository,
        private readonly userRepository: UserRepository,
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService
    ) { }

    async uploadFile(
        file: Express.Multer.File,
        fileableId: string,
        fileableType: string,
        category: FileCategory,
        description?: string,
        uploadedBy?: string,
        user?: any,
    ) {
        // Validate file type
        const fileType = this.getFileType(file.mimetype);
        if (!fileType) {
            throw new BadRequestException('Unsupported file type');
        }

        // Validate file size with proper type handling
        const maxFileSize = this.configService.get<number>('upload.maxFileSize') ?? 10485760;
        if (file.size > maxFileSize) {
            throw new BadRequestException(`File size exceeds the limit of ${maxFileSize} bytes`);
        }

        // Create uploads directory if it doesn't exist with proper type handling
        const uploadPath = this.configService.get<string>('upload.path') ?? './uploads';
        if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
        }

        // Generate unique filename
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${fileableType}-${fileableId}-${Date.now()}.${fileExtension}`;
        const filePath = join(uploadPath, fileName);

        // Save file to disk with proper promise handling
        await new Promise<void>((resolve, reject) => {
            const writeStream = createWriteStream(filePath);
            writeStream.write(file.buffer);
            writeStream.end();
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
        });

        // Prepare file data with proper ObjectId conversion
        const fileData = {
            name: fileName,
            originalName: file.originalname,
            path: fileName,
            mimeType: file.mimetype,
            size: file.size,
            type: fileType,
            category,
            description,
            fileableId: new Types.ObjectId(fileableId) as any,
            fileableType,
            uploadedBy: uploadedBy ? (new Types.ObjectId(uploadedBy) as any) : undefined,
        };

        // Create file record in database
        const fileRecord = await this.fileRepository.create(fileData);

        if (user) {
            await this.notificationService.notifyFileUpload(user, {
                id: fileRecord._id.toString(),
                originalName: file.originalname,
                size: file.size,
                type: fileType,
                uploadedAt: new Date(),
            });
        }

        return fileRecord;
    }

    async uploadAvatar(userId: string, file: Express.Multer.File) {
        // Upload the file
        const fileRecord = await this.uploadFile(
            file,
            userId,
            'User',
            FileCategory.AVATAR,
            'User avatar',
            userId,
        );

        // Update user's avatar field
        await this.userRepository.update(userId, { avatar: fileRecord._id.toString() });

        return fileRecord;
    }

    async getUserFiles(userId: string) {
        return this.fileRepository.findByUser(userId);
    }

    async getFile(fileId: string) {
        const file = await this.fileRepository.findById(fileId);
        if (!file) {
            throw new NotFoundException('File not found');
        }
        return file;
    }

    async deleteFile(fileId: string, userId: string) {
        const file = await this.fileRepository.findById(fileId);
        if (!file) {
            throw new NotFoundException('File not found');
        }

        // Check if the user is the owner of the file
        if (file.uploadedBy?.toString() !== userId) {
            throw new BadRequestException('You can only delete your own files');
        }

        // Soft delete the file
        return this.fileRepository.softDelete(fileId);
    }

    private getFileType(mimeType: string): FileType {
        for (const [type, mimes] of Object.entries(FileMimeTypes)) {
            if (mimes.includes(mimeType)) {
                return type as FileType;
            }
        }
        return FileType.OTHER;
    }
}