import { Module } from '@nestjs/common';
import { PlansService } from './services/plans.service';
import { AdminPlansController } from './controllers/admin-plans.controller';
import { VendorPlansController } from './controllers/vendor-plans.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [AdminPlansController, VendorPlansController],
    providers: [PlansService],
    exports: [PlansService],
})
export class PlansModule { }

