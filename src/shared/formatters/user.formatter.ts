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

        // Handle profile image file if populated
        if (userObj.profileImageFile) {
            const profileImageObj = BaseFormatter.toPlainObject(userObj.profileImageFile);
            response.profileImage = {
                id: BaseFormatter.objectIdToString(profileImageObj._id),
                name: profileImageObj.name,
                path: profileImageObj.path,
                url: profileImageObj.url,
                mimeType: profileImageObj.mimeType,
                size: profileImageObj.size,
            };
            // Backward compatibility
            response.avatar = response.profileImage.url || `/uploads/${response.profileImage.path}`;
        } else if (userObj.profileImage) {
            // If profileImage is an ObjectId but not populated
            response.profileImage = BaseFormatter.objectIdToString(userObj.profileImage);
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

