import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { SubAdminPermission, SubAdminPermissionDocument } from '../schemas/sub-admin-permission.schema';

@Injectable()
export class SubAdminPermissionRepository extends BaseRepository<SubAdminPermissionDocument> {
    constructor(
        @InjectModel(SubAdminPermission.name) protected readonly subAdminPermissionModel: Model<SubAdminPermissionDocument>,
    ) {
        super(subAdminPermissionModel);
    }

    async findBySubAdminId(subAdminId: string): Promise<SubAdminPermissionDocument | null> {
        return this.subAdminPermissionModel
            .findOne({ subAdminId: new Types.ObjectId(subAdminId) })
            .populate('subAdminId')
            .exec();
    }

    async updatePermissions(subAdminId: string, permissions: string[]): Promise<SubAdminPermissionDocument | null> {
        return this.subAdminPermissionModel
            .findOneAndUpdate(
                { subAdminId: new Types.ObjectId(subAdminId) },
                { permissions },
                { new: true, upsert: true }
            )
            .populate('subAdminId')
            .exec();
    }

    async updateRights(subAdminId: string, rights: string): Promise<SubAdminPermissionDocument | null> {
        return this.subAdminPermissionModel
            .findOneAndUpdate(
                { subAdminId: new Types.ObjectId(subAdminId) },
                { rights },
                { new: true, upsert: true }
            )
            .populate('subAdminId')
            .exec();
    }
}

