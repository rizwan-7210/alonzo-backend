/**
 * Migration: Create Categories Table
 * 
 * This migration:
 * 1. Creates the categories collection in MongoDB
 * 2. Optionally seeds initial categories if needed
 * 
 * Run this migration with: npm run migration:create-categories
 * Or import and run manually in your application startup
 * 
 * Note: In MongoDB, collections are created automatically when first document is inserted.
 * This migration script is mainly for documentation and optional seeding.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CategoryRepository } from '../shared/repositories/category.repository';
import { CategoryStatus } from '../common/constants/category.constants';

export async function createCategoriesMigration() {
    console.log('🚀 Starting migration: Create Categories Table...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const categoryRepository = app.get(CategoryRepository);

    try {
        // Check if categories already exist
        const existingCategories = await categoryRepository.findAll();
        console.log(`📊 Found ${existingCategories.length} existing categories...`);

        if (existingCategories.length > 0) {
            console.log('✅ Categories collection already exists with data.');
            console.log('\n📋 Existing Categories:');
            existingCategories.forEach((category) => {
                const cat = category.toObject ? category.toObject() : category;
                console.log(`   - ${cat.title} (${cat.status})`);
            });
        } else {
            console.log('ℹ️  Categories collection is empty. You can add categories through the API.');
        }

        // Count categories by status
        const activeCount = await categoryRepository.count({ status: CategoryStatus.ACTIVE });
        const inactiveCount = await categoryRepository.count({ status: CategoryStatus.INACTIVE });

        console.log('\n📊 Category Status Distribution:');
        console.log(`   Active: ${activeCount}`);
        console.log(`   Inactive: ${inactiveCount}`);
        console.log(`   Total: ${existingCategories.length}`);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 Note: Categories can be created through the API endpoints.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    createCategoriesMigration()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

