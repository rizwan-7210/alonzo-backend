import { Injectable } from '@nestjs/common';
import {
    BaseFormatter,
    UserFormatter,
    InvoiceFormatter,
    ReviewFormatter,
    PaymentLogFormatter,
    NonUserInvoiceFormatter,
} from '../formatters';

/**
 * Centralized formatter service for all schemas
 */
@Injectable()
export class FormatterService {
    // User formatters
    formatUser(user: any) {
        return UserFormatter.format(user);
    }

    formatUserForListing(user: any, index: number, page: number, limit: number) {
        return UserFormatter.formatForListing(user, index, page, limit);
    }

    // Invoice formatters
    formatInvoice(invoice: any) {
        return InvoiceFormatter.format(invoice);
    }

    // Review formatters
    formatReview(review: any) {
        return ReviewFormatter.format(review);
    }

    // Payment log formatters
    formatPaymentLog(paymentLog: any) {
        return PaymentLogFormatter.format(paymentLog);
    }

    formatPaymentLogForListing(paymentLog: any, index: number, page: number, limit: number) {
        return PaymentLogFormatter.formatForListing(paymentLog, index, page, limit);
    }

    // Non-user invoice formatters
    formatNonUserInvoice(invoice: any) {
        return NonUserInvoiceFormatter.format(invoice);
    }

    formatNonUserInvoiceForListing(invoice: any, index: number, page: number, limit: number) {
        return NonUserInvoiceFormatter.formatForListing(invoice, index, page, limit);
    }

    // Base utilities (exposed for convenience)
    toPlainObject(document: any) {
        return BaseFormatter.toPlainObject(document);
    }

    objectIdToString(obj: any) {
        return BaseFormatter.objectIdToString(obj);
    }

    dateToISO(date: any) {
        return BaseFormatter.dateToISO(date);
    }

    dateToFormatted(date: any) {
        return BaseFormatter.dateToFormatted(date);
    }
}

