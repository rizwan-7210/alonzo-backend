import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { VendorAuthController } from './controllers/vendor-auth.controller';
import { VendorCategoryController } from './controllers/vendor-category.controller';
import { VendorAuthService } from './services/vendor-auth.service';
import { SharedModule } from '../../shared/shared.module';
import { CommonModule } from '../../common/common.module';
import { NotificationModule } from '../notification/notification.module';
import { CategoryModule } from '../category/category.module';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        NotificationModule,
        CategoryModule, // Import CategoryModule to use CategoryService
        ConfigModule,
        JwtModule.register({}),
    ],
    controllers: [VendorAuthController, VendorCategoryController],
    providers: [VendorAuthService],
    exports: [VendorAuthService],
})
export class VendorModule { }

