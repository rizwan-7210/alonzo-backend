/**
 * Migration: Add VENDOR role support
 * 
 * This migration:
 * 1. Ensures the user schema supports the 'vendor' role
 * 2. Updates any existing users that might need role updates
 * 
 * Run this migration with: npm run migration:add-vendor-role
 * Or import and run manually in your application startup
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRepository } from '../shared/repositories/user.repository';
import { UserRole } from '../common/constants/user.constants';

export async function addVendorRoleMigration() {
    console.log('🚀 Starting migration: Add VENDOR role support...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get(UserRepository);

    try {
        // Check if there are any users with invalid roles
        const allUsers = await userRepository.findAll();
        let updatedCount = 0;

        console.log(`📊 Found ${allUsers.length} users to check...`);

        for (const user of allUsers) {
            const userObj = user.toObject ? user.toObject() : user;
            const currentRole = userObj.role;
            const userId = userObj._id ? userObj._id.toString() : userObj.id;

            // Validate role - if it's not a valid role, set to USER
            const validRoles = Object.values(UserRole);
            if (!validRoles.includes(currentRole as UserRole)) {
                console.log(`⚠️  User ${userObj.email} has invalid role "${currentRole}", setting to USER`);
                await userRepository.update(userId, { role: UserRole.USER });
                updatedCount++;
            }
        }

        // Count users by role
        const roleCounts = {
            admin: await userRepository.count({ role: UserRole.ADMIN }),
            vendor: await userRepository.count({ role: UserRole.VENDOR }),
            user: await userRepository.count({ role: UserRole.USER }),
            sub_admin: await userRepository.count({ role: UserRole.SUB_ADMIN }),
        };

        console.log('✅ Migration completed successfully!');
        console.log('📈 User role distribution:');
        console.log(`   - Admin: ${roleCounts.admin}`);
        console.log(`   - Vendor: ${roleCounts.vendor}`);
        console.log(`   - User: ${roleCounts.user}`);
        console.log(`   - Sub-Admin: ${roleCounts.sub_admin}`);
        console.log(`   - Updated: ${updatedCount} users`);

        await app.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await app.close();
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    addVendorRoleMigration();
}

