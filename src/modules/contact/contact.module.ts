import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { ContactService } from './services/contact.service';
import { AdminContactController } from './controllers/admin-contact.controller';
import { UserContactController } from './controllers/user-contact.controller';
import { VendorContactController } from './controllers/vendor-contact.controller';
import { ContactController } from './controllers/contact.controller';

@Module({
    imports: [SharedModule],
    providers: [ContactService],
    controllers: [
        AdminContactController,
        UserContactController,
        VendorContactController,
        ContactController, // Keep for guest submissions (public endpoint)
    ],
    exports: [ContactService],
})
export class ContactModule { }