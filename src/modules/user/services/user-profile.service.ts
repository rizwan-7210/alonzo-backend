import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { UserRole, UserStatus } from '../../../common/constants/user.constants';
import { FileType, FileCategory, FileSubType } from '../../../common/constants/file.constants';
import { sanitizeUserUtils } from '../../../common/utils/sanitize-user-utils';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { ChangeUserPasswordDto } from '../dto/change-user-password.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UserProfileService {
    private readonly logger = new Logger(UserProfileService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
    ) { }

    async updateProfile(
        userId: string,
        updateProfileDto: UpdateUserProfileDto,
        profileImage?: Express.Multer.File,
    ) {
        try {
            // Fetch user by ID
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Validate user is active
            if (user.status !== UserStatus.ACTIVE) {
                throw new BadRequestException('Your account is not active. Please contact support.');
            }

            // Validate user role is USER
            if (user.role !== UserRole.USER) {
                throw new BadRequestException('Unauthorized');
            }

            let profileImageFileId: Types.ObjectId | undefined;
            let createdProfileImageFile: any = null;

            // Handle profile image upload if provided
            if (profileImage) {
                this.logger.log('📸 [User Profile Update] Starting profile image upload...');
                const result = await this.handleProfileImageUpload(user, profileImage);
                profileImageFileId = result.fileId;
                createdProfileImageFile = result.file;
                this.logger.log('✅ [User Profile Update] Profile image file created:', {
                    fileId: profileImageFileId.toString(),
                    fileName: createdProfileImageFile?.name,
                    subType: createdProfileImageFile?.subType,
                });
            }

            // Build update data
            const updateData: any = {
                firstName: updateProfileDto.firstName.trim(),
                lastName: updateProfileDto.lastName.trim(),
                phone: updateProfileDto.phone.trim(),
            };

            // Include dial_code if provided, otherwise keep existing value
            if (updateProfileDto.dial_code !== undefined) {
                updateData.dial_code = updateProfileDto.dial_code.trim();
            }

            // Include profileImage in update if it was uploaded
            if (profileImageFileId) {
                updateData.profileImage = profileImageFileId;
                this.logger.log('📝 [User Profile Update] Including profileImage in user update:', profileImageFileId.toString());
            }

            this.logger.log('🔄 [User Profile Update] Updating user with data:', {
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                phone: updateData.phone,
                hasProfileImage: !!updateData.profileImage,
            });

            // Update user
            const updatedUser = await this.userRepository.update(userId, updateData);
            if (!updatedUser) {
                throw new InternalServerErrorException('Failed to update user profile');
            }

            this.logger.log('✅ [User Profile Update] User updated. profileImage field:', updatedUser.profileImage?.toString() || 'null');

            // Fetch user with profile image populated
            const userWithProfileImage = await this.userRepository.findByIdWithProfileImage(userId);
            this.logger.log('🔍 [User Profile Update] User fetched. profileImage field:', userWithProfileImage?.profileImage?.toString() || 'null');

            // Get profile image file
            let profileImageFile: any = null;

            // Use the file we just created if available
            if (createdProfileImageFile) {
                profileImageFile = createdProfileImageFile;
            } else if (userWithProfileImage?.profileImage) {
                // Try to get from populated field
                const profileImageObj = (userWithProfileImage as any).profileImageFile;
                if (profileImageObj) {
                    profileImageFile = profileImageObj.toObject ? profileImageObj.toObject() : profileImageObj;
                } else {
                    // Fallback: fetch from file repository
                    profileImageFile = await this.fileRepository.findProfileImageByUserId(userId);
                }
            }

            // Build response using sanitizeUserUtils
            const sanitizedUser = sanitizeUserUtils.sanitizeUser(userWithProfileImage || updatedUser, profileImageFile);

            return {
                message: 'Profile updated successfully',
                data: sanitizedUser,
            };
        } catch (error) {
            this.logger.error(`Error updating user profile ${userId}:`, error);
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update user profile');
        }
    }

    private async handleProfileImageUpload(user: any, newProfileImage: Express.Multer.File): Promise<{ fileId: Types.ObjectId; file: any }> {
        try {
            // Validate profile image file
            await this.validateProfileImageFile(newProfileImage);

            // Deactivate old profile image from database
            await this.fileRepository.deactivateProfileImageByUserId(user._id.toString());

            // Delete old profile image file from disk if exists
            const oldProfileImage = await this.fileRepository.findProfileImageByUserId(user._id.toString());
            if (oldProfileImage) {
                await this.deleteOldProfileImageFileFromDisk(oldProfileImage);
            }

            // Create new profile image file record
            const newProfileImageFile = await this.fileRepository.create({
                name: newProfileImage.filename,
                originalName: newProfileImage.originalname,
                path: newProfileImage.filename,
                mimeType: newProfileImage.mimetype,
                size: newProfileImage.size,
                type: FileType.IMAGE,
                category: FileCategory.PROFILE,
                subType: FileSubType.PROFILE_IMAGE,
                fileableId: new Types.ObjectId(user._id),
                fileableType: 'User',
                uploadedBy: new Types.ObjectId(user._id),
                isActive: true,
            });

            // Return both the file ID and the file object
            return {
                fileId: newProfileImageFile._id as Types.ObjectId,
                file: newProfileImageFile,
            };
        } catch (error) {
            this.logger.error(`Failed to handle profile image upload for user ${user._id}:`, error);
            throw new BadRequestException('Failed to update profile image');
        }
    }

    async changePassword(userId: string, changePasswordDto: ChangeUserPasswordDto) {
        const { currentPassword, password, confirmPassword } = changePasswordDto;

        // Check if new passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException('Password and confirm password do not match');
        }

        // Check if new password is same as current password
        if (currentPassword === password) {
            throw new BadRequestException('New password must be different from current password');
        }

        // Get user with password
        const user = await this.userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Validate user is active
        if (user.status !== UserStatus.ACTIVE) {
            throw new BadRequestException('Your account is not active. Please contact support.');
        }

        // Validate user role is USER
        if (user.role !== UserRole.USER) {
            throw new BadRequestException('Unauthorized');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        const updatedUser = await this.userRepository.update(userId, { password: hashedPassword });

        if (!updatedUser) {
            throw new InternalServerErrorException('Failed to update password');
        }

        this.logger.log(`Password changed successfully for user ${userId}`);
        return { message: 'Password changed successfully' };
    }

    private async deleteOldProfileImageFileFromDisk(oldFile: any): Promise<void> {
        try {
            if (!oldFile.path) {
                return;
            }

            // Extract filename from path
            let filename: string;
            if (oldFile.path.startsWith('/uploads/')) {
                filename = oldFile.path.replace('/uploads/', '');
            } else {
                filename = oldFile.path;
            }

            // Construct full path to the file
            const uploadsDir = path.join(process.cwd(), 'uploads');
            const oldFilePath = path.join(uploadsDir, filename);

            // Check if file exists and delete it
            try {
                await fs.access(oldFilePath);
                await fs.unlink(oldFilePath);
                this.logger.log(`Deleted old profile image file: ${oldFilePath}`);
            } catch (error) {
                // File doesn't exist or can't be accessed - that's ok
                this.logger.debug(`Old profile image file not found or already deleted: ${oldFilePath}`);
            }
        } catch (error) {
            this.logger.warn(`Failed to delete old profile image file from disk:`, error);
            // Continue even if this fails
        }
    }

    private async validateProfileImageFile(profileImage: Express.Multer.File): Promise<void> {
        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedMimeTypes.includes(profileImage.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: jpg, png, jpeg`
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
}
