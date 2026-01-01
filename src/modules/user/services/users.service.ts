import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { FileRepository } from '../../../shared/repositories/file.repository';
import { ListUsersDto } from '../dto/list-users.dto';
import { VendorActionDto } from '../dto/vendor-action.dto';
import { UserRole, AccountStatus, UserStatus } from '../../../common/constants/user.constants';
import { FileSubType } from '../../../common/constants/file.constants';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly fileRepository: FileRepository,
    ) { }

    /**
     * List users (role = USER)
     */
    async listUsers(queryDto: ListUsersDto) {
        try {
            const page = queryDto.page;
            const limit = queryDto.limit;

            const result = await this.usersRepository.findUsersWithPagination(page, limit);

            return {
                message: 'Users retrieved successfully',
                data: {
                    users: result.data,
                    pagination: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        hasNext: result.hasNext,
                        hasPrev: result.hasPrev,
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error retrieving users:', error);
            throw new InternalServerErrorException('Failed to retrieve users');
        }
    }

    /**
     * List approved vendors
     */
    async listApprovedVendors(queryDto: ListUsersDto) {
        try {
            const page = queryDto.page;
            const limit = queryDto.limit;

            const result = await this.usersRepository.findApprovedVendorsWithPagination(page, limit);

            return {
                message: 'Approved vendors retrieved successfully',
                data: {
                    vendors: result.data,
                    pagination: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        hasNext: result.hasNext,
                        hasPrev: result.hasPrev,
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error retrieving approved vendors:', error);
            throw new InternalServerErrorException('Failed to retrieve approved vendors');
        }
    }

    /**
     * List vendor requests (pending or rejected)
     */
    async listVendorRequests(queryDto: ListUsersDto) {
        try {
            const page = queryDto.page;
            const limit = queryDto.limit;

            const result = await this.usersRepository.findVendorRequestsWithPagination(page, limit);

            // Format vendors with categoryId as object
            const formattedVendors = result.data.map((vendor: any) => {
                const vendorObj = vendor.toObject ? vendor.toObject() : vendor;
                const formattedVendor: any = { ...vendorObj };
                
                // Format categoryId as object with _id and title
                if (vendorObj.categoryId) {
                    formattedVendor.categoryId = {
                        _id: vendorObj.categoryId._id?.toString() || vendorObj.categoryId.id,
                        title: vendorObj.categoryId.title,
                    };
                }
                
                return formattedVendor;
            });

            return {
                message: 'Vendor requests retrieved successfully',
                data: {
                    vendors: formattedVendors,
                    pagination: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        hasNext: result.hasNext,
                        hasPrev: result.hasPrev,
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error retrieving vendor requests:', error);
            throw new InternalServerErrorException('Failed to retrieve vendor requests');
        }
    }

    /**
     * Build complete URL for file path
     */
    private buildFileUrl(path: string): string {
        if (!path) return '';
        
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        // If path already includes /uploads/
        if (path.startsWith('/uploads/')) {
            return `${cleanBaseUrl}${path}`;
        } else if (path.startsWith('http')) {
            // Already a full URL
            return path;
        } else {
            // Add /uploads/ prefix
            const cleanPath = path.replace(/^\/+/, '');
            return `${cleanBaseUrl}/uploads/${cleanPath}`;
        }
    }

    /**
     * Format file object with path_link
     */
    private formatFileObject(file: any): any {
        if (!file) return null;
        
        const fileObj = file.toObject ? file.toObject() : file;
        const fileId = (fileObj as any)._id?.toString() || (fileObj as any).id;
        const filePath = fileObj.path || '';
        
        return {
            id: fileId,
            path: filePath,
            path_link: this.buildFileUrl(filePath),
            name: fileObj.name,
            originalName: fileObj.originalName,
            mimeType: fileObj.mimeType,
            size: fileObj.size,
            type: fileObj.type,
            category: fileObj.category,
            subType: fileObj.subType,
            createdAt: (fileObj as any).createdAt,
        };
    }

    /**
     * Get user/vendor details with files
     */
    async getUserDetails(id: string) {
        try {
            const user = await this.usersRepository.findByIdWithFiles(id);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Format response
            const userObj = user.toObject ? user.toObject() : user;
            const response: any = {
                ...userObj,
            };

            // Format profileImage as object with path_link
            if (userObj.profileImage) {
                response.profileImage = this.formatFileObject(userObj.profileImage);
            } else {
                response.profileImage = null;
            }

            // Get pharmacyLicense and registrationCertificate (if vendor)
            let pharmacyLicense: any = null;
            let registrationCertificate: any = null;

            if (user.role === UserRole.VENDOR) {
                const userId = (user as any)._id?.toString() || (user as any).id;
                if (userId) {
                    // Fetch files using findByEntity - it handles ObjectId conversion
                    const userFiles = await this.fileRepository.findByEntity(userId, 'User');

                    // Find pharmacy license file
                    const licenseFile = userFiles.find(
                        (file) => {
                            const fileObj = file.toObject ? file.toObject() : file;
                            const fileSubType = fileObj.subType;
                            const isActive = fileObj.isActive !== false; // Default to true if not set
                            return fileSubType === FileSubType.PHARMACY_LICENSE && isActive;
                        }
                    );

                    // Find registration certificate file
                    const certificateFile = userFiles.find(
                        (file) => {
                            const fileObj = file.toObject ? file.toObject() : file;
                            const fileSubType = fileObj.subType;
                            const isActive = fileObj.isActive !== false; // Default to true if not set
                            return fileSubType === FileSubType.REGISTRATION_CERTIFICATE && isActive;
                        }
                    );

                    if (licenseFile) {
                        pharmacyLicense = this.formatFileObject(licenseFile);
                    }

                    if (certificateFile) {
                        registrationCertificate = this.formatFileObject(certificateFile);
                    }
                }
            }

            response.pharmacyLicense = pharmacyLicense;
            response.registrationCertificate = registrationCertificate;
            
            // Format categoryId as object with _id and title
            if (userObj.categoryId) {
                response.categoryId = {
                    _id: userObj.categoryId._id?.toString() || userObj.categoryId.id,
                    title: userObj.categoryId.title,
                };
            }

            return {
                message: 'User details retrieved successfully',
                data: response,
            };
        } catch (error) {
            this.logger.error(`Error retrieving user details ${id}:`, error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve user details');
        }
    }

    /**
     * Approve or reject vendor
     */
    async updateVendorStatus(id: string, vendorActionDto: VendorActionDto) {
        try {
            // Validate user exists and is a vendor
            const user = await this.usersRepository.findById(id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (user.role !== UserRole.VENDOR) {
                throw new BadRequestException('User is not a vendor');
            }

            // Validate rejection reason
            if (vendorActionDto.accountStatus === AccountStatus.REJECTED) {
                if (!vendorActionDto.rejectionReason || vendorActionDto.rejectionReason.trim() === '') {
                    throw new BadRequestException('Rejection reason is required when rejecting a vendor');
                }
            }

            if (vendorActionDto.accountStatus === AccountStatus.APPROVED) {
                if (vendorActionDto.rejectionReason) {
                    throw new BadRequestException('Rejection reason must be null when approving a vendor');
                }
            }

            // Update account status
            const rejectionReason =
                vendorActionDto.accountStatus === AccountStatus.REJECTED
                    ? vendorActionDto.rejectionReason
                    : undefined;

            const updatedUser = await this.usersRepository.updateAccountStatus(
                id,
                vendorActionDto.accountStatus,
                rejectionReason,
            );

            if (!updatedUser) {
                throw new NotFoundException('User not found');
            }

            this.logger.log(
                `Vendor ${id} ${vendorActionDto.accountStatus === AccountStatus.APPROVED ? 'approved' : 'rejected'}`,
            );

            // Format response similar to getUserDetails
            const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
            const response: any = {
                ...userObj,
            };

            // Format profileImage as object with path_link
            if (userObj.profileImage) {
                response.profileImage = this.formatFileObject(userObj.profileImage);
            } else {
                response.profileImage = null;
            }

            // Format categoryId as object with _id and title if it exists
            if (userObj.categoryId) {
                const categoryObj = userObj.categoryId.toObject ? userObj.categoryId.toObject() : userObj.categoryId;
                response.categoryId = {
                    _id: categoryObj._id?.toString() || categoryObj.id,
                    title: categoryObj.title,
                };
            }

            return {
                message: `Vendor ${vendorActionDto.accountStatus === AccountStatus.APPROVED ? 'approved' : 'rejected'} successfully`,
                data: response,
            };
        } catch (error) {
            this.logger.error(`Error updating vendor status ${id}:`, error);
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update vendor status');
        }
    }

    /**
     * Toggle user status (ACTIVE/INACTIVE)
     */
    async toggleUserStatus(id: string) {
        try {
            const user = await this.usersRepository.findById(id);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            const updatedUser = await this.usersRepository.toggleUserStatus(id);

            if (!updatedUser) {
                throw new NotFoundException('User not found');
            }

            const newStatus = updatedUser.status;
            this.logger.log(`User ${id} status toggled to ${newStatus}`);

            // Format response similar to getUserDetails
            const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
            const response: any = {
                ...userObj,
            };

            // Format profileImage as object with path_link
            if (userObj.profileImage) {
                response.profileImage = this.formatFileObject(userObj.profileImage);
            } else {
                response.profileImage = null;
            }

            // Format categoryId as object with _id and title if it exists
            if (userObj.categoryId) {
                const categoryObj = userObj.categoryId.toObject ? userObj.categoryId.toObject() : userObj.categoryId;
                response.categoryId = {
                    _id: categoryObj._id?.toString() || categoryObj.id,
                    title: categoryObj.title,
                };
            }

            return {
                message: `User ${newStatus === UserStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
                data: response,
            };
        } catch (error) {
            this.logger.error(`Error toggling user status ${id}:`, error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to toggle user status');
        }
    }
}

