/**
 * Migration: Update Categories Schema
 * 
 * This migration:
 * 1. Adds description column to categories collection
 * 
 * Run this migration with: npm run migration:update-categories-schema
 * 
 * Note: In MongoDB, schema changes are applied automatically when documents are saved.
 * This migration script is mainly for documentation and validation.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CategoryRepository } from '../shared/repositories/category.repository';

export async function updateCategoriesSchemaMigration() {
    console.log('🚀 Starting migration: Update Categories Schema...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const categoryRepository = app.get(CategoryRepository);

    try {
        // Get all categories
        const categories = await categoryRepository.findAll();
        console.log(`📊 Found ${categories.length} categories...`);

        // Update categories that don't have description field
        let updatedCount = 0;
        for (const category of categories) {
            const cat = category.toObject ? category.toObject() : category;
            
            // If description field doesn't exist, add it as null
            if (cat.description === undefined) {
                await categoryRepository.update(cat._id.toString(), {
                    description: null,
                });
                updatedCount++;
                console.log(`   ✅ Updated category: ${cat.title}`);
            }
        }

        if (updatedCount === 0) {
            console.log('✅ All categories already have description field.');
        } else {
            console.log(`\n✅ Updated ${updatedCount} categories with description field.`);
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 Note: The description field is now available in the Category schema.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    updateCategoriesSchemaMigration()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}


