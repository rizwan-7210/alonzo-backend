import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRepository } from '../shared/repositories/user.repository';
import { FileRepository } from '../shared/repositories/file.repository';
import { FileType, FileCategory, FileSubType } from '../common/constants/file.constants';
import { Types } from 'mongoose';

export async function migrateAvatarsToFilesMigration() {
    console.log('🚀 Starting migration: Migrate Avatars to Files Table...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const userRepository = app.get(UserRepository);
    const fileRepository = app.get(FileRepository);

    try {
        // Get all users that have an avatar field but no profileImage
        const allUsers = await userRepository.findAll();
        let migratedCount = 0;
        let skippedCount = 0;

        console.log(`📊 Found ${allUsers.length} users to check...`);

        for (const user of allUsers) {
            const userObj = user.toObject ? user.toObject() : user;
            const userId = userObj._id ? userObj._id.toString() : userObj.id;
            const avatar = userObj.avatar;

            // Skip if user already has profileImage
            if (userObj.profileImage) {
                skippedCount++;
                continue;
            }

            // Skip if no avatar
            if (!avatar) {
                skippedCount++;
                continue;
            }

            try {
                // Check if file already exists for this user with profileImage subType
                const existingFiles = await fileRepository.findByEntity(userId, 'User');
                const existingFile = existingFiles.find(
                    (f: any) => f.subType === FileSubType.PROFILE_IMAGE && f.isActive
                );

                if (existingFile) {
                    // Update user with existing file reference
                    await userRepository.update(userId, { profileImage: existingFile._id });
                    migratedCount++;
                    console.log(`✅ User ${userObj.email}: Linked to existing profile image file`);
                    continue;
                }

                // Extract filename from avatar path
                let filename: string;
                if (avatar.startsWith('/uploads/')) {
                    filename = avatar.replace('/uploads/', '');
                } else if (avatar.startsWith('uploads/')) {
                    filename = avatar.replace('uploads/', '');
                } else {
                    filename = avatar;
                }

                // Create file record
                const fileRecord = await fileRepository.create({
                    name: filename,
                    originalName: filename,
                    path: filename,
                    mimeType: 'image/jpeg', // Default, will be updated if we can detect
                    size: 0, // Unknown size
                    type: FileType.IMAGE,
                    category: FileCategory.PROFILE,
                    subType: FileSubType.PROFILE_IMAGE,
                    fileableId: new Types.ObjectId(userId),
                    fileableType: 'User',
                    uploadedBy: new Types.ObjectId(userId),
                    isActive: true,
                });

                // Update user with profileImage reference
                await userRepository.update(userId, {
                    profileImage: fileRecord._id,
                });

                migratedCount++;
                console.log(`✅ User ${userObj.email}: Migrated avatar to files table`);
            } catch (error) {
                console.error(`❌ Failed to migrate avatar for user ${userObj.email}:`, error.message);
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Migrated: ${migratedCount} users`);
        console.log(`   ⏭️  Skipped: ${skippedCount} users`);
        console.log(`✅ Migration complete: Avatars migrated to files table.`);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

if (require.main === module) {
    migrateAvatarsToFilesMigration().catch(err => {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    });
}

