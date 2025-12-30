import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ContactModule } from '../contact/contact.module';
import { AdminAuthService } from './services/admin-auth.service';
import { UserManagementService } from './services/user-management.service';
import { AdminProfileService } from './services/admin-profile.service';
import { DashboardService } from './services/dashboard.service';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminContactController } from './controllers/admin-contact.controller';
import { AdminFileController } from './controllers/admin-file.controller';
import { AdminNotificationController } from './controllers/admin-notification.controller';
import { AdminProfileController } from './controllers/admin-profile.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { SharedModule } from 'src/shared/shared.module';
import { PlanController } from './controllers/plan.controller';
import { PlanService } from './services/plan.service';
import { SubscriptionLogController } from './controllers/subscription-log.controller';
import { SubscriptionLogService } from './services/subscription-log.service';
import { AvailabilityService } from './services/availability.service';
import { AvailabilityController } from './controllers/availability.controller';
import { PricingService } from './services/pricing.service';
import { PricingController } from './controllers/pricing.controller';
import { AdminNotificationService } from './services/admin-notification.service';
import { NonUserInvoiceService } from './services/non-user-invoice.service';
import { NonUserInvoiceController } from './controllers/non-user-invoice.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { CategoryService } from './services/category.service';
import { AdminCategoryController } from './controllers/admin-category.controller';
import { CommonModule } from 'src/common/common.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { CategoryModule } from '../category/category.module';

@Module({
    imports: [SharedModule, CommonModule, ConfigModule, JwtModule, ContactModule, NotificationModule, UserModule, CategoryModule],
    providers: [
        AdminAuthService,
        UserManagementService,
        AdminProfileService,
        DashboardService,
        PlanService,
        SubscriptionLogService,
        AvailabilityService,
        PricingService,
        AdminNotificationService,
        NonUserInvoiceService,
        CategoryService
    ],
    controllers: [
        AdminAuthController,
        AdminUserController,
        AdminContactController,
        AdminFileController,
        AdminNotificationController,
        AdminProfileController,
        DashboardController,
        PlanController,
        SubscriptionLogController,
        AvailabilityController,
        PricingController,
        NonUserInvoiceController,
        StripeWebhookController,
        AdminCategoryController
    ],
})
export class AdminModule { }