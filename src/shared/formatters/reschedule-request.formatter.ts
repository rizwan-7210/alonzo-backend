import { BaseFormatter } from './base.formatter';
import { BookingFormatter } from './booking.formatter';

export class RescheduleRequestFormatter {
    /**
     * Format reschedule request response
     */
    static format(request: any, includeBooking = false): any {
        if (!request) return null;

        const requestObj = BaseFormatter.toPlainObject(request);
        const response: any = {};

        // Map _id to id
        BaseFormatter.mapId(requestObj, response);

        // Map reschedule request properties
        const properties = [
            'requestedDate',
            'requestedSlots',
            'status',
            'requestedBy',
            'adminNotes',
        ];

        BaseFormatter.mapProperties(requestObj, response, properties);

        // Convert ObjectIds
        if (requestObj.user) {
            response.userId = BaseFormatter.objectIdToString(requestObj.user);
        }

        if (requestObj.booking) {
            response.bookingId = BaseFormatter.objectIdToString(requestObj.booking);
        }

        if (requestObj.reviewedBy) {
            response.reviewedBy = BaseFormatter.objectIdToString(requestObj.reviewedBy);
        }

        // Convert dates
        if (response.requestedDate) {
            response.requestedDate = BaseFormatter.dateToISO(response.requestedDate);
            response.requestedDateFormatted = BaseFormatter.dateToFormatted(requestObj.requestedDate);
        }

        BaseFormatter.convertDates(response, ['reviewedAt', 'createdAt', 'updatedAt']);

        // Format requested time slots
        if (response.requestedSlots && Array.isArray(response.requestedSlots)) {
            response.requestedTimeSlots = response.requestedSlots
                .map((slot: any) => `${slot.startTime} - ${slot.endTime}`)
                .join(', ');
        }

        // Include booking if requested
        if (includeBooking && requestObj.booking) {
            const bookingObj = requestObj.booking?.toObject 
                ? requestObj.booking.toObject() 
                : requestObj.booking;
            response.booking = BookingFormatter.format(bookingObj);
        }

        return response;
    }

    /**
     * Format reschedule request for listing
     */
    static formatForListing(request: any, index: number, page: number, limit: number): any {
        const formatted = this.format(request);
        if (!formatted) return null;

        const requestObj = BaseFormatter.toPlainObject(request);
        const bookingObj = requestObj.booking?.toObject 
            ? requestObj.booking.toObject() 
            : requestObj.booking;
        const user = requestObj.user?.toObject 
            ? requestObj.user.toObject() 
            : requestObj.user || {};

        // Get booking type display
        let typeDisplay = 'N/A';
        if (bookingObj?.type) {
            typeDisplay = bookingObj.type === 'video_consultancy' 
                ? 'Video Consultation' 
                : bookingObj.type === 'onsite_appointment' 
                    ? 'Onsite Visit' 
                    : 'N/A';
        }

        // Format booking ID
        const bookingId = bookingObj?._id?.toString().slice(-6).padStart(6, '0') || 'N/A';

        return {
            serialNumber: (page - 1) * limit + index + 1,
            ...formatted,
            bookingId: `#${bookingId}`,
            userId: BaseFormatter.objectIdToString(user._id || requestObj.user),
            userName: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email || 'N/A',
            email: user.email || 'N/A',
            type: bookingObj?.type || 'N/A',
            typeDisplay,
            date: formatted.requestedDateFormatted || formatted.requestedDate,
            requestType: 'Reschedule Appointment', // Can be enhanced to detect appointment vs reschedule
        };
    }
}

