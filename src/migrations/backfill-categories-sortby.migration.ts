/**
 * Migration: Backfill categories.sortBy
 *
 * Sets sortBy = 1, 2, 3, ... by createdAt order for categories that have sortBy 0 or missing.
 * Run with: npx ts-node -r tsconfig-paths/register src/migrations/backfill-categories-sortby.migration.ts
 * (or your project's migration runner if available)
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../shared/schemas/category.schema';

export async function backfillCategoriesSortByMigration() {
    console.log('🚀 Starting migration: Backfill categories.sortBy...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const categoryModel = app.get<Model<CategoryDocument>>(getModelToken(Category.name));

    try {
        const categories = await categoryModel
            .find({})
            .sort({ createdAt: 1 })
            .lean()
            .exec();

        console.log(`📊 Found ${categories.length} categories.`);

        for (let i = 0; i < categories.length; i++) {
            await categoryModel.updateOne(
                { _id: (categories[i] as any)._id },
                { $set: { sortBy: i + 1 } },
            );
        }

        console.log(`✅ Set sortBy for ${categories.length} categories (1..${categories.length}).`);
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

if (require.main === module) {
    backfillCategoriesSortByMigration()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
}
