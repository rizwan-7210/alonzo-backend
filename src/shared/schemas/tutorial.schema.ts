import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { FileCategory, FileType } from 'src/common/constants/file.constants';
import { Status } from 'src/common/constants/tutorial.constants';

export type TutorialDocument = Tutorial & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            const transformedRet = ret as any;
            if (transformedRet._id && typeof transformedRet._id === 'object') {
                transformedRet._id = transformedRet._id.toString();
            }
            return transformedRet;
        },
    },
})
export class Tutorial {
    @Prop({ required: true, trim: true })
    title: string;

    @Prop({ required: true, type: String })
    description: string;

    @Prop({
        type: String,
        enum: Object.values(Status),
        default: Status.ACTIVE,
    })
    status: Status;

    @Prop({ type: Number, default: 0 })
    viewCount: number;

    @Prop({ type: Number, default: 0 })
    duration: number; // in seconds


    @Prop({ type: Types.ObjectId, ref: 'User' })
    createdBy?: Types.ObjectId;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const TutorialSchema = SchemaFactory.createForClass(Tutorial);

// Indexes for better query performance
TutorialSchema.index({ status: 1, createdAt: -1 });
TutorialSchema.index({ createdBy: 1 });
TutorialSchema.index({ title: 'text', description: 'text' });

TutorialSchema.virtual('videoUrl', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    justOne: true,
    match: {
        fileableType: 'Tutorial',
        type: FileType.VIDEO,
        category: FileCategory.ATTACHMENT,
        isActive: true,
    },
});

TutorialSchema.virtual('thumbnailUrl', {
    ref: 'File',
    localField: '_id',
    foreignField: 'fileableId',
    justOne: true,
    match: {
        fileableType: 'Tutorial',
        type: FileType.IMAGE,
        category: FileCategory.ATTACHMENT,
        isActive: true,
    },
});
