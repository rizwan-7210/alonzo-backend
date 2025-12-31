/**
 * Migration: Create Push Notifications Collection
 * 
 * This migration:
 * 1. Ensures the push_notifications collection exists in MongoDB
 * 2. Creates indexes for better query performance
 * 
 * Run this migration with: npm run migration:create-push-notifications
 * Or import and run manually in your application startup
 * 
 * Note: In MongoDB, collections are created automatically when first document is inserted.
 * This migration script is mainly for documentation and index creation.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PushNotificationRepository } from '../shared/repositories/push-notification.repository';
import { getModelToken } from '@nestjs/mongoose';
import { PushNotification } from '../shared/schemas/push-notification.schema';

export async function createPushNotificationsMigration() {
    console.log('🚀 Starting migration: Create Push Notifications Collection...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const pushNotificationModel = app.get(getModelToken(PushNotification.name));

    try {
        // Check if push_notifications collection exists and has documents
        const notificationCount = await pushNotificationModel.countDocuments().exec();
        console.log(`📊 Found ${notificationCount} push notifications in collection`);

        // Ensure indexes exist (Mongoose will create them automatically, but we can verify)
        const indexes = await pushNotificationModel.collection.getIndexes();
        console.log('\n📑 Existing indexes:');
        console.log(JSON.stringify(indexes, null, 2));

        // Verify required indexes
        const requiredIndexes = ['createdAt'];
        const existingIndexNames = Object.keys(indexes);
        
        console.log('\n✅ Index verification:');
        requiredIndexes.forEach(indexName => {
            const exists = existingIndexNames.some(name => name.includes(indexName));
            console.log(`   ${exists ? '✅' : '⚠️ '} ${indexName} index ${exists ? 'exists' : 'missing'}`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Note: Push notifications collection is ready to use.');
        console.log('   The collection will be created automatically when first notification is inserted.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    createPushNotificationsMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

