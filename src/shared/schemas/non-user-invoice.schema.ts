import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum NonUserInvoiceStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    PAID = 'paid',
    UNPAID = 'unpaid',
    CANCELLED = 'cancelled',
}

export type NonUserInvoiceDocument = NonUserInvoice & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret: any) => {
            if (ret._id) {
                ret.id = ret._id.toString();
                delete ret._id;
            }
            if (ret.__v !== undefined) {
                delete ret.__v;
            }
            return ret;
        },
    },
})
export class NonUserInvoice {
    @Prop({ type: String, required: true })
    customerName: string;

    @Prop({ type: String, required: true })
    email: string;

    @Prop({ type: String })
    address?: string;

    @Prop({ type: String, required: true, unique: true })
    invoiceNumber: string;

    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ type: String, default: 'usd' })
    currency: string;

    @Prop({
        type: String,
        enum: Object.values(NonUserInvoiceStatus),
        default: NonUserInvoiceStatus.DRAFT,
    })
    status: NonUserInvoiceStatus;

    @Prop({ type: Date, default: Date.now })
    invoiceDate: Date;

    @Prop({ type: Date })
    dueDate?: Date;

    @Prop({ type: Date })
    paidAt?: Date;

    @Prop({ type: String })
    stripeCheckoutSessionId?: string;

    @Prop({ type: String })
    stripePaymentLink?: string;

    @Prop({ type: String })
    stripePaymentIntentId?: string;

    @Prop({ type: String })
    stripeCustomerId?: string;

    @Prop({ type: [Object] })
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;

    @Prop({ type: Object })
    metadata?: Record<string, any>;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const NonUserInvoiceSchema = SchemaFactory.createForClass(NonUserInvoice);

NonUserInvoiceSchema.index({ email: 1 });
NonUserInvoiceSchema.index({ invoiceNumber: 1 });
NonUserInvoiceSchema.index({ status: 1 });
NonUserInvoiceSchema.index({ createdAt: -1 });
NonUserInvoiceSchema.index({ stripeCheckoutSessionId: 1 });

