import { BaseFormatter } from './base.formatter';
import { PaymentType } from '../../common/constants/payment.constants';

/** Check if value looks like a populated doc (object with _id and other keys) */
function isPopulatedObject(obj: any): boolean {
    return obj && typeof obj === 'object' && !Buffer.isBuffer(obj) && obj._id != null && Object.keys(obj).length > 1;
}

export class PaymentLogFormatter {
    private static formatPopulatedUser(user: any): string | { id: string; firstName?: string; lastName?: string; email?: string } | null {
        if (!user) return null;
        if (!isPopulatedObject(user)) return BaseFormatter.objectIdToString(user) ?? null;
        const id = BaseFormatter.objectIdToString(user._id ?? user.id) ?? '';
        return { id, firstName: user.firstName, lastName: user.lastName, email: user.email };
    }

    private static formatPopulatedPlan(plan: any): string | { id: string; title?: string; amount?: number; duration?: string; description?: string; status?: string } | null {
        if (!plan) return null;
        if (!isPopulatedObject(plan)) return BaseFormatter.objectIdToString(plan) ?? null;
        const id = BaseFormatter.objectIdToString(plan._id ?? plan.id) ?? '';
        return { id, title: plan.title, amount: plan.amount, duration: plan.duration, description: plan.description, status: plan.status };
    }

    private static formatPopulatedSubscription(sub: any): string | { id: string; status?: string; expiryDate?: string; duration?: string; amountPaid?: number } | null {
        if (!sub) return null;
        if (!isPopulatedObject(sub)) return BaseFormatter.objectIdToString(sub) ?? null;
        const id = BaseFormatter.objectIdToString(sub._id ?? sub.id) ?? '';
        const expiryDate = sub.expiryDate ? (typeof sub.expiryDate === 'string' ? sub.expiryDate : new Date(sub.expiryDate).toISOString()) : undefined;
        return { id, status: sub.status, expiryDate, duration: sub.duration, amountPaid: sub.amountPaid };
    }

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

        // Relations: return id string or populated object { id, ... }
        if (logObj.userId) {
            response.userId = this.formatPopulatedUser(logObj.userId);
        }

        if (logObj.bookingId) {
            response.bookingId = BaseFormatter.objectIdToString(logObj.bookingId);
        }

        if (logObj.planId) {
            response.planId = this.formatPopulatedPlan(logObj.planId);
        }

        if (logObj.subscriptionId) {
            response.subscriptionId = this.formatPopulatedSubscription(logObj.subscriptionId);
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
            userName,
            email: userObj.email || 'N/A',
            type: formatted.paymentType,
            typeDisplay,
            date: dateFormatted,
            amountFormatted,
        };
    }
}

