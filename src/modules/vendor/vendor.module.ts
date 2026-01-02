import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorCategoryController } from './controllers/vendor-category.controller';
import { VendorPasswordResetController } from './controllers/vendor-password-reset.controller';
import { VendorDashboardController } from './controllers/vendor-dashboard.controller';
import { VendorProfileController } from './controllers/vendor-profile.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { VendorPasswordResetService } from './services/vendor-password-reset.service';
import { VendorDashboardService } from './services/vendor-dashboard.service';
import { SharedModule } from '../../shared/shared.module';
import { CommonModule } from '../../common/common.module';
import { NotificationModule } from '../notification/notification.module';
import { CategoryModule } from '../category/category.module';
import { AdminModule } from '../admin/admin.module';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        NotificationModule,
        CategoryModule, // Import CategoryModule to use CategoryService
        AdminModule, // Import AdminModule to use AdminProfileService
        ConfigModule,
        JwtModule.register({}),
    ],
    controllers: [
        VendorAuthController,
        VendorCategoryController,
        VendorPasswordResetController,
        VendorDashboardController,
        VendorProfileController,
    ],
    providers: [VendorAuthService, VendorPasswordResetService, VendorDashboardService],
    exports: [VendorAuthService, VendorPasswordResetService, VendorDashboardService],
})
export class VendorModule { }

