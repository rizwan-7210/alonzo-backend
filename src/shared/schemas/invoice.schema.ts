import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum InvoiceStatus {
    DRAFT = 'draft',
    OPEN = 'open',
    PAID = 'paid',
    VOID = 'void',
    UNCOLLECTIBLE = 'uncollectible',
}

export type InvoiceDocument = Invoice & Document;

@Schema({
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
})
export class Invoice {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true, unique: true })
    booking: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: MongooseSchema.Types.ObjectId;

    @Prop({ type: String, required: true, unique: true })
    invoiceNumber: string;

    @Prop({ type: String, required: true })
    stripeInvoiceId: string;

    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ type: String, default: 'usd' })
    currency: string;

    @Prop({
        type: String,
        enum: Object.values(InvoiceStatus),
        default: InvoiceStatus.DRAFT,
    })
    status: InvoiceStatus;

    @Prop({ type: Date })
    invoiceDate: Date;

    @Prop({ type: Date })
    dueDate?: Date;

    @Prop({ type: Date })
    paidAt?: Date;

    @Prop({ type: MongooseSchema.Types.Mixed })
    lineItems?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;

    @Prop({ type: MongooseSchema.Types.Mixed })
    metadata?: Record<string, any>;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ booking: 1 });
InvoiceSchema.index({ user: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ stripeInvoiceId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ createdAt: -1 });

