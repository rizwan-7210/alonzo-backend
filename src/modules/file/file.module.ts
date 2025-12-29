import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { FileService } from './services/file.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
    imports: [SharedModule, ConfigModule, NotificationModule],
    providers: [FileService],
    exports: [FileService],
})
export class FileModule { }