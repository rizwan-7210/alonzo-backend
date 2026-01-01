import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { User, UserDocument } from '../../../shared/schemas/user.schema';
import { UserRole, AccountStatus, UserStatus } from '../../../common/constants/user.constants';

@Injectable()
export class UsersRepository extends BaseRepository<UserDocument> {
    constructor(
        @InjectModel(User.name) protected readonly userModel: Model<UserDocument>,
    ) {
        super(userModel);
    }

    /**
     * Find users with role = USER (paginated)
     */
    async findUsersWithPagination(page: number, limit: number) {
        const conditions = {
            role: UserRole.USER,
            deletedAt: null,
        };

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [{ path: 'profileImage', select: 'id path name mimeType size' }],
        });
    }

    /**
     * Find approved vendors (paginated)
     */
    async findApprovedVendorsWithPagination(page: number, limit: number) {
        const conditions = {
            role: UserRole.VENDOR,
            accountStatus: AccountStatus.APPROVED,
            deletedAt: null,
        };

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [{ path: 'profileImage', select: 'id path name mimeType size' }],
        });
    }

    /**
     * Find vendor requests (pending or rejected) (paginated)
     */
    async findVendorRequestsWithPagination(page: number, limit: number) {
        const conditions = {
            role: UserRole.VENDOR,
            accountStatus: { $in: [AccountStatus.PENDING, AccountStatus.REJECTED] },
            deletedAt: null,
        };

        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'profileImage', select: 'id path name mimeType size' },
                { path: 'categoryId', select: 'id title' },
            ],
        });
    }

    /**
     * Find user by ID with all related files (profileImage, license, certificate)
     */
    async findByIdWithFiles(id: string): Promise<UserDocument | null> {
        return this.findById(id, {
            populate: [
                { path: 'profileImage', select: 'id path name mimeType size type category subType createdAt' },
                { path: 'categoryId', select: 'id title' },
            ],
        });
    }


    /**
     * Update user account status
     */
    async updateAccountStatus(
        id: string,
        accountStatus: AccountStatus,
        rejectionReason?: string,
    ): Promise<UserDocument | null> {
        const updateData: any = { accountStatus };
        if (rejectionReason !== undefined) {
            updateData.rejectionReason = rejectionReason;
        } else if (accountStatus === AccountStatus.APPROVED) {
            updateData.rejectionReason = null;
        }

        // Update the account status
        await this.update(id, updateData);

        // Return the updated user with populated profileImage and categoryId
        return this.findById(id, {
            populate: [
                { path: 'profileImage', select: 'id path name mimeType size type category subType createdAt' },
                { path: 'categoryId', select: 'id title' },
            ],
        });
    }

    /**
     * Toggle user status (ACTIVE/INACTIVE)
     */
    async toggleUserStatus(id: string): Promise<UserDocument | null> {
        const user = await this.findById(id);
        if (!user) {
            return null;
        }

        const newStatus =
            user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;

        // Update the status
        await this.update(id, { status: newStatus });

        // Return the updated user with populated profileImage
        return this.findById(id, {
            populate: [{ path: 'profileImage', select: 'id path name mimeType size type category subType createdAt' }],
        });
    }
}

