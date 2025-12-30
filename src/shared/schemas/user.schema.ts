// shared/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole, UserStatus, AccountStatus } from '../../common/constants/user.constants';
import { FileCategory } from '../../common/constants/file.constants';

export type UserDocument = User & Document;

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
            if (transformedRet.deletedAt) {
                transformedRet.deletedAt = new Date(transformedRet.deletedAt).toISOString();
            }

            // Remove sensitive fields
            delete transformedRet.password;
            delete transformedRet.refreshToken;
            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class User {
    @Prop({
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    })
    email: string;

    @Prop({ type: String, required: true, trim: true })
    firstName: string;

    @Prop({ type: String, trim: true })
    lastName?: string;

    @Prop({ type: String, required: true, select: false })
    password: string;

    @Prop({
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.USER,
    })
    role: UserRole;

    @Prop({
        type: String,
        enum: Object.values(UserStatus),
        default: UserStatus.ACTIVE,
    })
    status: UserStatus;

    @Prop({
        type: String,
        enum: Object.values(AccountStatus),
        default: AccountStatus.PENDING,
    })
    accountStatus?: AccountStatus;

    @Prop({ type: String, select: false })
    refreshToken?: string;

    @Prop({ type: String })
    phone?: string;

    @Prop({ type: String })
    dial_code?: string;

    @Prop({ type: String })
    address?: string;

    @Prop({ type: String })
    location?: string;

    @Prop({ type: String })
    website?: string;

    @Prop({ type: Types.ObjectId, ref: 'Category' })
    categoryId?: Types.ObjectId;

    @Prop({ type: String })
    rejectionReason?: string;

    @Prop({ type: String })
    deviceToken?: string;

    @Prop({ type: Types.ObjectId, ref: 'File' })
    profileImage?: Types.ObjectId;

    @Prop({ type: String })
    stripeCustomerId?: string;

    @Prop({ type: Date })
    deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for profile image file (relation to File schema)
UserSchema.virtual('profileImageFile', {
    ref: 'File',
    localField: 'profileImage',
    foreignField: '_id',
    justOne: true,
});

// Virtual for all user files
UserSchema.virtual('files', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    match: {
        fileableType: 'User',
        isActive: true,
    },
});

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
});

// Virtual for category relation
UserSchema.virtual('category', {
    ref: 'Category',
    localField: 'categoryId',
    foreignField: '_id',
    justOne: true,
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ categoryId: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ deletedAt: 1 });