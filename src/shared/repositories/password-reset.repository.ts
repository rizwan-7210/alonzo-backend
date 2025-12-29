import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { PasswordReset, PasswordResetDocument } from '../schemas/password-reset.schema';

@Injectable()
export class PasswordResetRepository extends BaseRepository<PasswordResetDocument> {
    constructor(
        @InjectModel(PasswordReset.name) protected readonly passwordResetModel: Model<PasswordResetDocument>,
    ) {
        super(passwordResetModel);
    }

    async findByEmailAndToken(email: string, token: string): Promise<PasswordResetDocument | null> {
        return this.passwordResetModel
            .findOne({
                email: email.toLowerCase(),
                token,
                isUsed: false,
                expiresAt: { $gt: new Date() }
            })
            .exec();
    }

    async invalidatePreviousTokens(email: string): Promise<void> {
        await this.passwordResetModel
            .updateMany(
                {
                    email: email.toLowerCase(),
                    isUsed: false
                },
                {
                    isUsed: true,
                    usedAt: new Date()
                }
            )
            .exec();
    }

    async createResetToken(email: string, token: string): Promise<PasswordResetDocument> {
        // Invalidate previous tokens
        await this.invalidatePreviousTokens(email);

        // Create new token
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

        return this.create({
            email: email.toLowerCase(),
            token,
            expiresAt,
        });
    }

    async markTokenAsUsed(email: string, token: string): Promise<PasswordResetDocument | null> {
        return this.passwordResetModel
            .findOneAndUpdate(
                {
                    email: email.toLowerCase(),
                    token,
                    isUsed: false,
                    expiresAt: { $gt: new Date() }
                },
                {
                    isUsed: true,
                    usedAt: new Date()
                },
                { new: true }
            )
            .exec();
    }

    async isValidToken(email: string, token: string): Promise<boolean> {
        const resetToken = await this.findByEmailAndToken(email, token);
        return resetToken !== null;
    }

    // Add cleanup method for expired tokens
    async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
        const result = await this.passwordResetModel
            .deleteMany({
                $or: [
                    { expiresAt: { $lt: new Date() } },
                    { isUsed: true }
                ]
            })
            .exec();

        return { deletedCount: result.deletedCount };
    }

    // Method to get expired tokens count (for monitoring)
    async getExpiredTokensCount(): Promise<number> {
        return this.passwordResetModel
            .countDocuments({
                expiresAt: { $lt: new Date() }
            })
            .exec();
    }
}