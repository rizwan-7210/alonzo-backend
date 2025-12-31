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
import { FileCategory, FileType, FileSubType } from '../../../common/constants/file.constants';
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
        profileImage?: Express.Multer.File
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

            // Handle profile image upload if provided
            let profileImageFileId: Types.ObjectId | undefined;
            let createdProfileImageFile: any = null;
            if (profileImage) {
                console.log('📸 [Admin Profile Update] Starting profile image upload...');
                const result = await this.handleProfileImageUpload(admin, profileImage);
                profileImageFileId = result.fileId;
                createdProfileImageFile = result.file; // Store the created file for later use
                console.log('✅ [Admin Profile Update] Profile image file created:', {
                    fileId: profileImageFileId.toString(),
                    fileName: createdProfileImageFile?.name,
                    subType: createdProfileImageFile?.subType,
                });
            }

            // Update admin profile (include profileImage if it was uploaded)
            const updateData: any = {
                firstName: updateProfileDto.firstName,
                lastName: updateProfileDto.lastName,
                ...(updateProfileDto.email && { email: updateProfileDto.email }),
                ...(updateProfileDto.phone && { phone: updateProfileDto.phone }),
                ...(updateProfileDto.address && { address: updateProfileDto.address }),
            };

            // Include profileImage in update if it was uploaded
            if (profileImageFileId) {
                updateData.profileImage = profileImageFileId;
                console.log('📝 [Admin Profile Update] Including profileImage in user update:', profileImageFileId.toString());
            }

            console.log('🔄 [Admin Profile Update] Updating user with data:', {
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                hasProfileImage: !!updateData.profileImage,
            });

            const updatedAdmin = await this.userRepository.update(adminId, updateData);

            if (!updatedAdmin) {
                throw new InternalServerErrorException('Failed to update admin profile');
            }

            console.log('✅ [Admin Profile Update] User updated. profileImage field:', updatedAdmin.profileImage?.toString() || 'null');

            // Fetch user with profileImage populated from files table
            const userWithProfileImage = await this.userRepository.findByIdWithProfileImage(adminId);
            console.log('🔍 [Admin Profile Update] User fetched. profileImage field:', userWithProfileImage?.profileImage?.toString() || 'null');

            // Try multiple approaches to get the profileImage file
            let profileImageFile: any = null;

            // Approach 1: Use the file we just created (most reliable)
            if (createdProfileImageFile) {
                profileImageFile = createdProfileImageFile;
                console.log('✅ [Admin Profile Update] Using created file object:', {
                    fileId: profileImageFile._id?.toString(),
                    path: profileImageFile.path,
                    subType: profileImageFile.subType,
                });
            } else {
                // Approach 2: Query file directly using fileableId and subType
                console.log('🔍 [Admin Profile Update] Querying file by fileableId and subType...');
                profileImageFile = await this.fileRepository.findProfileImageByUserId(adminId);
                if (profileImageFile) {
                    console.log('✅ [Admin Profile Update] File found by query:', {
                        fileId: profileImageFile._id?.toString(),
                        path: profileImageFile.path,
                        subType: profileImageFile.subType,
                    });
                } else {
                    console.log('⚠️ [Admin Profile Update] File NOT found by query');
                }
            }

            // Approach 3: If still not found and user has profileImage field, try virtual relation
            if (!profileImageFile && userWithProfileImage && userWithProfileImage.profileImage) {
                console.log('🔍 [Admin Profile Update] Trying virtual relation population...');
                try {
                    await userWithProfileImage.populate({
                        path: 'profileImageFile',
                        select: 'name path mimeType size type subType createdAt',
                    });
                    const userAny = userWithProfileImage as any;
                    profileImageFile = userAny.profileImageFile;
                    if (profileImageFile) {
                        console.log('✅ [Admin Profile Update] File found via virtual relation:', {
                            fileId: profileImageFile._id?.toString(),
                            path: profileImageFile.path,
                        });
                    } else {
                        console.log('⚠️ [Admin Profile Update] File NOT found via virtual relation');
                    }
                } catch (error) {
                    console.log('❌ [Admin Profile Update] Failed to populate via virtual relation:', error.message);
                    this.logger.warn(`Failed to populate profileImageFile via virtual relation: ${error.message}`);
                }
            }

            // Attach the profileImageFile to the user object for sanitization
            // We need to ensure it's accessible when toObject() is called
            if (userWithProfileImage && profileImageFile) {
                const userAny = userWithProfileImage as any;
                userAny.profileImageFile = profileImageFile;

                // Mark the document as modified to ensure virtuals are included
                userWithProfileImage.markModified('profileImageFile');

                console.log('✅ [Admin Profile Update] File attached to user object');
                console.log('🔍 [Admin Profile Update] Verifying attachment - profileImageFile exists:', !!userAny.profileImageFile);
            } else {
                console.log('⚠️ [Admin Profile Update] File NOT attached. userWithProfileImage:', !!userWithProfileImage, 'profileImageFile:', !!profileImageFile);
            }

            // Pass the user object with profileImageFile attached
            const userToSanitize = userWithProfileImage || updatedAdmin;
            const sanitizedUser = sanitizeUserUtils.sanitizeUser(userToSanitize, profileImageFile);
            console.log('📤 [Admin Profile Update] Final sanitized user. profileImage:', sanitizedUser?.profileImage ? 'EXISTS' : 'NULL');

            return sanitizedUser;
        } catch (error) {
            this.logger.error(`Failed to update profile for admin ${adminId}: ${error.message}`);
            throw error;
        }
    }

    async changePassword(adminId: string, changePasswordDto: ChangeAdminPasswordDto) {
        const { currentPassword, password, confirmPassword } = changePasswordDto;

        // Check if new passwords match
        if (password !== confirmPassword) {
            throw new BadRequestException('Password and confirm password do not match');
        }

        // Check if new password is same as current password
        if (currentPassword === password) {
            throw new BadRequestException('New password must be different from current password');
        }

        // Get admin with password
        const admin = await this.userRepository.findByIdWithPassword(adminId);
        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

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

        await this.handleProfileImageUpload(admin, file);

        // Get updated user with profile image
        const updatedAdmin = await this.userRepository.findByIdWithProfileImage(adminId);
        if (updatedAdmin) {
            await updatedAdmin.populate('profileImageFile');
        }

        const sanitizedUser = sanitizeUserUtils.sanitizeUser(updatedAdmin || admin);

        return {
            message: 'Profile image uploaded successfully',
            profileImage: sanitizedUser?.profileImage || null
        };
    }

    private async handleProfileImageUpload(admin: any, newProfileImage: Express.Multer.File): Promise<{ fileId: Types.ObjectId; file: any }> {
        try {
            // 1. Validate profile image file
            await this.validateProfileImageFile(newProfileImage);

            // 2. Deactivate old profile image from database
            await this.fileRepository.deactivateProfileImageByUserId(admin._id.toString());

            // 3. Delete old profile image file from disk if exists
            const oldProfileImage = await this.fileRepository.findProfileImageByUserId(admin._id.toString());
            if (oldProfileImage) {
                await this.deleteOldProfileImageFileFromDisk(oldProfileImage);
            }

            // 4. Create new profile image file record
            const newProfileImageFile = await this.fileRepository.create({
                name: newProfileImage.filename,
                originalName: newProfileImage.originalname,
                path: newProfileImage.filename,
                mimeType: newProfileImage.mimetype,
                size: newProfileImage.size,
                type: FileType.IMAGE,
                category: FileCategory.PROFILE,
                subType: FileSubType.PROFILE_IMAGE,
                fileableId: new Types.ObjectId(admin._id),
                fileableType: 'User',
                uploadedBy: new Types.ObjectId(admin._id),
                isActive: true,
            });

            // 5. Return both the file ID and the file object
            return {
                fileId: newProfileImageFile._id as Types.ObjectId,
                file: newProfileImageFile,
            };

        } catch (error) {
            this.logger.error(`Failed to handle profile image upload for admin ${admin._id}:`, error);
            throw new BadRequestException('Failed to update profile image');
        }
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
}
