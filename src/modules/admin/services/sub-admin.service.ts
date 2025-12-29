import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { SubAdminPermissionRepository } from '../../../shared/repositories/sub-admin-permission.repository';
import { UserRole, UserStatus, Permission } from '../../../common/constants/user.constants';
import { CreateSubAdminDto } from '../dto/create-sub-admin.dto';
import { UpdateSubAdminDto } from '../dto/update-sub-admin.dto';
import { SubAdminQueryDto } from '../dto/sub-admin-query.dto';
import { UpdateSubAdminPermissionsDto } from '../dto/update-sub-admin-permissions.dto';
import * as bcrypt from 'bcryptjs';
import { FormatterService } from '../../../shared/services/formatter.service';

@Injectable()
export class SubAdminService {
    private readonly logger = new Logger(SubAdminService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly subAdminPermissionRepository: SubAdminPermissionRepository,
        private readonly formatterService: FormatterService,
    ) { }

    /**
     * Create a new sub-admin
     */
    async createSubAdmin(createSubAdminDto: CreateSubAdminDto) {
        const { email, password, firstName, lastName, phone, address, permissions, rights } = createSubAdminDto;

        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with SUB_ADMIN role
        const user = await this.userRepository.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            role: UserRole.SUB_ADMIN,
            status: UserStatus.ACTIVE,
            phone,
            address,
        });

        // Create permissions if provided
        if (permissions && permissions.length > 0) {
            await this.subAdminPermissionRepository.create({
                subAdminId: user._id as any,
                permissions,
                rights,
            });
        } else if (rights) {
            // If only rights provided without permissions
            await this.subAdminPermissionRepository.create({
                subAdminId: user._id as any,
                permissions: [],
                rights,
            });
        }

        // Fetch the created user with permissions
        const createdUser = await this.userRepository.findById(user._id.toString());
        const userPermissions = await this.subAdminPermissionRepository.findBySubAdminId(user._id.toString());
        const formattedUser = this.formatterService.formatUser(createdUser);

        return {
            user: {
                id: formattedUser.id,
                avatar: formattedUser.avatar || null,
                firstName: formattedUser.firstName,
                lastName: formattedUser.lastName,
                email: formattedUser.email,
                phone: formattedUser.phone || null,
                address: formattedUser.address || null,
                role: formattedUser.role,
                status: formattedUser.status,
                fullName: `${formattedUser.firstName} ${formattedUser.lastName}`,
                createdAt: (createdUser as any).createdAt ? new Date((createdUser as any).createdAt).toISOString() : null,
            },
            permissions: userPermissions ? {
                permissions: userPermissions.permissions,
                rights: userPermissions.rights,
            } : {
                permissions: [],
                rights: null,
            },
        };
    }

    /**
     * Get all sub-admins with filters and pagination
     */
    async getAllSubAdmins(queryDto: SubAdminQueryDto) {
        const { page = 1, limit = 10, status, search, startDate, endDate } = queryDto;

        // Build filter conditions
        const conditions: any = {
            role: UserRole.SUB_ADMIN,
            deletedAt: null, // Exclude soft-deleted users
        };

        if (status) {
            conditions.status = status;
        }

        // Search by name or email
        if (search) {
            conditions.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            conditions.createdAt = {};
            if (startDate) {
                conditions.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of day (23:59:59.999)
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                conditions.createdAt.$lte = endDateTime;
            }
        }

        const result = await this.userRepository.paginate(
            page,
            limit,
            conditions,
            {
                sort: { createdAt: -1 },
            }
        );

        // Format the response
        const formattedData = await Promise.all(
            result.data.map(async (user: any, index: number) => {
                const formattedUser = this.formatterService.formatUser(user);
                const permissions = await this.subAdminPermissionRepository.findBySubAdminId(user._id.toString());

                return {
                    user: {
                        id: formattedUser.id,
                        avatar: formattedUser.avatar || null,
                        firstName: formattedUser.firstName,
                        lastName: formattedUser.lastName,
                        email: formattedUser.email,
                        phone: formattedUser.phone || null,
                        address: formattedUser.address || null,
                        role: formattedUser.role,
                        status: formattedUser.status,
                        fullName: `${formattedUser.firstName} ${formattedUser.lastName}`,
                        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
                    },
                    permissions: permissions ? {
                        permissions: permissions.permissions,
                        rights: permissions.rights,
                    } : {
                        permissions: [],
                        rights: null,
                    },
                };
            })
        );

        return {
            data: formattedData,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
        };
    }

    /**
     * Get sub-admin by ID with permissions
     */
    async getSubAdminById(subAdminId: string) {
        const user = await this.userRepository.findById(subAdminId);
        if (!user) {
            throw new NotFoundException('Sub-admin not found');
        }

        if (user.role !== UserRole.SUB_ADMIN) {
            throw new BadRequestException('User is not a sub-admin');
        }

        // Populate avatar file
        await user.populate({
            path: 'avatarFile',
            select: 'name path url mimeType size',
        });

        const permissions = await this.subAdminPermissionRepository.findBySubAdminId(subAdminId);

        const formattedUser = this.formatterService.formatUser(user);

        return {
            user: {
                id: formattedUser.id,
                avatar: formattedUser.avatar || null,
                firstName: formattedUser.firstName,
                lastName: formattedUser.lastName,
                email: formattedUser.email,
                phone: formattedUser.phone || null,
                address: formattedUser.address || null,
                role: formattedUser.role,
                status: formattedUser.status,
                fullName: `${formattedUser.firstName} ${formattedUser.lastName}`,
                createdAt: (user as any).createdAt ? new Date((user as any).createdAt).toISOString() : null,
            },
            permissions: permissions ? {
                permissions: permissions.permissions,
                rights: permissions.rights,
            } : {
                permissions: [],
                rights: null,
            },
        };
    }

    /**
     * Update sub-admin
     */
    async updateSubAdmin(subAdminId: string, updateSubAdminDto: UpdateSubAdminDto) {
        const user = await this.userRepository.findById(subAdminId);
        if (!user) {
            throw new NotFoundException('Sub-admin not found');
        }

        if (user.role !== UserRole.SUB_ADMIN) {
            throw new BadRequestException('User is not a sub-admin');
        }

        const { email, password, firstName, lastName, phone, address, status, permissions, rights } = updateSubAdminDto;

        // Check if email is being changed and if it already exists
        if (email && email.toLowerCase() !== user.email.toLowerCase()) {
            const existingUser = await this.userRepository.findByEmail(email);
            if (existingUser) {
                throw new ConflictException('Email already exists');
            }
        }

        // Build update object
        const updateData: any = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email) updateData.email = email.toLowerCase();
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (status) updateData.status = status;

        // Hash password if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update user
        const updatedUser = await this.userRepository.update(subAdminId, updateData);

        // Update permissions if provided
        if (permissions !== undefined || rights !== undefined) {
            const currentPermissions = await this.subAdminPermissionRepository.findBySubAdminId(subAdminId);
            const newPermissions = permissions !== undefined ? permissions : (currentPermissions?.permissions || []);
            const newRights = rights !== undefined ? rights : (currentPermissions?.rights || null);

            await this.subAdminPermissionRepository.updatePermissions(subAdminId, newPermissions);
            if (newRights !== null) {
                await this.subAdminPermissionRepository.updateRights(subAdminId, newRights);
            }
        }

        // Fetch updated user with permissions
        const finalUser = await this.userRepository.findById(subAdminId);
        const userPermissions = await this.subAdminPermissionRepository.findBySubAdminId(subAdminId);
        const formattedUser = this.formatterService.formatUser(finalUser);

        return {
            user: {
                id: formattedUser.id,
                avatar: formattedUser.avatar || null,
                firstName: formattedUser.firstName,
                lastName: formattedUser.lastName,
                email: formattedUser.email,
                phone: formattedUser.phone || null,
                address: formattedUser.address || null,
                role: formattedUser.role,
                status: formattedUser.status,
                fullName: `${formattedUser.firstName} ${formattedUser.lastName}`,
                createdAt: (finalUser as any).createdAt ? new Date((finalUser as any).createdAt).toISOString() : null,
            },
            permissions: userPermissions ? {
                permissions: userPermissions.permissions,
                rights: userPermissions.rights,
            } : {
                permissions: [],
                rights: null,
            },
        };
    }

    /**
     * Update sub-admin permissions
     */
    async updateSubAdminPermissions(subAdminId: string, updatePermissionsDto: UpdateSubAdminPermissionsDto) {
        const user = await this.userRepository.findById(subAdminId);
        if (!user) {
            throw new NotFoundException('Sub-admin not found');
        }

        if (user.role !== UserRole.SUB_ADMIN) {
            throw new BadRequestException('User is not a sub-admin');
        }

        const { permissions, rights } = updatePermissionsDto;

        // Update permissions
        await this.subAdminPermissionRepository.updatePermissions(subAdminId, permissions);

        if (rights !== undefined) {
            await this.subAdminPermissionRepository.updateRights(subAdminId, rights);
        }

        // Fetch updated permissions
        const updatedPermissions = await this.subAdminPermissionRepository.findBySubAdminId(subAdminId);

        return {
            permissions: updatedPermissions ? {
                permissions: updatedPermissions.permissions,
                rights: updatedPermissions.rights,
            } : {
                permissions: [],
                rights: null,
            },
        };
    }

    /**
     * Delete sub-admin (soft delete)
     */
    async deleteSubAdmin(subAdminId: string) {
        const user = await this.userRepository.findById(subAdminId);
        if (!user) {
            throw new NotFoundException('Sub-admin not found');
        }

        if (user.role !== UserRole.SUB_ADMIN) {
            throw new BadRequestException('User is not a sub-admin');
        }

        // Soft delete user
        await this.userRepository.softDelete(subAdminId);

        return {
            message: 'Sub-admin deleted successfully',
        };
    }
}

