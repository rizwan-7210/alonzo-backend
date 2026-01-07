/**
 * Migration: Create Products Table
 * 
 * This migration:
 * 1. Creates the products collection in MongoDB
 * 2. Optionally seeds initial products if needed
 * 
 * Run this migration with: npm run migration:create-products
 * Or import and run manually in your application startup
 * 
 * Note: In MongoDB, collections are created automatically when first document is inserted.
 * This migration script is mainly for documentation and optional seeding.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductRepository } from '../shared/repositories/product.repository';
import { ProductStatus, InventoryStatus } from '../common/constants/product.constants';

export async function createProductsMigration() {
    console.log('🚀 Starting migration: Create Products Table...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const productRepository = app.get(ProductRepository);

    try {
        // Check if products already exist
        const existingProducts = await productRepository.findAll();
        console.log(`📊 Found ${existingProducts.length} existing products...`);

        if (existingProducts.length > 0) {
            console.log('✅ Products collection already exists with data.');
            console.log('\n📋 Existing Products:');
            existingProducts.forEach((product) => {
                const prod = product.toObject ? product.toObject() : product;
                console.log(`   - ${prod.title} (${prod.status}, ${prod.inventoryStatus})`);
            });
        } else {
            console.log('ℹ️  Products collection is empty. You can add products through the API.');
        }

        // Count products by status
        const activeCount = await productRepository.count({ status: ProductStatus.ACTIVE });
        const inactiveCount = await productRepository.count({ status: ProductStatus.INACTIVE });

        // Count products by inventory status
        const inStockCount = await productRepository.count({ inventoryStatus: InventoryStatus.IN_STOCK });
        const outOfStockCount = await productRepository.count({ inventoryStatus: InventoryStatus.OUT_OF_STOCK });

        console.log('\n📊 Product Status Distribution:');
        console.log(`   Active: ${activeCount}`);
        console.log(`   Inactive: ${inactiveCount}`);
        console.log(`   Total: ${existingProducts.length}`);

        console.log('\n📦 Inventory Status Distribution:');
        console.log(`   In Stock: ${inStockCount}`);
        console.log(`   Out of Stock: ${outOfStockCount}`);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n💡 Note: Products can be created through the API endpoints.');
        console.log('💡 Note: Products require at least 1 image (max 10 images).');
        console.log('💡 Note: Only vendors can create and manage products.');
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
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}
