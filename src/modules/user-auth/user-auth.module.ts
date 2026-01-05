import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserAuthService } from './services/user-auth.service';
import { AuthController } from './controllers/auth.controller';
import { SharedModule } from 'src/shared/shared.module';
import { CommonModule } from 'src/common/common.module';

@Module({
    imports: [
        SharedModule,
        CommonModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('jwt.secret'),
                signOptions: { expiresIn: configService.get('jwt.expiresIn') },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [UserAuthService],
    controllers: [AuthController],
    exports: [UserAuthService],
})
export class UserAuthModule { }

