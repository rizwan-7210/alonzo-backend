import { Module } from '@nestjs/common';
import { CategoryService } from '../admin/services/category.service';
import { SharedModule } from '../../shared/shared.module';
import { FileModule } from '../file/file.module';

@Module({
    imports: [SharedModule, FileModule],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoryModule { }

