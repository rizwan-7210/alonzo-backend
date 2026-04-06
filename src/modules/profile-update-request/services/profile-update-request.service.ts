import {
    Injectable,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ProfileUpdateRequestRepository } from '../../../shared/repositories/profile-update-request.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { FileService } from '../../file/services/file.service';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { NotificationService } from '../../notification/services/notification.service';
import { CreateProfileUpdateRequestDto } from '../dto/create-profile-update-request.dto';
import { RejectProfileUpdateRequestDto } from '../dto/reject-profile-update-request.dto';
import { ListProfileUpdateRequestsDto } from '../dto/list-profile-update-requests.dto';
import { ProfileUpdateRequestStatus } from '../../../common/constants/user.constants';
import { NotificationType } from '../../../shared/schemas/notification.schema';
import { Types } from 'mongoose';
import { FileCategory, FileSubType } from '../../../common/constants/file.constants';

@Injectable()
export class ProfileUpdateRequestService {
    private readonly logger = new Logger(ProfileUpdateRequestService.name);

    constructor(
        private readonly profileUpdateRequestRepository: ProfileUpdateRequestRepository,
        private readonly userRepository: UserRepository,
        private readonly fileService: FileService,
        private readonly fileRepository: FileRepository,
        private readonly notificationService: NotificationService,
    ) { }

    async createRequest(
        userId: string,
        createDto: CreateProfileUpdateRequestDto,
        profileImage?: Express.Multer.File,
        pharmacyLicense?: Express.Multer.File,
        registrationCertificate?: Express.Multer.File,
    ) {
        // Check if user exists and is a vendor
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const fields: any = {
            firstName: createDto.firstName,
            phone: createDto.phone,
            dial_code: createDto.dial_code,
            categoryId: createDto.categoryId ? new Types.ObjectId(createDto.categoryId) : undefined,
            address: createDto.address,
            location: createDto.location,
            website: createDto.website,
            status: ProfileUpdateRequestStatus.PENDING,
        };

        const existingPendingRequest = await this.profileUpdateRequestRepository.findPendingByUserId(userId);

        let request: any;
        let replaceExistingFiles = false;

        if (existingPendingRequest) {
            // Merge new values into the existing pending request instead of rejecting
            request = await this.profileUpdateRequestRepository.update(
                existingPendingRequest._id.toString(),
                { ...fields, rejectionReason: null },
            );
            if (!request) {
                throw new InternalServerErrorException('Failed to update pending profile update request');
            }
            replaceExistingFiles = true;
            this.logger.log(`Updated pending profile update request ${request._id} for user ${userId}`);
        } else {
            const requestData = {
                ...fields,
                userId: new Types.ObjectId(userId),
            };
            request = await this.profileUpdateRequestRepository.create(requestData);
        }

        const requestId = request._id.toString();

        await this.uploadRequestAttachments(
            requestId,
            userId,
            user,
            profileImage,
            pharmacyLicense,
            registrationCertificate,
            replaceExistingFiles,
        );

        try {
            const requestWithRelations = await this.profileUpdateRequestRepository.findByIdWithRelations(requestId);
            return requestWithRelations || request;
        } catch (error) {
            this.logger.warn(`Failed to populate relations for request ${requestId}:`, error);
            return request;
        }
    }

    private async uploadRequestAttachments(
        requestId: string,
        userId: string,
        user: any,
        profileImage: Express.Multer.File | undefined,
        pharmacyLicense: Express.Multer.File | undefined,
        registrationCertificate: Express.Multer.File | undefined,
        replaceExisting: boolean,
    ): Promise<void> {
        const FILEABLE = 'ProfileUpdateRequest';

        if (profileImage) {
            try {
                if (replaceExisting) {
                    await this.fileRepository.removeByEntityAndSubType(
                        requestId,
                        FILEABLE,
                        FileSubType.PROFILE_IMAGE,
                    );
                }
                const profileImageFile = await this.fileService.uploadFile(
                    profileImage,
                    requestId,
                    FILEABLE,
                    FileCategory.PROFILE,
                    undefined,
                    userId,
                    user,
                );
                await this.fileRepository.update(profileImageFile._id.toString(), {
                    subType: FileSubType.PROFILE_IMAGE,
                } as any);
            } catch (error: any) {
                this.logger.error(`Failed to upload profile image: ${error.message}`, error.stack);
                throw new BadRequestException(`Failed to upload profile image: ${error.message}`);
            }
        }

        if (pharmacyLicense) {
            try {
                if (replaceExisting) {
                    await this.fileRepository.removeByEntityAndSubType(
                        requestId,
                        FILEABLE,
                        FileSubType.PHARMACY_LICENSE,
                    );
                }
                const licenseFile = await this.fileService.uploadFile(
                    pharmacyLicense,
                    requestId,
                    FILEABLE,
                    FileCategory.DOCUMENT,
                    undefined,
                    userId,
                    user,
                );
                await this.fileRepository.update(licenseFile._id.toString(), {
                    subType: FileSubType.PHARMACY_LICENSE,
                } as any);
            } catch (error: any) {
                this.logger.error(`Failed to upload pharmacy license: ${error.message}`, error.stack);
                throw new BadRequestException(`Failed to upload pharmacy license: ${error.message}`);
            }
        }

        if (registrationCertificate) {
            try {
                if (replaceExisting) {
                    await this.fileRepository.removeByEntityAndSubType(
                        requestId,
                        FILEABLE,
                        FileSubType.REGISTRATION_CERTIFICATE,
                    );
                }
                const certFile = await this.fileService.uploadFile(
                    registrationCertificate,
                    requestId,
                    FILEABLE,
                    FileCategory.DOCUMENT,
                    undefined,
                    userId,
                    user,
                );
                await this.fileRepository.update(certFile._id.toString(), {
                    subType: FileSubType.REGISTRATION_CERTIFICATE,
                } as any);
            } catch (error: any) {
                this.logger.error(`Failed to upload registration certificate: ${error.message}`, error.stack);
                throw new BadRequestException(`Failed to upload registration certificate: ${error.message}`);
            }
        }
    }

    async listRequests(listDto: ListProfileUpdateRequestsDto) {
        const { page = 1, limit = 10, status } = listDto;

        const conditions: any = {};
        if (status) {
            conditions.status = status;
        }

        const result = await this.profileUpdateRequestRepository.paginate(page, limit, conditions, {
            populate: [
                { path: 'user', select: 'firstName lastName email phone' },
                { path: 'category', select: 'title' },
                { path: 'profileImage' },
                { path: 'pharmacyLicense' },
                { path: 'registrationCertificate' },
            ],
        });

        return result;
    }

    async getRequestById(id: string) {
        const request = await this.profileUpdateRequestRepository.findByIdWithRelations(id);
        if (!request) {
            throw new NotFoundException('Profile update request not found');
        }
        return request;
    }

    async approveRequest(id: string) {
        const request = await this.profileUpdateRequestRepository.findByIdWithRelations(id);
        if (!request) {
            throw new NotFoundException('Profile update request not found');
        }

        if (request.status !== ProfileUpdateRequestStatus.PENDING) {
            throw new BadRequestException('Only pending requests can be approved');
        }

        // Get user
        const user = await this.userRepository.findById(request.userId.toString());
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Prepare update data
        const updateData: any = {
            firstName: request.firstName,
            phone: request.phone,
        };

        if (request.dial_code) {
            updateData.dial_code = request.dial_code;
        }

        if (request.categoryId) {
            updateData.categoryId = request.categoryId;
        }

        if (request.address) {
            updateData.address = request.address;
        }

        if (request.location) {
            updateData.location = request.location;
        }

        if (request.website) {
            updateData.website = request.website;
        }

        // Handle profile image if exists
        const requestWithFiles = request as any;
        if (requestWithFiles.profileImage) {
            // Get the file from the request
            const profileImageFile = await this.fileRepository.findById(requestWithFiles.profileImage._id.toString());
            if (profileImageFile) {
                // Update the file to point to User instead of ProfileUpdateRequest
                await this.fileRepository.update(profileImageFile._id.toString(), {
                    fileableId: new Types.ObjectId(request.userId.toString()),
                    fileableType: 'User',
                } as any);
                // Update user's profileImage reference
                updateData.profileImage = profileImageFile._id;
            }
        }

        // Update user
        const updatedUser = await this.userRepository.update(request.userId.toString(), updateData);
        if (!updatedUser) {
            throw new InternalServerErrorException('Failed to update user profile');
        }

        // Update request status
        const updatedRequest = await this.profileUpdateRequestRepository.update(id, {
            status: ProfileUpdateRequestStatus.APPROVED,
        });

        if (!updatedRequest) {
            throw new InternalServerErrorException('Failed to update request status');
        }

        // Send notification to user
        await this.notificationService.createUserNotification({
            title: 'Profile Update Approved',
            message: 'Your profile update request has been approved and your profile has been updated.',
            type: NotificationType.USER_ACTION,
            recipient: request.userId.toString(),
            data: {
                requestId: id,
                status: ProfileUpdateRequestStatus.APPROVED,
            },
        });

        // Fetch updated request with relations
        return this.profileUpdateRequestRepository.findByIdWithRelations(id);
    }

    async rejectRequest(id: string, rejectDto: RejectProfileUpdateRequestDto) {
        const request = await this.profileUpdateRequestRepository.findByIdWithRelations(id);
        if (!request) {
            throw new NotFoundException('Profile update request not found');
        }

        if (request.status !== ProfileUpdateRequestStatus.PENDING) {
            throw new BadRequestException('Only pending requests can be rejected');
        }

        // Update request status and rejection reason
        const updatedRequest = await this.profileUpdateRequestRepository.update(id, {
            status: ProfileUpdateRequestStatus.REJECTED,
            rejectionReason: rejectDto.rejectionReason,
        });

        if (!updatedRequest) {
            throw new InternalServerErrorException('Failed to update request status');
        }

        // Send notification to user
        await this.notificationService.createUserNotification({
            title: 'Profile Update Rejected',
            message: `Your profile update request has been rejected. Reason: ${rejectDto.rejectionReason}`,
            type: NotificationType.USER_ACTION,
            recipient: request.userId.toString(),
            data: {
                requestId: id,
                status: ProfileUpdateRequestStatus.REJECTED,
                rejectionReason: rejectDto.rejectionReason,
            },
        });

        // Fetch updated request with relations
        return this.profileUpdateRequestRepository.findByIdWithRelations(id);
    }
}

