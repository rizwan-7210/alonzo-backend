import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';

@Injectable()
export class InvoiceRepository extends BaseRepository<InvoiceDocument> {
    constructor(
        @InjectModel(Invoice.name) protected readonly invoiceModel: Model<InvoiceDocument>,
    ) {
        super(invoiceModel);
    }

    async findByBooking(bookingId: string): Promise<InvoiceDocument | null> {
        return this.invoiceModel
            .findOne({ booking: new Types.ObjectId(bookingId) })
            .populate('booking')
            .populate('user')
            .exec();
    }

    async findByUser(userId: string): Promise<InvoiceDocument[]> {
        return this.invoiceModel
            .find({ user: new Types.ObjectId(userId) })
            .populate('booking')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceDocument | null> {
        return this.invoiceModel
            .findOne({ invoiceNumber })
            .populate('booking')
            .populate('user')
            .exec();
    }

    async findByStripeInvoiceId(stripeInvoiceId: string): Promise<InvoiceDocument | null> {
        return this.invoiceModel
            .findOne({ stripeInvoiceId })
            .populate('booking')
            .populate('user')
            .exec();
    }
}

