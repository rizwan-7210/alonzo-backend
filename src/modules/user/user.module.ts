import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { FileModule } from '../file/file.module';
import { NotificationModule } from '../notification/notification.module';
import { UserService } from './services/user.service';
import { UserAuthService } from './services/user-auth.service';
import { UserAuthController } from './controllers/user-auth.controller';
import { UserController } from './controllers/user.controller';
import { UserFileController } from './controllers/user-file.controller';
import { UserNotificationController } from './controllers/user-notification.controller';
import { SharedModule } from 'src/shared/shared.module';
import { multerConfig } from 'src/config/multer.config';
import { MulterModule } from '@nestjs/platform-express';
import { TutorialController } from './controllers/tutorial.controller';
import { TutorialService } from './services/tutorial.service';
import { PlanController } from './controllers/plan.controller';
import { PlanService } from './services/plan.service';

import { UserNotificationService } from './services/user-notification.service';
import { UserAvailabilityService } from './services/user-availability.service';
import { UserBookingService } from './services/user-booking.service';
import { BookingSchedulerService } from './services/booking-scheduler.service';
import { UserAvailabilityController } from './controllers/user-availability.controller';
import { UserBookingController } from './controllers/user-booking.controller';
import { BookingRepository } from 'src/shared/repositories/booking.repository';
import { Booking, BookingSchema } from 'src/shared/schemas/booking.schema';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonModule } from 'src/common/common.module';
import { PricingService } from './services/pricing.service';
import { PricingController } from './controllers/pricing.controller';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        ConfigModule,
        JwtModule,
        FileModule,
        NotificationModule,
        MulterModule.register(multerConfig),
        MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }])
    ],
    providers: [
        UserService,
        UserAuthService,
        TutorialService,
        PlanService,
        UserNotificationService,
        UserAvailabilityService,
        UserBookingService,
        BookingSchedulerService,
        PricingService,
        BookingRepository,
    ],
    controllers: [
        UserAuthController,
        UserController,
        UserFileController,
        UserNotificationController,
        TutorialController,
        PlanController,
        UserAvailabilityController,
        PricingController,
        UserBookingController
    ],
    exports: [UserAvailabilityService],
})
export class UserModule { }