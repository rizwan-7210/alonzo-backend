export class sanitizeUserUtils {
    static sanitizeUser(user: any) {
        if (!user) return null;

        const userObj = user.toObject ? user.toObject() : user;

        // Transform _id to id
        if (userObj._id && typeof userObj._id === 'object') {
            userObj.id = userObj._id.toString();
            delete userObj._id;
        }

        // Handle profileImageFile virtual field
        if (userObj.profileImageFile) {
            // If profileImageFile is populated, include it in the response
            // It will have its own url virtual from the File schema
            if (userObj.profileImageFile.url) {
                userObj.profileImage = userObj.profileImageFile.url;
            } else if (userObj.profileImageFile.path) {
                userObj.profileImage = `/uploads/${userObj.profileImageFile.path}`;
            }
        } else if (userObj.profileImage) {
            // If profileImage is an ObjectId, it needs to be populated
            // For now, set to null if not populated
            userObj.profileImage = null;
        } else {
            userObj.profileImage = null;
        }

        // Backward compatibility: also set avatar field if profileImage exists
        if (userObj.profileImage) {
            userObj.avatar = userObj.profileImage;
        } else {
            userObj.avatar = null;
        }

        // Convert dates from objects to ISO strings
        if (userObj.createdAt && typeof userObj.createdAt === 'object') {
            userObj.createdAt = new Date(userObj.createdAt).toISOString();
        }
        if (userObj.updatedAt && typeof userObj.updatedAt === 'object') {
            userObj.updatedAt = new Date(userObj.updatedAt).toISOString();
        }
        if (userObj.deletedAt && typeof userObj.deletedAt === 'object') {
            userObj.deletedAt = new Date(userObj.deletedAt).toISOString();
        }

        // Remove sensitive fields
        delete userObj.password;
        delete userObj.refreshToken;
        delete userObj.__v;

        return userObj;
    }
}