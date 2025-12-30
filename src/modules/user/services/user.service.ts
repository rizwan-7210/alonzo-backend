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
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { FileCategory, FileType, FileSubType } from 'src/common/constants/file.constants';
import { Types } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sanitizeUserUtils } from '../../../common/utils/sanitize-user-utils';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
    ) { }

    async getProfile(userId: string) {
        const user = await this.userRepository.findByIdWithProfileImage(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Remove sensitive data before returning
        return sanitizeUserUtils.sanitizeUser(user);
    }

    async updateProfile(
        userId: string,
        updateProfileDto: UpdateProfileDto,
        profileImage?: Express.Multer.File
    ) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Check if email is being changed and if it's already taken
            if (updateProfileDto.email && updateProfileDto.email !== user.email) {
                const existingUser = await this.userRepository.findByEmail(updateProfileDto.email);
                if (existingUser && existingUser.id !== userId) {
                    throw new ConflictException('Email already in use');
                }
            }

            let updatedUser = await this.userRepository.update(userId, updateProfileDto);
            if (profileImage) {
                await this.handleProfileImageUpload(user, profileImage);

                // Create new profile image file
                const savedFile = await this.fileRepository.create({
                    name: profileImage.filename,
                    originalName: profileImage.originalname,
                    path: profileImage.filename,
                    mimeType: profileImage.mimetype,
                    size: profileImage.size,
                    type: FileType.IMAGE,
                    category: FileCategory.PROFILE,
                    subType: FileSubType.PROFILE_IMAGE,
                    fileableId: new Types.ObjectId(userId),
                    fileableType: 'User',
                    uploadedBy: new Types.ObjectId(userId),
                    isActive: true,
                });

                // Update user with new profile image reference
                updatedUser = await this.userRepository.update(userId, {
                    ...updateProfileDto,
                    profileImage: savedFile._id
                });
            } else {
                // Update without profile image
                updatedUser = await this.userRepository.update(userId, updateProfileDto);
            }
            if (!updatedUser) {
                throw new InternalServerErrorException('Failed to update user profile');
            }

            // Populate profile image
            if (updatedUser) {
                await updatedUser.populate('profileImageFile');
            }

            return sanitizeUserUtils.sanitizeUser(updatedUser);
        } catch (error) {
            this.logger.error(`Failed to update profile for user ${userId}: ${error.message}`);
            throw error;
        }
    }


    private async handleProfileImageUpload(user: any, newProfileImage: Express.Multer.File): Promise<void> {
        try {
            // 1. Delete old profile image file from database
            if (user.profileImage) {
                await this.deleteOldProfileImage(user);
            }

            // 2. Delete old profile image file from file system (if exists)
            await this.deleteOldProfileImageFileFromDisk(user);

            // 3. Validate new profile image
            await this.validateProfileImageFile(newProfileImage);

        } catch (error) {
            this.logger.error(`Failed to handle profile image upload for user ${user._id}:`, error);
            throw new BadRequestException('Failed to update profile image');
        }
    }

    private async deleteOldProfileImage(user: any): Promise<void> {
        try {
            // Deactivate old profile image in database (soft delete)
            if (user.profileImage) {
                await this.fileRepository.update(user.profileImage.toString(), { isActive: false });
            }
        } catch (error) {
            this.logger.warn(`Failed to delete old profile image from database for user ${user._id}:`, error);
            // Continue even if this fails
        }
    }

    private async deleteOldProfileImageFileFromDisk(user: any): Promise<void> {
        try {
            // If user has profileImageFile populated, get the path
            if (user.profileImageFile && user.profileImageFile.path) {
                const oldFilename = user.profileImageFile.path;
                const uploadsDir = path.join(process.cwd(), 'uploads');
                const oldFilePath = path.join(uploadsDir, oldFilename);

                // Check if file exists and delete it
                try {
                    await fs.access(oldFilePath);
                    await fs.unlink(oldFilePath);
                    this.logger.log(`Deleted old profile image file: ${oldFilePath}`);
                } catch (error) {
                    // File doesn't exist or can't be accessed - that's ok
                    this.logger.debug(`Old profile image file not found or already deleted: ${oldFilePath}`);
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to delete old profile image file from disk for user ${user._id}:`, error);
            // Continue even if this fails
        }
    }

    private async validateProfileImageFile(profileImage: Express.Multer.File): Promise<void> {
        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimeTypes.includes(profileImage.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (profileImage.size > maxSize) {
            throw new BadRequestException(
                `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
            );
        }
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const { oldPassword, newPassword, confirmNewPassword } = changePasswordDto;

        // Validate new password strength
        this.validatePasswordStrength(newPassword);

        // Check if new passwords match
        if (newPassword !== confirmNewPassword) {
            throw new BadRequestException('New passwords do not match');
        }

        // Check if new password is same as old password
        if (oldPassword === newPassword) {
            throw new BadRequestException('New password must be different from old password');
        }

        // Get user with password directly
        const user = await this.userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new BadRequestException('Old password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const updatedUser = await this.userRepository.update(userId, { password: hashedPassword });

        if (!updatedUser) {
            throw new InternalServerErrorException('Failed to update password');
        }

        this.logger.log(`Password changed successfully for user ${userId}`);
        return { message: 'Password changed successfully' };
    }

    async deactivateAccount(userId: string, confirmPassword?: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Optional: Require password confirmation for account deactivation
        if (confirmPassword) {
            const userWithPassword = await this.userRepository.findByIdWithPassword(userId);
            if (!userWithPassword) {
                throw new NotFoundException('User not found');
            }

            const isPasswordValid = await bcrypt.compare(confirmPassword, userWithPassword.password);
            if (!isPasswordValid) {
                throw new BadRequestException('Password is incorrect');
            }
        }

        const deactivatedUser = await this.userRepository.update(userId, {
            status: 'inactive',
            deactivatedAt: new Date()
        });

        if (!deactivatedUser) {
            throw new InternalServerErrorException('Failed to deactivate account');
        }

        this.logger.log(`Account deactivated for user ${userId}`);
        return { message: 'Account deactivated successfully' };
    }

    private validatePasswordStrength(password: string): void {
        if (password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters long');
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!strongPasswordRegex.test(password)) {
            throw new BadRequestException(
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            );
        }
    }

    async getUser(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const { password, refreshToken, ...userProfile } = user.toObject();
        return userProfile;
    }
}