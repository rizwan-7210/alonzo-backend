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

    /**
     * Find active approved vendors (paginated) - for user-side APIs
     * Filters: role = VENDOR, status = ACTIVE, accountStatus = APPROVED
     * Supports optional: categoryId, search (by full name), sortByName
     */
    async findActiveApprovedVendorsWithPagination(
        page: number,
        limit: number,
        search?: string,
        categoryId?: string,
        sortByName?: 'ASC' | 'DESC',
    ) {
        const conditions: any = {
            role: UserRole.VENDOR,
            status: UserStatus.ACTIVE,
            accountStatus: AccountStatus.APPROVED,
            deletedAt: null,
        };

        // Add categoryId filter if provided
        if (categoryId) {
            conditions.categoryId = new Types.ObjectId(categoryId);
        }

        // Add search filter by full name if provided
        // Search uses CONCAT(firstName, ' ', lastName) with LIKE pattern
        if (search && search.trim()) {
            // Use $expr to search by concatenated full name
            // Combine with existing conditions using $and
            const baseConditions = { ...conditions };
            conditions = {
                $and: [
                    baseConditions,
                    {
                        $expr: {
                            $regexMatch: {
                                input: {
                                    $concat: [
                                        { $ifNull: ['$firstName', ''] },
                                        ' ',
                                        { $ifNull: ['$lastName', ''] },
                                    ],
                                },
                                regex: search.trim(),
                                options: 'i', // case-insensitive
                            },
                        },
                    },
                ],
            };
        }

        // If sortByName is provided, use aggregation pipeline for sorting by full name
        if (sortByName) {
            return this.findActiveApprovedVendorsWithPaginationAggregation(
                page,
                limit,
                conditions,
                sortByName,
            );
        }

        // Default sorting: createdAt DESC
        return this.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [
                { path: 'profileImage', select: 'id path name mimeType size url' },
                { path: 'categoryId', select: 'id title' },
            ],
        });
    }

    /**
     * Find active approved vendors using aggregation pipeline (for sorting by full name)
     */
    private async findActiveApprovedVendorsWithPaginationAggregation(
        page: number,
        limit: number,
        conditions: any,
        sortByName: 'ASC' | 'DESC',
    ) {
        const skip = (page - 1) * limit;
        const sortOrder = sortByName === 'ASC' ? 1 : -1;

        // Build aggregation pipeline
        const pipeline: any[] = [
            // Match stage - apply base conditions
            { $match: conditions },
            // Add fullName field by concatenating firstName and lastName
            {
                $addFields: {
                    fullName: {
                        $concat: [
                            { $ifNull: ['$firstName', ''] },
                            ' ',
                            { $ifNull: ['$lastName', ''] },
                        ],
                    },
                },
            },
            // Sort by fullName
            { $sort: { fullName: sortOrder } },
            // Skip and limit for pagination
            { $skip: skip },
            { $limit: limit },
            // Lookup profileImage
            {
                $lookup: {
                    from: 'files',
                    localField: 'profileImage',
                    foreignField: '_id',
                    as: 'profileImage',
                    pipeline: [
                        {
                            $project: {
                                id: { $toString: '$_id' },
                                path: 1,
                                name: 1,
                                mimeType: 1,
                                size: 1,
                                url: 1,
                            },
                        },
                    ],
                },
            },
            // Unwind profileImage (handle null case)
            {
                $unwind: {
                    path: '$profileImage',
                    preserveNullAndEmptyArrays: true,
                },
            },
            // Lookup categoryId
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'categoryId',
                    pipeline: [
                        {
                            $project: {
                                id: { $toString: '$_id' },
                                _id: '$_id',
                                title: 1,
                            },
                        },
                    ],
                },
            },
            // Unwind categoryId (handle null case)
            {
                $unwind: {
                    path: '$categoryId',
                    preserveNullAndEmptyArrays: true,
                },
            },
            // Convert main document _id to id and remove fullName field
            {
                $addFields: {
                    id: { $toString: '$_id' },
                },
            },
            { $unset: 'fullName' },
        ];

        // Count total documents matching conditions
        const countPipeline: any[] = [
            { $match: conditions },
            { $count: 'total' },
        ];

        const [dataResult, countResult] = await Promise.all([
            this.userModel.aggregate(pipeline).exec(),
            this.userModel.aggregate(countPipeline).exec(),
        ]);

        const data = dataResult || [];
        const total = countResult && countResult[0] ? countResult[0].total : 0;
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            data,
            total,
            page,
            limit,
            totalPages,
            hasNext,
            hasPrev,
        };
    }

    /**
     * Find active approved vendor by ID - for user-side APIs
     * Validates: role = VENDOR, status = ACTIVE, accountStatus = APPROVED
     */
    async findActiveApprovedVendorById(id: string): Promise<UserDocument | null> {
        const user = await this.findById(id, {
            populate: [
                { path: 'profileImage', select: 'id path name mimeType size url type category subType createdAt' },
                { path: 'categoryId', select: 'id title' },
            ],
        });

        if (!user) {
            return null;
        }

        // Validate vendor conditions
        if (
            user.role !== UserRole.VENDOR ||
            user.status !== UserStatus.ACTIVE ||
            user.accountStatus !== AccountStatus.APPROVED ||
            user.deletedAt
        ) {
            return null;
        }

        return user;
    }
}

