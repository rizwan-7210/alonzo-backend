import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { FileModule } from '../file/file.module';
import { NotificationModule } from '../notification/notification.module';
import { ProfileUpdateRequestService } from './services/profile-update-request.service';
import { VendorProfileUpdateRequestController } from './controllers/vendor-profile-update-request.controller';
import { AdminProfileUpdateRequestController } from './controllers/admin-profile-update-request.controller';

@Module({
    imports: [SharedModule, FileModule, NotificationModule],
    controllers: [
        VendorProfileUpdateRequestController,
        AdminProfileUpdateRequestController,
    ],
    providers: [ProfileUpdateRequestService],
    exports: [ProfileUpdateRequestService],
})
export class ProfileUpdateRequestModule { }

