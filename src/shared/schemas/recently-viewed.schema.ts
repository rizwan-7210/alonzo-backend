import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecentlyViewedDocument = RecentlyViewed & Document;

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

            // Convert viewableId ObjectId to string
            if (transformedRet.viewableId && typeof transformedRet.viewableId === 'object') {
                transformedRet.viewableId = transformedRet.viewableId.toString();
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
export class RecentlyViewed {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true })
    viewableType: string;

    @Prop({ type: Types.ObjectId, refPath: 'viewableType', required: true })
    viewableId: Types.ObjectId;
}

export const RecentlyViewedSchema = SchemaFactory.createForClass(RecentlyViewed);

// Unique compound index: userId + viewableType + viewableId
RecentlyViewedSchema.index({ userId: 1, viewableType: 1, viewableId: 1 }, { unique: true });

// Index for efficient queries
RecentlyViewedSchema.index({ userId: 1, updatedAt: -1 });
RecentlyViewedSchema.index({ userId: 1, viewableType: 1 });

// Virtual for viewable (polymorphic relationship)
RecentlyViewedSchema.virtual('viewable', {
    refPath: 'viewableType',
    localField: 'viewableId',
    foreignField: '_id',
    justOne: true,
});
