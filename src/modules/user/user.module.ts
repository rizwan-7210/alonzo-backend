import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { FileModule } from '../file/file.module';
import { NotificationModule } from '../notification/notification.module';
import { UserService } from './services/user.service';
import { UserAuthService } from './services/user-auth.service';
import { UserAuthController } from './controllers/user-auth.controller';
import { UserController } from './controllers/user.controller';
import { UserFileController } from './controllers/user-file.controller';
import { UserNotificationController } from './controllers/user-notification.controller';
import { SharedModule } from 'src/shared/shared.module';
import { multerConfig } from 'src/config/multer.config';
import { MulterModule } from '@nestjs/platform-express';
import { PlanController } from './controllers/plan.controller';
import { PlanService } from './services/plan.service';

import { UserNotificationService } from './services/user-notification.service';

import { CommonModule } from 'src/common/common.module';
import { UserCategoryController } from './controllers/user-category.controller';
import { CategoryModule } from '../category/category.module';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        ConfigModule,
        JwtModule,
        FileModule,
        NotificationModule,
        CategoryModule, // Import CategoryModule to use CategoryService
        MulterModule.register(multerConfig)
    ],
    providers: [
        UserService,
        UserAuthService,
        PlanService,
        UserNotificationService,
    ],
    controllers: [
        UserAuthController,
        UserController,
        UserFileController,
        UserNotificationController,
        PlanController,
        UserCategoryController
    ],
    exports: [],
})
export class UserModule { }