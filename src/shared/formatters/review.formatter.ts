import { BaseFormatter } from './base.formatter';

export class ReviewFormatter {
    /**
     * Format review response
     */
    static format(review: any): any {
        if (!review) return null;

        const reviewObj = BaseFormatter.toPlainObject(review);
        const response: any = {};

        // Map _id to id
        BaseFormatter.mapId(reviewObj, response);

        // Map review properties
        const properties = [
            'rating',
            'review',
        ];

        BaseFormatter.mapProperties(reviewObj, response, properties);

        // Convert ObjectIds
        if (reviewObj.booking) {
            response.bookingId = BaseFormatter.objectIdToString(reviewObj.booking);
        }

        if (reviewObj.user) {
            response.userId = BaseFormatter.objectIdToString(reviewObj.user);
        }

        // Convert dates
        BaseFormatter.convertDates(response, ['createdAt', 'updatedAt']);

        // Add reviewedAt alias
        if (response.createdAt) {
            response.reviewedAt = response.createdAt;
        }

        return response;
    }
}

