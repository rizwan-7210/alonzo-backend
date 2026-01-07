import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { ProfileUpdateRequest, ProfileUpdateRequestDocument } from '../schemas/profile-update-request.schema';
import { ProfileUpdateRequestStatus } from '../../common/constants/user.constants';

@Injectable()
export class ProfileUpdateRequestRepository extends BaseRepository<ProfileUpdateRequestDocument> {
    constructor(
        @InjectModel(ProfileUpdateRequest.name) protected readonly profileUpdateRequestModel: Model<ProfileUpdateRequestDocument>,
    ) {
        super(profileUpdateRequestModel);
    }

    async findByUserId(userId: string): Promise<ProfileUpdateRequestDocument[]> {
        return this.profileUpdateRequestModel
            .find({ userId: new Types.ObjectId(userId) })
            .populate('user', 'firstName lastName email phone')
            .populate('category', 'title')
            .populate('profileImage')
            .populate('pharmacyLicense')
            .populate('registrationCertificate')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByStatus(status: ProfileUpdateRequestStatus): Promise<ProfileUpdateRequestDocument[]> {
        return this.profileUpdateRequestModel
            .find({ status })
            .populate('user', 'firstName lastName email phone')
            .populate('category', 'title')
            .populate('profileImage')
            .populate('pharmacyLicense')
            .populate('registrationCertificate')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByIdWithRelations(id: string): Promise<ProfileUpdateRequestDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }

        return this.profileUpdateRequestModel
            .findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('category', 'title')
            .populate('profileImage')
            .populate('pharmacyLicense')
            .populate('registrationCertificate')
            .exec();
    }

    async findPendingByUserId(userId: string): Promise<ProfileUpdateRequestDocument | null> {
        return this.profileUpdateRequestModel
            .findOne({
                userId: new Types.ObjectId(userId),
                status: ProfileUpdateRequestStatus.PENDING,
            })
            .exec();
    }
}

