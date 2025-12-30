/**
 * Seeder: Categories
 * 
 * This seeder creates default categories in the database.
 * 
 * Run this seeder with: npm run seed:categories
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CategoryRepository } from '../shared/repositories/category.repository';
import { CategoryStatus } from '../common/constants/category.constants';

const defaultCategories = [
    { title: 'Pharmacy', status: CategoryStatus.ACTIVE },
    { title: 'Medical Supplies', status: CategoryStatus.ACTIVE },
    { title: 'Healthcare Services', status: CategoryStatus.ACTIVE },
    { title: 'Laboratory', status: CategoryStatus.ACTIVE },
    { title: 'Diagnostic Center', status: CategoryStatus.ACTIVE },
    { title: 'Clinic', status: CategoryStatus.ACTIVE },
    { title: 'Hospital', status: CategoryStatus.ACTIVE },
    { title: 'Dental Care', status: CategoryStatus.ACTIVE },
    { title: 'Optical', status: CategoryStatus.ACTIVE },
    { title: 'Veterinary', status: CategoryStatus.ACTIVE },
];

export async function seedCategories() {
    console.log('🌱 Starting Categories Seeder...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const categoryRepository = app.get(CategoryRepository);

    try {
        let createdCount = 0;
        let skippedCount = 0;

        console.log(`📊 Seeding ${defaultCategories.length} categories...\n`);

        for (const categoryData of defaultCategories) {
            // Check if category already exists
            const existingCategory = await categoryRepository.findByTitle(categoryData.title);

            if (existingCategory) {
                console.log(`⏭️  Skipped: "${categoryData.title}" (already exists)`);
                skippedCount++;
                continue;
            }

            // Create category
            await categoryRepository.create(categoryData);
            console.log(`✅ Created: "${categoryData.title}"`);
            createdCount++;
        }

        console.log('\n📊 Seeding Summary:');
        console.log(`   ✅ Created: ${createdCount} categories`);
        console.log(`   ⏭️  Skipped: ${skippedCount} categories (already exist)`);
        console.log(`   📋 Total: ${defaultCategories.length} categories`);

        // Get final count
        const totalCount = await categoryRepository.count();
        const activeCount = await categoryRepository.count({ status: CategoryStatus.ACTIVE });
        const inactiveCount = await categoryRepository.count({ status: CategoryStatus.INACTIVE });

        console.log('\n📊 Database Status:');
        console.log(`   Active: ${activeCount}`);
        console.log(`   Inactive: ${inactiveCount}`);
        console.log(`   Total: ${totalCount}`);

        console.log('\n✅ Categories seeder completed successfully!');
    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run seeder if executed directly
if (require.main === module) {
    seedCategories()
        .then(() => {
            console.log('Seeder script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeder script failed:', error);
            process.exit(1);
        });
}

