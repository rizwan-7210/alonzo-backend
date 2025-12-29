import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum ContactStatus {
    PENDING = 'pending',
    RESOLVED = 'resolved',
}

export type ContactDocument = Contact & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class Contact {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    subject: string;

    @Prop({ required: true })
    message: string;

    @Prop({
        type: String,
        enum: Object.values(ContactStatus),
        default: ContactStatus.PENDING,
    })
    status: ContactStatus;

    @Prop({ type: String, enum: ['guest', 'user'], default: 'guest' })
    userType: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId?: Types.ObjectId;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

ContactSchema.index({ email: 1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ createdAt: -1 });