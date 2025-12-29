import { BaseFormatter } from './base.formatter';

export class UserFormatter {
    /**
     * Format user response
     */
    static format(user: any): any {
        if (!user) return null;

        const userObj = BaseFormatter.toPlainObject(user);
        const response: any = {};

        // Map _id to id
        BaseFormatter.mapId(userObj, response);

        // Map user properties
        const properties = [
            'firstName',
            'lastName',
            'email',
            'phone',
            'address',
            'role',
            'status',
            'avatar',
            'stripeCustomerId',
        ];

        BaseFormatter.mapProperties(userObj, response, properties);

        // Normalize avatar to always be `/uploads/<filename>` if it's just a filename
        if (response.avatar) {
            // If it already starts with /uploads/, keep as is
            if (!response.avatar.startsWith('/uploads/')) {
                response.avatar = `/uploads/${response.avatar}`;
            }
        }

        // Add full name
        if (response.firstName && response.lastName) {
            response.fullName = `${response.firstName} ${response.lastName}`;
        }

        // Handle avatar file if populated
        if (userObj.avatarFile) {
            const avatarObj = BaseFormatter.toPlainObject(userObj.avatarFile);
            response.avatarFile = {
                id: BaseFormatter.objectIdToString(avatarObj._id),
                name: avatarObj.name,
                path: avatarObj.path,
                url: avatarObj.url,
                mimeType: avatarObj.mimeType,
                size: avatarObj.size,
            };
        }

        // Convert timestamps
        BaseFormatter.convertDates(response, ['createdAt', 'updatedAt', 'deletedAt']);

        return response;
    }

    /**
     * Format user for listing
     */
    static formatForListing(user: any, index: number, page: number, limit: number): any {
        const formatted = this.format(user);
        if (!formatted) return null;

        return {
            serialNumber: (page - 1) * limit + index + 1,
            ...formatted,
        };
    }
}

