import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import configuration from './config/configuration';
import { CommonModule } from './common/common.module';
// import { SharedModule } from './modules/shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { FileModule } from './modules/file/file.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ContactModule } from './modules/contact/contact.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule, // Add CommonModule here
    SharedModule,
    AuthModule,
    UserModule,
    FileModule,
    AdminModule,
    NotificationModule,
    ContactModule,
    VendorModule,
  ],
})
export class AppModule { }