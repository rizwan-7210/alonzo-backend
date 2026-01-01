import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ContactModule } from '../contact/contact.module';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminPasswordResetService } from './services/admin-password-reset.service';
import { UserManagementService } from './services/user-management.service';
import { AdminProfileService } from './services/admin-profile.service';
import { DashboardService } from './services/dashboard.service';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminPasswordResetController } from './controllers/admin-password-reset.controller';
import { AdminContactController } from './controllers/admin-contact.controller';
import { AdminFileController } from './controllers/admin-file.controller';
import { AdminNotificationController } from './controllers/admin-notification.controller';
import { AdminProfileController } from './controllers/admin-profile.controller';
import { AdminChangePasswordController } from './controllers/admin-change-password.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { SharedModule } from 'src/shared/shared.module';
import { SubscriptionLogController } from './controllers/subscription-log.controller';
import { SubscriptionLogService } from './services/subscription-log.service';
import { AdminNotificationService } from './services/admin-notification.service';
import { AdminPushNotificationService } from './services/admin-push-notification.service';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { CategoryService } from './services/category.service';
import { AdminCategoryController } from './controllers/admin-category.controller';
import { AdminPushNotificationController } from './controllers/admin-push-notification.controller';
import { CommonModule } from 'src/common/common.module';
import { NotificationModule } from '../notification/notification.module';
import { CategoryModule } from '../category/category.module';

@Module({
    imports: [SharedModule, CommonModule, ConfigModule, JwtModule, ContactModule, NotificationModule, CategoryModule],
    providers: [
        AdminAuthService,
        AdminPasswordResetService,
        UserManagementService,
        AdminProfileService,
        DashboardService,
        SubscriptionLogService,
        AdminNotificationService,
        AdminPushNotificationService,
        CategoryService
    ],
    controllers: [
        AdminAuthController,
        AdminPasswordResetController,
        AdminContactController,
        AdminFileController,
        AdminNotificationController,
        AdminProfileController,
        AdminChangePasswordController,
        DashboardController,
        SubscriptionLogController,
        StripeWebhookController,
        AdminCategoryController,
        AdminPushNotificationController
    ],
})
export class AdminModule { }