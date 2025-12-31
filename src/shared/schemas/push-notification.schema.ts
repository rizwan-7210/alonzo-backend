import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PushNotificationDocument = PushNotification & Document;

@Schema({
    timestamps: true,
    collection: 'push_notifications',
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

            // Remove unwanted fields
            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class PushNotification {
    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({ type: String, required: true, trim: true })
    message: string;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const PushNotificationSchema = SchemaFactory.createForClass(PushNotification);

// Indexes
PushNotificationSchema.index({ createdAt: -1 }); // Sort by latest first

