import { IsEmail, IsString, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/user.constants';
import { UserStatus } from '../../../common/constants/user.constants';

export class UpdateSubAdminDto {
    @ApiPropertyOptional({ description: 'First name of the sub-admin', example: 'Tom' })
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name of the sub-admin', example: 'Albert' })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({ description: 'Email address of the sub-admin', example: 'tomalbert@gmail.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ description: 'Password for the sub-admin account', example: 'password123', minLength: 6 })
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({ description: 'Phone number of the sub-admin', example: '+11234567890' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ description: 'Address of the sub-admin' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ description: 'Status of the sub-admin', enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;

    @ApiPropertyOptional({ 
        description: 'List of permissions for the sub-admin',
        enum: Permission,
        isArray: true
    })
    @IsArray()
    @IsEnum(Permission, { each: true })
    @IsOptional()
    permissions?: Permission[];

    @ApiPropertyOptional({ description: 'Description of rights/permissions', example: 'Can manage users and bookings' })
    @IsString()
    @IsOptional()
    rights?: string;
}

