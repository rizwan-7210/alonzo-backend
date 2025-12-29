import { BaseFormatter } from './base.formatter';

export class NonUserInvoiceFormatter {
    static format(invoice: any) {
        const plain = BaseFormatter.toPlainObject(invoice);
        
        return {
            id: BaseFormatter.objectIdToString(plain._id || plain.id),
            customerName: plain.customerName,
            email: plain.email,
            address: plain.address || null,
            invoiceNumber: plain.invoiceNumber,
            amount: plain.amount,
            currency: plain.currency || 'usd',
            status: plain.status,
            invoiceDate: BaseFormatter.dateToISO(plain.invoiceDate),
            dueDate: plain.dueDate ? BaseFormatter.dateToISO(plain.dueDate) : null,
            paidAt: plain.paidAt ? BaseFormatter.dateToISO(plain.paidAt) : null,
            stripeCheckoutSessionId: plain.stripeCheckoutSessionId || null,
            stripePaymentLink: plain.stripePaymentLink || null,
            stripePaymentIntentId: plain.stripePaymentIntentId || null,
            lineItems: plain.lineItems || [],
            metadata: plain.metadata || {},
            createdAt: BaseFormatter.dateToISO(plain.createdAt),
            updatedAt: BaseFormatter.dateToISO(plain.updatedAt),
        };
    }

    static formatForListing(invoice: any, index: number, page: number, limit: number) {
        const formatted = this.format(invoice);
        return {
            ...formatted,
            serialNumber: (page - 1) * limit + index + 1,
        };
    }
}

