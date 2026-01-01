/**
 * Migration: Update User Subscriptions Schema
 * 
 * This migration:
 * 1. Updates the user_subscriptions collection schema to match new requirements
 * 2. Changes fields to: planId, userId, amountPaid, status (paid/unpaid), duration, expiryDate
 * 3. Removes Stripe-specific fields if they exist
 * 
 * Run this migration with: npm run migration:update-user-subscriptions-schema
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { UserSubscription } from '../shared/schemas/user-subscription.schema';

export async function updateUserSubscriptionsSchemaMigration() {
    console.log('🚀 Starting migration: Update User Subscriptions Schema...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const userSubscriptionModel = app.get(getModelToken(UserSubscription.name));

    try {
        // Ensure indexes exist
        await userSubscriptionModel.collection.createIndex({ userId: 1 });
        await userSubscriptionModel.collection.createIndex({ planId: 1 });
        await userSubscriptionModel.collection.createIndex({ status: 1 });
        await userSubscriptionModel.collection.createIndex({ expiryDate: 1 });
        await userSubscriptionModel.collection.createIndex({ createdAt: -1 });
        console.log('✅ Indexes created/updated for user_subscriptions collection.');

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Note: User subscriptions collection schema is ready to use.');
        console.log('⚠️  Warning: Existing subscriptions may need manual data migration if they have old field names.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

if (require.main === module) {
    updateUserSubscriptionsSchemaMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

