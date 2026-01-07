import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductStatus, InventoryStatus } from '../../common/constants/product.constants';

export type ProductDocument = Product & Document;

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
export class Product {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true, trim: true })
    title: string;

    @Prop({ type: Number, required: true, min: 0 })
    amount: number;

    @Prop({ type: Boolean, default: false })
    hasDiscount?: boolean;

    @Prop({ type: Number, min: 0, max: 100 })
    discountPercentage?: number;

    @Prop({
        type: String,
        enum: Object.values(ProductStatus),
        default: ProductStatus.ACTIVE,
    })
    status: ProductStatus;

    @Prop({
        type: String,
        enum: Object.values(InventoryStatus),
        default: InventoryStatus.IN_STOCK,
    })
    inventoryStatus: InventoryStatus;

    @Prop({ type: String })
    description?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes
ProductSchema.index({ userId: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ inventoryStatus: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ title: 'text' }); // Text search index

// Virtual for user relation
ProductSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
});

// Virtual for product files (polymorphic relationship)
ProductSchema.virtual('files', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    match: {
        fileableType: 'Product',
        isActive: true,
    },
});

