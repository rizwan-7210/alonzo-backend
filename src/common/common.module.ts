import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EmailService } from './services/email.service';
import { StripeService } from './services/stripe.service';
import { ZoomService } from './services/zoom.service';
import { SharedModule } from '../shared/shared.module';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Global()
@Module({
    imports: [ConfigModule, SharedModule, PassportModule],
    providers: [
        EmailService, 
        StripeService, 
        ZoomService,
        JwtAuthGuard,
        // Register both guards as APP_GUARD to ensure they run in order
        // JWT guard must run first to authenticate and set user
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        // RolesGuard runs after JwtAuthGuard
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
    ],
    exports: [EmailService, StripeService, ZoomService, JwtAuthGuard],
})
export class CommonModule { }