export enum UserRole {
    ADMIN = 'admin',
    VENDOR = 'vendor',
    USER = 'user',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

export enum AccountStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum Permission {
    USER_PROFILE_READ = 'user:profile:read',
    USER_PROFILE_UPDATE = 'user:profile:update',
    USER_PASSWORD_UPDATE = 'user:password:update',
    ADMIN_ACCESS = 'admin:access',
    USER_MANAGE = 'user:manage',
}