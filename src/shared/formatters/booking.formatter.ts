import { BaseFormatter } from './base.formatter';
import { SlotType } from '../../common/constants/availability.constants';

export class BookingFormatter {
    /**
     * Format booking response
     */
    static format(booking: any, includeReview = false, review?: any): any {
        if (!booking) return null;

        const bookingObj = BaseFormatter.toPlainObject(booking);
        const response: any = {};

        // Map _id to id
        BaseFormatter.mapId(bookingObj, response);

        // Convert user ObjectId to string
        if (bookingObj.user) {
            response.user = BaseFormatter.objectIdToString(bookingObj.user);
        }

        // Map booking properties
        const properties = [
            'type',
            'date',
            'slots',
            'status',
            'paymentStatus',
            'amount',
            'details',
            'zoomLink',
            'rejectionReason',
            'isRescheduled',
            'address',
        ];

        BaseFormatter.mapProperties(bookingObj, response, properties);

        // Convert dates
        if (response.date) {
            response.date = BaseFormatter.dateToISO(response.date);
        }

        // Add formatted date
        if (bookingObj.date) {
            response.dateFormatted = BaseFormatter.dateToFormatted(bookingObj.date);
        }

        // Add type display name
        if (response.type) {
            response.typeDisplay = this.getTypeDisplayName(response.type);
        }

        // Add booking ID formatted (last 6 characters)
        if (response.id) {
            const bookingId = response.id.slice(-6).padStart(6, '0');
            response.bookingId = `#${bookingId}`;
        }

        // Add review if requested
        if (includeReview && review) {
            const reviewObj = BaseFormatter.toPlainObject(review);
            response.review = {
                id: BaseFormatter.objectIdToString(reviewObj._id),
                rating: reviewObj.rating,
                review: reviewObj.review,
                reviewedAt: BaseFormatter.dateToISO(reviewObj.createdAt),
            };
        }

        // Convert timestamps
        BaseFormatter.convertDates(response, ['createdAt', 'updatedAt']);

        return response;
    }

    /**
     * Format booking for listing (with user info)
     */
    static formatForListing(booking: any, index: number, page: number, limit: number): any {
        const formatted = this.format(booking);
        if (!formatted) return null;

        const bookingObj = BaseFormatter.toPlainObject(booking);
        const user = bookingObj.user?.toObject ? bookingObj.user.toObject() : bookingObj.user || {};

        return {
            serialNumber: (page - 1) * limit + index + 1,
            ...formatted,
            userId: BaseFormatter.objectIdToString(user._id || bookingObj.user),
            userName: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email || 'N/A',
            email: user.email || 'N/A',
            phone: user.phone || 'N/A',
            date: formatted.dateFormatted || formatted.date,
        };
    }

    /**
     * Get type display name
     */
    private static getTypeDisplayName(type: string): string {
        switch (type) {
            case SlotType.VIDEO_CONSULTANCY:
                return 'Video Consultation';
            case SlotType.ONSITE_APPOINTMENT:
                return 'Onsite Visit';
            default:
                return 'N/A';
        }
    }
}

