import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProductService } from './services/product.service';
import { VendorProductController } from './controllers/vendor-product.controller';
import { UserProductController } from './controllers/user-product.controller';
import { SharedModule } from '../../shared/shared.module';
import { FileModule } from '../file/file.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        SharedModule,
        FileModule,
        forwardRef(() => UserModule),
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('jwt.secret'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [VendorProductController, UserProductController],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductModule { }

