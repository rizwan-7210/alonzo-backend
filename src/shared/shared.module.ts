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
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewRepository } from './repositories/review.repository';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoiceRepository } from './repositories/invoice.repository';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoryRepository } from './repositories/category.repository';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductRepository } from './repositories/product.repository';
import { PushNotification, PushNotificationSchema } from './schemas/push-notification.schema';
import { PushNotificationRepository } from './repositories/push-notification.repository';
import { ProfileUpdateRequest, ProfileUpdateRequestSchema } from './schemas/profile-update-request.schema';
import { ProfileUpdateRequestRepository } from './repositories/profile-update-request.repository';
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
            { name: Review.name, schema: ReviewSchema },
            { name: Invoice.name, schema: InvoiceSchema },
            { name: Category.name, schema: CategorySchema },
            { name: Product.name, schema: ProductSchema },
            { name: PushNotification.name, schema: PushNotificationSchema },
            { name: ProfileUpdateRequest.name, schema: ProfileUpdateRequestSchema },
        ]),
    ],
    providers: [UserRepository, FileRepository, NotificationRepository, ContactRepository, PasswordResetRepository, PlanRepository, UserSubscriptionRepository, PaymentLogRepository, ReviewRepository, InvoiceRepository, CategoryRepository, ProductRepository, PushNotificationRepository, ProfileUpdateRequestRepository, FormatterService],
    exports: [MongooseModule, UserRepository, FileRepository, NotificationRepository, ContactRepository, PasswordResetRepository, PlanRepository, UserSubscriptionRepository, PaymentLogRepository, ReviewRepository, InvoiceRepository, CategoryRepository, ProductRepository, PushNotificationRepository, ProfileUpdateRequestRepository, FormatterService],
})
export class SharedModule { }