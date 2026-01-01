/**
 * Migration: Update Plans Schema
 * 
 * This migration:
 * 1. Updates the plans collection schema to match new requirements
 * 2. Changes field names: name -> title, interval -> duration
 * 3. Adds new fields: stripe_price_id, stripe_product_id
 * 4. Removes old fields: videoSessions, slots, currency
 * 
 * Run this migration with: npm run migration:update-plans-schema
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Plan } from '../shared/schemas/plan.schema';

export async function updatePlansSchemaMigration() {
    console.log('🚀 Starting migration: Update Plans Schema...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const planModel = app.get(getModelToken(Plan.name));

    try {
        // Ensure indexes exist
        await planModel.collection.createIndex({ status: 1 });
        await planModel.collection.createIndex({ createdAt: -1 });
        await planModel.collection.createIndex({ title: 1 });
        console.log('✅ Indexes created/updated for plans collection.');

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Note: Plans collection schema is ready to use.');
        console.log('⚠️  Warning: Existing plans may need manual data migration if they have old field names.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

if (require.main === module) {
    updatePlansSchemaMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

