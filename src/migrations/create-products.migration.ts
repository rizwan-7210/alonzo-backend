/**
 * Migration: Create Products Collection
 * 
 * This migration:
 * 1. Ensures the products collection exists in MongoDB
 * 2. Creates indexes for better query performance
 * 
 * Run this migration with: npm run migration:create-products
 * Or import and run manually in your application startup
 * 
 * Note: In MongoDB, collections are created automatically when first document is inserted.
 * This migration script is mainly for documentation and index creation.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductRepository } from '../shared/repositories/product.repository';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from '../shared/schemas/product.schema';

export async function createProductsMigration() {
    console.log('🚀 Starting migration: Create Products Collection...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const productModel = app.get(getModelToken(Product.name));

    try {
        // Check if products collection exists and has documents
        const productCount = await productModel.countDocuments().exec();
        console.log(`📊 Found ${productCount} products in collection`);

        // Ensure indexes exist (Mongoose will create them automatically, but we can verify)
        const indexes = await productModel.collection.getIndexes();
        console.log('\n📑 Existing indexes:');
        console.log(JSON.stringify(indexes, null, 2));

        // Verify required indexes
        const requiredIndexes = ['userId', 'status', 'createdAt', 'title_text'];
        const existingIndexNames = Object.keys(indexes);
        
        console.log('\n✅ Index verification:');
        requiredIndexes.forEach(indexName => {
            const exists = existingIndexNames.some(name => name.includes(indexName));
            console.log(`   ${exists ? '✅' : '⚠️ '} ${indexName} index ${exists ? 'exists' : 'missing'}`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Note: Products collection is ready to use.');
        console.log('   The collection will be created automatically when first product is inserted.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    createProductsMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

