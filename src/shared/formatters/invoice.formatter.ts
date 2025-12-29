import { BaseFormatter } from './base.formatter';

export class InvoiceFormatter {
    /**
     * Format invoice response
     */
    static format(invoice: any): any {
        if (!invoice) return null;

        const invoiceObj = BaseFormatter.toPlainObject(invoice);
        const response: any = {};

        // Map _id to id
        BaseFormatter.mapId(invoiceObj, response);

        // Map invoice properties
        const properties = [
            'invoiceNumber',
            'stripeInvoiceId',
            'amount',
            'currency',
            'status',
            'lineItems',
        ];

        BaseFormatter.mapProperties(invoiceObj, response, properties);

        // Convert ObjectIds
        if (invoiceObj.booking) {
            response.bookingId = BaseFormatter.objectIdToString(invoiceObj.booking);
        }

        if (invoiceObj.user) {
            response.userId = BaseFormatter.objectIdToString(invoiceObj.user);
        }

        // Convert dates
        BaseFormatter.convertDates(response, [
            'invoiceDate',
            'dueDate',
            'paidAt',
            'createdAt',
            'updatedAt',
        ]);

        return response;
    }
}

