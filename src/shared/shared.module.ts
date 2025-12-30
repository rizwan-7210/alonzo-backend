import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { File, FileSchema } from './schemas/file.schema';
import { UserRepository } from './repositories/user.repository';
import { FileRepository } from './repositories/file.repository';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { Contact, ContactSchema } from './schemas/contact.schema';
import { NotificationRepository } from './repositories/notification.repository';
import { ContactRepository } from './repositories/contact.repository';
import { PasswordReset, PasswordResetSchema } from './schemas/password-reset.schema';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { UserSubscription, UserSubscriptionSchema } from './schemas/user-subscription.schema';
import { PlanRepository } from './repositories/plan.repository';
import { UserSubscriptionRepository } from './repositories/user-subscription.repository';
import { PaymentLog, PaymentLogSchema } from './schemas/payment-log.schema';
import { PaymentLogRepository } from './repositories/payment-log.repository';
import { Availability, AvailabilitySchema } from './schemas/availability.schema';
import { AvailabilityRepository } from './repositories/availability.repository';
import { Pricing, PricingSchema } from './schemas/pricing.schema';
import { PricingLog, PricingLogSchema } from './schemas/pricing-log.schema';
import { PricingRepository } from './repositories/pricing.repository';
import { PricingLogRepository } from './repositories/pricing-log.repository';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewRepository } from './repositories/review.repository';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceRepository } from './repositories/invoice.repository';
import { NonUserInvoice, NonUserInvoiceSchema } from './schemas/non-user-invoice.schema';
import { NonUserInvoiceRepository } from './repositories/non-user-invoice.repository';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoryRepository } from './repositories/category.repository';
import { FormatterService } from './services/formatter.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: File.name, schema: FileSchema },
            { name: Notification.name, schema: NotificationSchema },
            { name: Contact.name, schema: ContactSchema },
            { name: PasswordReset.name, schema: PasswordResetSchema },
            { name: Plan.name, schema: PlanSchema },
            { name: UserSubscription.name, schema: UserSubscriptionSchema },
            { name: PaymentLog.name, schema: PaymentLogSchema },
            { name: Availability.name, schema: AvailabilitySchema },
            { name: Pricing.name, schema: PricingSchema },
            { name: PricingLog.name, schema: PricingLogSchema },
            { name: Review.name, schema: ReviewSchema },
            { name: Invoice.name, schema: InvoiceSchema },
            { name: NonUserInvoice.name, schema: NonUserInvoiceSchema },
            { name: Category.name, schema: CategorySchema },
        ]),
    ],
    providers: [UserRepository, FileRepository, NotificationRepository, ContactRepository, PasswordResetRepository, PlanRepository, UserSubscriptionRepository, PaymentLogRepository, AvailabilityRepository, PricingRepository, PricingLogRepository, ReviewRepository, InvoiceRepository, NonUserInvoiceRepository, CategoryRepository, FormatterService],
    exports: [MongooseModule, UserRepository, FileRepository, NotificationRepository, ContactRepository, PasswordResetRepository, PlanRepository, UserSubscriptionRepository, PaymentLogRepository, AvailabilityRepository, PricingRepository, PricingLogRepository, ReviewRepository, InvoiceRepository, NonUserInvoiceRepository, CategoryRepository, FormatterService],
})
export class SharedModule { }