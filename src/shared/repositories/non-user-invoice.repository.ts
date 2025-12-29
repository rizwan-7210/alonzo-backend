import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { NonUserInvoice, NonUserInvoiceDocument } from '../schemas/non-user-invoice.schema';
import { NonUserInvoiceStatus } from '../schemas/non-user-invoice.schema';

@Injectable()
export class NonUserInvoiceRepository extends BaseRepository<NonUserInvoiceDocument> {
    constructor(
        @InjectModel(NonUserInvoice.name)
        private nonUserInvoiceModel: Model<NonUserInvoiceDocument>,
    ) {
        super(nonUserInvoiceModel);
    }

    async findByInvoiceNumber(invoiceNumber: string): Promise<NonUserInvoiceDocument | null> {
        return this.nonUserInvoiceModel.findOne({ invoiceNumber }).exec();
    }

    async findByStripeCheckoutSessionId(sessionId: string): Promise<NonUserInvoiceDocument | null> {
        return this.nonUserInvoiceModel.findOne({ stripeCheckoutSessionId: sessionId }).exec();
    }

    async findByStripePaymentIntentId(paymentIntentId: string): Promise<NonUserInvoiceDocument | null> {
        return this.nonUserInvoiceModel.findOne({ stripePaymentIntentId: paymentIntentId }).exec();
    }

    async findByEmail(email: string): Promise<NonUserInvoiceDocument[]> {
        return this.nonUserInvoiceModel.find({ email }).sort({ createdAt: -1 }).exec();
    }

    async updateStatus(invoiceId: string, status: NonUserInvoiceStatus, paidAt?: Date): Promise<NonUserInvoiceDocument | null> {
        const updateData: any = { status };
        if (paidAt) {
            updateData.paidAt = paidAt;
        }
        return this.nonUserInvoiceModel.findByIdAndUpdate(
            invoiceId,
            updateData,
            { new: true }
        ).exec();
    }

    async updateStripeInfo(
        invoiceId: string,
        stripeCheckoutSessionId?: string,
        stripePaymentLink?: string,
        stripePaymentIntentId?: string,
        stripeCustomerId?: string
    ): Promise<NonUserInvoiceDocument | null> {
        const updateData: any = {};
        if (stripeCheckoutSessionId) updateData.stripeCheckoutSessionId = stripeCheckoutSessionId;
        if (stripePaymentLink) updateData.stripePaymentLink = stripePaymentLink;
        if (stripePaymentIntentId) updateData.stripePaymentIntentId = stripePaymentIntentId;
        if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId;

        return this.nonUserInvoiceModel.findByIdAndUpdate(
            invoiceId,
            updateData,
            { new: true }
        ).exec();
    }
}

