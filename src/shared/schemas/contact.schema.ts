import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserType } from '../../common/constants/contact.constants';

export enum ContactStatus {
    PENDING = 'pending',
    RESOLVED = 'resolved',
}

export type ContactDocument = Contact & Document;

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

            // Convert userId ObjectId to string if it exists
            if (transformedRet.userId && typeof transformedRet.userId === 'object') {
                transformedRet.userId = transformedRet.userId.toString();
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
export class Contact {
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId?: Types.ObjectId;

    @Prop({
        type: String,
        enum: Object.values(UserType),
        required: true,
    })
    userType: UserType;

    @Prop({ type: String, required: true, trim: true })
    name: string;

    @Prop({ type: String, required: true, trim: true, lowercase: true })
    email: string;

    @Prop({ type: String, required: true, trim: true })
    subject: string;

    @Prop({ type: String, required: true })
    message: string;

    @Prop({
        type: String,
        enum: Object.values(ContactStatus),
        default: ContactStatus.PENDING,
    })
    status: ContactStatus;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

ContactSchema.index({ email: 1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ createdAt: -1 });