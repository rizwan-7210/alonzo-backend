import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { NotificationModule } from '../notification/notification.module';
import { ContactService } from './services/contact.service';
import { ContactController } from './controllers/contact.controller';

@Module({
    imports: [SharedModule, NotificationModule],
    providers: [ContactService],
    controllers: [ContactController],
    exports: [ContactService],
})
export class ContactModule { }