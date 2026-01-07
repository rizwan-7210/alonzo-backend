import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProfileUpdateRequestStatus } from '../../common/constants/user.constants';

export type ProfileUpdateRequestDocument = ProfileUpdateRequest & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            const transformedRet = ret as any;

            // Convert ObjectId to string
            if (transformedRet._id && typeof transformedRet._id === 'object') {
                transformedRet.id = transformedRet._id.toString();
                delete transformedRet._id;
            }

            // Convert userId ObjectId to string
            if (transformedRet.userId && typeof transformedRet.userId === 'object') {
                transformedRet.userId = transformedRet.userId.toString();
            }

            // Convert categoryId ObjectId to string
            if (transformedRet.categoryId && typeof transformedRet.categoryId === 'object') {
                transformedRet.categoryId = transformedRet.categoryId.toString();
            }

            // Convert dates
            if (transformedRet.createdAt) {
                transformedRet.createdAt = new Date(transformedRet.createdAt).toISOString();
            }
            if (transformedRet.updatedAt) {
                transformedRet.updatedAt = new Date(transformedRet.updatedAt).toISOString();
            }

            // Remove unwanted fields
            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class ProfileUpdateRequest {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true })
    firstName: string;

    @Prop({ type: String, required: true, trim: true })
    phone: string;

    @Prop({ type: String, trim: true })
    dial_code?: string;

    @Prop({ type: Types.ObjectId, ref: 'Category' })
    categoryId?: Types.ObjectId;

    @Prop({ type: String, trim: true })
    address?: string;

    @Prop({ type: String, trim: true })
    location?: string;

    @Prop({ type: String, trim: true })
    website?: string;

    @Prop({ type: String, trim: true })
    rejectionReason?: string;

    @Prop({
        type: String,
        enum: Object.values(ProfileUpdateRequestStatus),
        default: ProfileUpdateRequestStatus.PENDING,
    })
    status: ProfileUpdateRequestStatus;
}

export const ProfileUpdateRequestSchema = SchemaFactory.createForClass(ProfileUpdateRequest);

// Virtual for user relation
ProfileUpdateRequestSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
});

// Virtual for category relation
ProfileUpdateRequestSchema.virtual('category', {
    ref: 'Category',
    localField: 'categoryId',
    foreignField: '_id',
    justOne: true,
});

// Virtual for profile image file (polymorphic relationship)
ProfileUpdateRequestSchema.virtual('profileImage', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    match: {
        fileableType: 'ProfileUpdateRequest',
        subType: 'profileImage',
        isActive: true,
    },
    justOne: true,
});

// Virtual for pharmacy license file (polymorphic relationship)
ProfileUpdateRequestSchema.virtual('pharmacyLicense', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    match: {
        fileableType: 'ProfileUpdateRequest',
        subType: 'pharmacyLicense',
        isActive: true,
    },
    justOne: true,
});

// Virtual for registration certificate file (polymorphic relationship)
ProfileUpdateRequestSchema.virtual('registrationCertificate', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    match: {
        fileableType: 'ProfileUpdateRequest',
        subType: 'registrationCertificate',
        isActive: true,
    },
    justOne: true,
});

// Indexes
ProfileUpdateRequestSchema.index({ userId: 1 });
ProfileUpdateRequestSchema.index({ status: 1 });
ProfileUpdateRequestSchema.index({ categoryId: 1 });
ProfileUpdateRequestSchema.index({ createdAt: -1 });

