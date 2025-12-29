import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { Permission } from '../../common/constants/user.constants';

export type SubAdminPermissionDocument = SubAdminPermission & Document;

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

            // Convert dates
            if (transformedRet.createdAt) {
                transformedRet.createdAt = new Date(transformedRet.createdAt).toISOString();
            }
            if (transformedRet.updatedAt) {
                transformedRet.updatedAt = new Date(transformedRet.updatedAt).toISOString();
            }

            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class SubAdminPermission {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    subAdminId: User;

    @Prop({
        type: [String],
        enum: Object.values(Permission),
        default: [],
    })
    permissions: Permission[];

    @Prop({ type: String })
    rights?: string; // Description of rights/permissions
}

export const SubAdminPermissionSchema = SchemaFactory.createForClass(SubAdminPermission);

// Indexes
SubAdminPermissionSchema.index({ subAdminId: 1 }, { unique: true });

