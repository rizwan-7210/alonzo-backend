/**
 * Migration: Update Users Schema
 * 
 * This migration:
 * 1. Adds new fields to existing users: dial_code, location, website, categoryId, accountStatus, rejectionReason, deviceToken
 * 2. Sets default accountStatus to 'pending' for existing users
 * 3. Ensures lastName is nullable (no changes needed, schema handles it)
 * 
 * Run this migration with: npm run migration:update-users-schema
 * Or import and run manually in your application startup
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRepository } from '../shared/repositories/user.repository';
import { AccountStatus } from '../common/constants/user.constants';

export async function updateUsersSchemaMigration() {
    console.log('🚀 Starting migration: Update Users Schema...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get(UserRepository);

    try {
        // Get all users
        const allUsers = await userRepository.findAll();
        console.log(`📊 Found ${allUsers.length} users to update...`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of allUsers) {
            const userObj = user.toObject ? user.toObject() : user;
            const userId = userObj._id ? userObj._id.toString() : userObj.id;

            // Prepare update object with default values for new fields
            const updateData: any = {};

            // Set default accountStatus if not present
            if (!userObj.accountStatus) {
                updateData.accountStatus = AccountStatus.PENDING;
            }

            // Only update if there are changes to make
            if (Object.keys(updateData).length > 0) {
                await userRepository.update(userId, updateData);
                updatedCount++;
                console.log(`✅ Updated user: ${userObj.email}`);
            } else {
                skippedCount++;
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   ✅ Updated: ${updatedCount} users`);
        console.log(`   ⏭️  Skipped: ${skippedCount} users (already up to date)`);
        console.log(`   📊 Total: ${allUsers.length} users`);

        // Count users by accountStatus
        const accountStatusCounts = {
            pending: await userRepository.count({ accountStatus: AccountStatus.PENDING }),
            approved: await userRepository.count({ accountStatus: AccountStatus.APPROVED }),
            rejected: await userRepository.count({ accountStatus: AccountStatus.REJECTED }),
        };

        console.log('\n📊 Account Status Distribution:');
        console.log(`   Pending: ${accountStatusCounts.pending}`);
        console.log(`   Approved: ${accountStatusCounts.approved}`);
        console.log(`   Rejected: ${accountStatusCounts.rejected}`);

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    updateUsersSchemaMigration()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

