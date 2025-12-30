import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { VendorProductController } from './controllers/vendor-product.controller';
import { UserProductController } from './controllers/user-product.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [VendorProductController, UserProductController],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductModule { }

