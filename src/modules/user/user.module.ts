import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './services/users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserNotificationService } from './services/user-notification.service';
import { UserRecentlyViewedService } from './services/user-recently-viewed.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { UsersVendorsController } from './controllers/users-vendors.controller';
import { UserProfileController } from './controllers/user-profile.controller';
import { UserNotificationController } from './controllers/user-notification.controller';
import { UserRecentlyViewedController } from './controllers/user-recently-viewed.controller';
import { UsersRepository } from './repositories/users.repository';
import { SharedModule } from '../../shared/shared.module';
import { NotificationModule } from '../notification/notification.module';
import { ProductModule } from '../product/product.module';
import { User, UserSchema } from '../../shared/schemas/user.schema';

@Module({
    imports: [
        SharedModule,
        NotificationModule,
        ProductModule,
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    controllers: [
        AdminUsersController,
        UsersVendorsController,
        UserProfileController,
        UserNotificationController,
        UserRecentlyViewedController,
    ],
    providers: [
        UsersService,
        UserProfileService,
        UserNotificationService,
        UserRecentlyViewedService,
        UsersRepository,
    ],
    exports: [
        UsersService,
        UserProfileService,
        UserNotificationService,
        UserRecentlyViewedService,
        UsersRepository,
    ],
})
export class UserModule { }

