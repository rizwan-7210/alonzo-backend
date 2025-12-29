import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole, UserStatus } from 'src/common/constants/user.constants';
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../dto/create-user.dto';
@Injectable()
export class UserManagementService {
    constructor(private readonly userRepository: UserRepository) { }

    async createUser(createUserDto: CreateUserDto) {
        const { email, password, firstName, lastName, role, status, phone, address } = createUserDto;

        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await this.userRepository.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            role: role || UserRole.USER,
            status: status || UserStatus.ACTIVE,
            phone,
            address,
        });

        return this.sanitizeUser(user);
    }

    async getAllUsers(page: number = 1, limit: number = 10, search?: string, role?: UserRole, status?: UserStatus) {
        let conditions: any = {
            status: { $ne: 'deleted' } // Exclude soft-deleted users
        };

        // Filter by status if provided
        if (status) {
            conditions.status = status;
        }

        // Filter by role if provided
        if (role) {
            conditions.role = role;
        } else {
            conditions.role = UserRole.USER; // Default to regular users
        }

        if (search) {
            conditions.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }

        const result = await this.userRepository.paginate(page, limit, conditions);

        // Sanitize each user in the paginated result
        result.data = result.data.map(user => this.sanitizeUser(user));

        return result;
    }

    async getUserById(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this.sanitizeUser(user);
    }

    async updateUser(userId: string, updateData: any) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // If email is being updated, check for duplicates
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await this.userRepository.findByEmail(updateData.email);
            if (existingUser && existingUser._id.toString() !== userId) {
                throw new ConflictException('Email already in use');
            }
            updateData.email = updateData.email.toLowerCase();
        }

        const updatedUser = await this.userRepository.update(userId, updateData);
        if (!updatedUser) {
            throw new NotFoundException('User not found after update');
        }

        return this.sanitizeUser(updatedUser);
    }

    async deleteUser(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Soft delete
        const deletedUser = await this.userRepository.softDelete(userId);
        return this.sanitizeUser(deletedUser);
    }

    async changeUserStatus(userId: string, status: UserStatus) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const updatedUser = await this.userRepository.update(userId, { status });
        return this.sanitizeUser(updatedUser);
    }

    // ADD THESE MISSING METHODS:

    async getUserStats() {
        const [totalUsers, activeUsers, inactiveUsers, adminUsers, regularUsers] = await Promise.all([
            this.userRepository.count({ status: { $ne: 'deleted' } }),
            this.userRepository.count({ status: UserStatus.ACTIVE }),
            this.userRepository.count({ status: UserStatus.INACTIVE }),
            this.userRepository.count({ role: UserRole.ADMIN, status: { $ne: 'deleted' } }),
            this.userRepository.count({ role: UserRole.USER, status: { $ne: 'deleted' } }),
        ]);

        return {
            total: totalUsers,
            active: activeUsers,
            inactive: inactiveUsers,
            admins: adminUsers,
            regularUsers: regularUsers,
        };
    }

    async searchUsers(search: string, page: number = 1, limit: number = 10) {
        const conditions = {
            status: { $ne: 'deleted' },
            $or: [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ],
        };

        const result = await this.userRepository.paginate(page, limit, conditions);
        result.data = result.data.map(user => this.sanitizeUser(user));

        return result;
    }

    // Optional: Add method to get users by status
    async getUsersByStatus(status: UserStatus, page: number = 1, limit: number = 10) {
        const conditions = {
            status: status,
            role: UserRole.USER // Only regular users
        };

        const result = await this.userRepository.paginate(page, limit, conditions);
        result.data = result.data.map(user => this.sanitizeUser(user));

        return result;
    }

    // Optional: Add method to get admin users
    async getAdminUsers(page: number = 1, limit: number = 10, search?: string) {
        let conditions: any = {
            role: UserRole.ADMIN,
            status: { $ne: 'deleted' }
        };

        if (search) {
            conditions.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }

        const result = await this.userRepository.paginate(page, limit, conditions);
        result.data = result.data.map(user => this.sanitizeUser(user));

        return result;
    }

    private sanitizeUser(user: any) {
        if (!user) return user;

        // Convert Mongoose document to plain object
        const userObj = user.toObject ? user.toObject() : { ...user };

        // Normalize avatar: always return `/uploads/<filename>` if it's just a filename
        if (userObj.avatar) {
            if (typeof userObj.avatar === 'string' && !userObj.avatar.startsWith('/uploads/')) {
                userObj.avatar = `/uploads/${userObj.avatar}`;
            }
        }

        // Convert _id to id
        if (userObj._id) {
            userObj.id = userObj._id.toString();
            delete userObj._id;
        }

        // Ensure dates are properly formatted
        if (userObj.createdAt) {
            userObj.createdAt = new Date(userObj.createdAt).toISOString();
        }
        if (userObj.updatedAt) {
            userObj.updatedAt = new Date(userObj.updatedAt).toISOString();
        }
        if (userObj.deletedAt) {
            userObj.deletedAt = new Date(userObj.deletedAt).toISOString();
        }

        // Remove sensitive fields
        delete userObj.password;
        delete userObj.refreshToken;
        delete userObj.__v;

        return userObj;
    }
}