export class sanitizeUserUtils {
    static sanitizeUser(user: any, profileImageFile?: any) {
        if (!user) return null;

        // Convert to plain object, preserving manually attached properties
        let userObj: any;
        if (user.toObject) {
            userObj = user.toObject({ virtuals: true });
            // Manually copy profileImageFile if it was passed or attached
            if (profileImageFile) {
                userObj.profileImageFile = profileImageFile;
            } else if ((user as any).profileImageFile) {
                userObj.profileImageFile = (user as any).profileImageFile;
            }
        } else {
            userObj = user;
            // If profileImageFile was passed, add it to the object
            if (profileImageFile) {
                userObj.profileImageFile = profileImageFile;
            }
        }

        // Transform _id to id
        if (userObj._id && typeof userObj._id === 'object') {
            userObj.id = userObj._id.toString();
            delete userObj._id;
        }

        // Handle profileImageFile virtual field - return as object from files table
        console.log('🔍 [Sanitize User] Checking profileImageFile. Has profileImageFile:', !!userObj.profileImageFile);
        if (userObj.profileImageFile) {
            // If profileImageFile is populated, return it as an object
            const profileImageObj = userObj.profileImageFile.toObject ? userObj.profileImageFile.toObject() : userObj.profileImageFile;
            console.log('✅ [Sanitize User] profileImageFile found:', {
                id: profileImageObj._id ? profileImageObj._id.toString() : profileImageObj.id,
                path: profileImageObj.path,
                subType: profileImageObj.subType,
            });
            // Build complete URL for the image with full domain
            let imageUrl: string | null = null;
            if (profileImageObj.path) {
                // Get base URL from environment or use default
                const baseUrl = process.env.APP_URL || 'http://localhost:3000';

                // Remove trailing slash from baseUrl if present
                const cleanBaseUrl = baseUrl.replace(/\/$/, '');

                // Check if path already includes /uploads/
                if (profileImageObj.path.startsWith('/uploads/')) {
                    imageUrl = `${cleanBaseUrl}${profileImageObj.path}`;
                } else if (profileImageObj.path.startsWith('http')) {
                    // Already a full URL
                    imageUrl = profileImageObj.path;
                } else {
                    // Build full URL with domain
                    imageUrl = `${cleanBaseUrl}/uploads/${profileImageObj.path}`;
                }
            }

            // Use constructed full URL (prefer our constructed one over virtual which might be relative)
            const finalUrl = imageUrl || profileImageObj.url;

            userObj.profileImage = {
                id: profileImageObj._id ? profileImageObj._id.toString() : profileImageObj.id,
                path: profileImageObj.path,
                path_link: finalUrl,
                type: profileImageObj.type,
                subType: profileImageObj.subType || 'profileImage',
                createdAt: profileImageObj.createdAt ? new Date(profileImageObj.createdAt).toISOString() : null,
            };
            // Remove profileImageFile from response (it's only used internally)
            delete userObj.profileImageFile;
        } else {
            // If no profileImageFile found, set to null
            console.log('⚠️ [Sanitize User] profileImageFile NOT found, setting to null');
            userObj.profileImage = null;
        }

        // Backward compatibility: also set avatar field if profileImage exists
        if (userObj.profileImage && userObj.profileImage.path) {
            userObj.avatar = `/uploads/${userObj.profileImage.path}`;
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