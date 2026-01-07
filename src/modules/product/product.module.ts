import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { VendorProductController } from './controllers/vendor-product.controller';
import { UserProductController } from './controllers/user-product.controller';
import { SharedModule } from '../../shared/shared.module';
import { FileModule } from '../file/file.module';

@Module({
    imports: [SharedModule, FileModule],
    controllers: [VendorProductController, UserProductController],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductModule { }

