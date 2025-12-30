import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
    InternalServerErrorException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { ChangeAdminPasswordDto } from '../dto/change-admin-password.dto';
import { FileCategory, FileType } from '../../../common/constants/file.constants';
import { UserRole } from '../../../common/constants/user.constants';
import { Types } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeUserUtils } from '../../../common/utils/sanitize-user-utils';

@Injectable()
export class AdminProfileService {
    private readonly logger = new Logger(AdminProfileService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
    ) { }

    async getProfile(adminId: string) {
        const admin = await this.userRepository.findById(adminId);
        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        return sanitizeUserUtils.sanitizeUser(admin);
    }

    async updateProfile(
        adminId: string,
        updateProfileDto: UpdateAdminProfileDto,
        avatar?: Express.Multer.File
    ) {
        try {
            const admin = await this.userRepository.findById(adminId);
            if (!admin) {
                throw new NotFoundException('Admin not found');
            }

            // Check if email is being changed and if it's already taken
            if (updateProfileDto.email && updateProfileDto.email !== admin.email) {
                const existingUser = await this.userRepository.findByEmail(updateProfileDto.email);
                if (existingUser && existingUser.id !== adminId) {
                    throw new ConflictException('Email already in use');
                }
            }

            let updatedAdmin = await this.userRepository.update(adminId, updateProfileDto);

            if (avatar) {
                await this.handleAvatarUpload(admin, avatar);

                // Update admin with new avatar URL
                const avatarUrl = `/uploads/${avatar.filename}`;
                updatedAdmin = await this.userRepository.update(adminId, {
                    ...updateProfileDto,
                    avatar: avatarUrl
                });
            } else {
                // Update without avatar
                updatedAdmin = await this.userRepository.update(adminId, updateProfileDto);
            }

            if (!updatedAdmin) {
                throw new InternalServerErrorException('Failed to update admin profile');
            }

            return sanitizeUserUtils.sanitizeUser(updatedAdmin);
        } catch (error) {
            this.logger.error(`Failed to update profile for admin ${adminId}: ${error.message}`);
            throw error;
        }
    }

    async changePassword(adminId: string, changePasswordDto: ChangeAdminPasswordDto) {
        const { oldPassword, newPassword, confirmNewPassword } = changePasswordDto;

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException('New passwords do not match');
        }

        // Check if new password is same as old password
        if (oldPassword === newPassword) {
            throw new BadRequestException('New password must be different from old password');
        }

        // Get admin with password
        const admin = await this.userRepository.findByIdWithPassword(adminId);
        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
        if (!isOldPasswordValid) {
            throw new BadRequestException('Old password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const updatedAdmin = await this.userRepository.update(adminId, { password: hashedPassword });

        if (!updatedAdmin) {
            throw new InternalServerErrorException('Failed to update password');
        }

        this.logger.log(`Password changed successfully for admin ${adminId}`);
        return { message: 'Password changed successfully' };
    }

    async uploadAvatar(adminId: string, file: Express.Multer.File) {
        const admin = await this.userRepository.findById(adminId);
        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        await this.handleAvatarUpload(admin, file);

        // Update admin with new avatar URL
        const avatarUrl = `/uploads/${file.filename}`;
        const updatedAdmin = await this.userRepository.update(adminId, { avatar: avatarUrl });

        if (!updatedAdmin) {
            throw new InternalServerErrorException('Failed to update avatar');
        }

        return {
            message: 'Avatar uploaded successfully',
            avatar: avatarUrl
        };
    }

    private async handleAvatarUpload(admin: any, newAvatar: Express.Multer.File): Promise<void> {
        try {
            // 1. Validate avatar file
            await this.validateAvatarFile(newAvatar);

            // 2. Delete old avatar from database
            if (admin.avatarFile) {
                await this.deleteOldAvatar(admin);
            }

            // 3. Delete old avatar file from file system
            await this.deleteOldAvatarFileFromDisk(admin);

            // 4. Create new avatar file record
            await this.createNewAvatarFile(admin, newAvatar);

        } catch (error) {
            this.logger.error(`Failed to handle avatar upload for admin ${admin._id}:`, error);
            throw new BadRequestException('Failed to update avatar');
        }
    }

    private async deleteOldAvatar(admin: any): Promise<void> {
        try {
            // Deactivate old avatar in database (soft delete)
            await this.fileRepository.deactivateUserAvatar(admin._id.toString());
        } catch (error) {
            this.logger.warn(`Failed to delete old avatar from database for admin ${admin._id}:`, error);
            // Continue even if this fails
        }
    }

    private async deleteOldAvatarFileFromDisk(admin: any): Promise<void> {
        try {
            if (!admin.avatar) {
                return;
            }

            // Extract filename from avatar URL
            let oldFilename: string;
            if (admin.avatar.startsWith('/uploads/')) {
                oldFilename = admin.avatar.replace('/uploads/', '');
            } else {
                oldFilename = admin.avatar;
            }

            // Construct full path to the file
            const uploadsDir = path.join(process.cwd(), 'uploads');
            const oldFilePath = path.join(uploadsDir, oldFilename);

            // Check if file exists and delete it
            try {
                await fs.access(oldFilePath);
                await fs.unlink(oldFilePath);
                this.logger.log(`Deleted old avatar file: ${oldFilePath}`);
            } catch (error) {
                // File doesn't exist or can't be accessed - that's ok
                this.logger.debug(`Old avatar file not found or already deleted: ${oldFilePath}`);
            }
        } catch (error) {
            this.logger.warn(`Failed to delete old avatar file from disk for admin ${admin._id}:`, error);
            // Continue even if this fails
        }
    }

    private async createNewAvatarFile(admin: any, newAvatar: Express.Multer.File): Promise<void> {
        // Create new avatar file record
        await this.fileRepository.create({
            name: newAvatar.filename,
            originalName: newAvatar.originalname,
            path: newAvatar.filename,
            mimeType: newAvatar.mimetype,
            size: newAvatar.size,
            type: FileType.IMAGE,
            category: FileCategory.AVATAR,
            fileableId: new Types.ObjectId(admin._id),
            fileableType: 'User',
            uploadedBy: new Types.ObjectId(admin._id),
            isActive: true,
        });
    }

    private async validateAvatarFile(avatar: Express.Multer.File): Promise<void> {
        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimeTypes.includes(avatar.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (avatar.size > maxSize) {
            throw new BadRequestException(
                `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
            );
        }
    }
}
