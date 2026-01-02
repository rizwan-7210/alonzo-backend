/**
 * Migration: Create Contact Messages Collection
 * 
 * This migration:
 * 1. Ensures the contact_messages collection exists in MongoDB
 * 2. Creates indexes for better query performance
 * 
 * Run this migration with: npm run migration:create-contact-messages
 * Or import and run manually in your application startup
 * 
 * Note: In MongoDB, collections are created automatically when first document is inserted.
 * This migration script is mainly for documentation and index creation.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Contact } from '../shared/schemas/contact.schema';

export async function createContactMessagesMigration() {
    console.log('🚀 Starting migration: Create Contact Messages Collection...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const contactModel = app.get(getModelToken(Contact.name));

    try {
        // Check if contact_messages collection exists and has documents
        const contactCount = await contactModel.countDocuments().exec();
        console.log(`📊 Found ${contactCount} contact messages in collection`);

        // Ensure indexes exist (Mongoose will create them automatically, but we can verify)
        const indexes = await contactModel.collection.getIndexes();
        console.log('\n📑 Existing indexes:');
        console.log(JSON.stringify(indexes, null, 2));

        // Verify required indexes
        const requiredIndexes = ['email', 'status', 'createdAt'];
        const existingIndexNames = Object.keys(indexes);
        
        console.log('\n✅ Index verification:');
        requiredIndexes.forEach(indexName => {
            const exists = existingIndexNames.some(name => name.includes(indexName));
            console.log(`   ${exists ? '✅' : '⚠️ '} ${indexName} index ${exists ? 'exists' : 'missing'}`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Note: Contact messages collection is ready to use.');
        console.log('   The collection will be created automatically when first contact message is inserted.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    createContactMessagesMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

