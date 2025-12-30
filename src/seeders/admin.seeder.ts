/**
 * Seeder: Admin User
 * 
 * This seeder creates a default admin user in the database.
 * 
 * Run this seeder with: npm run seed:admin
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRepository } from '../shared/repositories/user.repository';
import { UserRole, UserStatus, AccountStatus } from '../common/constants/user.constants';
import * as bcrypt from 'bcryptjs';

const adminUser = {
    email: 'alonzo@mailinator.com',
    firstName: 'Alonzo',
    lastName: 'Admin',
    password: 'Admin@1234', // Will be hashed
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    accountStatus: AccountStatus.APPROVED,
};

export async function seedAdmin() {
    console.log('🌱 Starting Admin User Seeder...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get(UserRepository);

    try {
        // Check if admin user already exists
        const existingAdmin = await userRepository.findByEmail(adminUser.email);

        if (existingAdmin) {
            console.log(`⏭️  Admin user with email "${adminUser.email}" already exists.`);
            console.log('   Skipping creation to avoid overwriting existing admin.');
            
            // Show current admin details
            const adminObj = existingAdmin.toObject ? existingAdmin.toObject() : existingAdmin;
            console.log('\n📋 Existing Admin Details:');
            console.log(`   Email: ${adminObj.email}`);
            console.log(`   Name: ${adminObj.firstName} ${adminObj.lastName || ''}`);
            console.log(`   Role: ${adminObj.role}`);
            console.log(`   Status: ${adminObj.status}`);
            console.log(`   Account Status: ${adminObj.accountStatus || 'N/A'}`);
            
            console.log('\n✅ Seeder completed (admin already exists)');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminUser.password, 10);

        // Create admin user
        const createdAdmin = await userRepository.create({
            email: adminUser.email.toLowerCase(),
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            password: hashedPassword,
            role: adminUser.role,
            status: adminUser.status,
            accountStatus: adminUser.accountStatus,
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('\n📋 Admin Details:');
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Password: ${adminUser.password} (please change after first login)`);
        console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Status: ${adminUser.status}`);
        console.log(`   Account Status: ${adminUser.accountStatus}`);

        // Verify creation
        const adminId = createdAdmin._id ? createdAdmin._id.toString() : createdAdmin.id;
        const verifyAdmin = await userRepository.findById(adminId);
        
        if (verifyAdmin) {
            console.log('\n✅ Admin user verified in database');
        }

        console.log('\n⚠️  IMPORTANT: Please change the default password after first login!');
        console.log('✅ Admin seeder completed successfully!');
    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run seeder if executed directly
if (require.main === module) {
    seedAdmin()
        .then(() => {
            console.log('Seeder script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeder script failed:', error);
            process.exit(1);
        });
}

