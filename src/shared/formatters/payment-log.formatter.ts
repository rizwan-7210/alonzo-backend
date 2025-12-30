import { BaseFormatter } from './base.formatter';
import { PaymentType } from '../../common/constants/payment.constants';

export class PaymentLogFormatter {
    /**
     * Format payment log response
     */
    static format(paymentLog: any): any {
        if (!paymentLog) return null;

        const logObj = BaseFormatter.toPlainObject(paymentLog);
        const response: any = {};

        // Map _id to id
        BaseFormatter.mapId(logObj, response);

        // Map payment log properties
        const properties = [
            'paymentType',
            'paymentIntentId',
            'amount',
            'currency',
            'status',
            'metadata',
        ];

        BaseFormatter.mapProperties(logObj, response, properties);

        // Convert ObjectIds
        if (logObj.userId) {
            response.userId = BaseFormatter.objectIdToString(logObj.userId);
        }

        if (logObj.bookingId) {
            response.bookingId = BaseFormatter.objectIdToString(logObj.bookingId);
        }

        if (logObj.planId) {
            response.planId = BaseFormatter.objectIdToString(logObj.planId);
        }

        if (logObj.subscriptionId) {
            response.subscriptionId = BaseFormatter.objectIdToString(logObj.subscriptionId);
        }

        // Convert dates
        BaseFormatter.convertDates(response, ['createdAt', 'updatedAt']);

        return response;
    }

    /**
     * Format payment log for listing (with user info)
     */
    static formatForListing(paymentLog: any, index: number, page: number, limit: number): any {
        const formatted = this.format(paymentLog);
        if (!formatted) return null;

        const logObj = BaseFormatter.toPlainObject(paymentLog);
        const user = logObj.userId ? BaseFormatter.toPlainObject(logObj.userId) : {};

        // Get user name and email
        const userObj = user && typeof user === 'object' ? user : {};
        const userName = userObj.firstName && userObj.lastName
            ? `${userObj.firstName} ${userObj.lastName}`
            : userObj.email || 'N/A';

        // Format type display name
        let typeDisplay = 'N/A';
        if (formatted.paymentType === PaymentType.SUBSCRIPTION) {
            typeDisplay = 'Subscription';
        } else if (formatted.paymentType === PaymentType.ONE_TIME) {
            typeDisplay = 'One-time Payment';
        }

        // Format date as MM/DD/YYYY
        const dateFormatted = logObj.createdAt
            ? BaseFormatter.dateToFormatted(logObj.createdAt)
            : 'N/A';

        // Format amount with currency
        const amountFormatted = `$${formatted.amount.toFixed(2)}`;

        return {
            serialNumber: (page - 1) * limit + index + 1,
            ...formatted,
            userId: BaseFormatter.objectIdToString(userObj._id || logObj.userId),
            userName,
            email: userObj.email || 'N/A',
            type: formatted.paymentType,
            typeDisplay,
            date: dateFormatted,
            amountFormatted,
        };
    }
}

