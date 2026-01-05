// Entity representation for User (used for type definitions)
// Note: The actual schema is defined in src/shared/schemas/user.schema.ts

export interface UserEntity {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dial_code?: string;
    role: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}

