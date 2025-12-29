// shared/types/mongoose.types.ts
import { Document, Query, Model } from 'mongoose';

// Extended Query interface
export interface ExtendedQuery<ResultType, DocType extends Document> extends Query<ResultType, DocType> {
    withAvatar(): this;
    withFiles(): this;
}

// Extended Model interface
export interface ExtendedModel<T extends Document> extends Model<T> {
    findWithAvatar(id: string): Promise<T | null>;
    findByEmailWithAvatar(email: string): Promise<T | null>;
}