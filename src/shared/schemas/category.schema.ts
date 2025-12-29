import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CategoryStatus } from '../../common/constants/category.constants';

export type CategoryDocument = Category & Document;

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

            // Remove unwanted fields
            delete transformedRet.__v;

            return transformedRet;
        },
    },
})
export class Category {
    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({
        type: String,
        enum: Object.values(CategoryStatus),
        default: CategoryStatus.ACTIVE,
    })
    status: CategoryStatus;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes
CategorySchema.index({ title: 1 });
CategorySchema.index({ status: 1 });
CategorySchema.index({ createdAt: -1 });

