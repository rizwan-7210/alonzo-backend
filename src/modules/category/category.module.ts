import { Module } from '@nestjs/common';
import { CategoryService } from '../admin/services/category.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
    imports: [SharedModule],
    providers: [CategoryService],
    exports: [CategoryService],
})
export class CategoryModule { }

