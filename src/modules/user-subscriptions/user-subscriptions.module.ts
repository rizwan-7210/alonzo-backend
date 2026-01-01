import { Module } from '@nestjs/common';
import { UserSubscriptionsService } from './services/user-subscriptions.service';
import { AdminUserSubscriptionsController } from './controllers/admin-user-subscriptions.controller';
import { UserSubscriptionsController } from './controllers/user-subscriptions.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [AdminUserSubscriptionsController, UserSubscriptionsController],
    providers: [UserSubscriptionsService],
    exports: [UserSubscriptionsService],
})
export class UserSubscriptionsModule { }

