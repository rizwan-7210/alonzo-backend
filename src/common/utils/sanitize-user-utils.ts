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

        // Handle categoryId - convert to string if it's an ObjectId
        if (userObj.categoryId && typeof userObj.categoryId === 'object') {
            userObj.categoryId = userObj.categoryId.toString();
        }

        // Handle category relation - if populated, use it; otherwise keep categoryId as string
        if (userObj.category) {
            const categoryObj = userObj.category.toObject ? userObj.category.toObject() : userObj.category;
            userObj.category = {
                id: categoryObj._id ? categoryObj._id.toString() : categoryObj.id,
                title: categoryObj.title,
                status: categoryObj.status,
                createdAt: categoryObj.createdAt ? new Date(categoryObj.createdAt).toISOString() : null,
                updatedAt: categoryObj.updatedAt ? new Date(categoryObj.updatedAt).toISOString() : null,
            };
            // Keep categoryId as string reference
            userObj.categoryId = userObj.category.id;
        } else if (userObj.categoryId) {
            // If category is not populated, ensure categoryId is a string and set category to null
            userObj.categoryId = typeof userObj.categoryId === 'object' 
                ? userObj.categoryId.toString() 
                : userObj.categoryId;
            userObj.category = null;
        } else {
            userObj.category = null;
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