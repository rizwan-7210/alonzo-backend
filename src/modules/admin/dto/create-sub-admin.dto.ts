import { IsEmail, IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/user.constants';

export class CreateSubAdminDto {
    @ApiProperty({ description: 'First name of the sub-admin', example: 'Tom' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ description: 'Last name of the sub-admin', example: 'Albert' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ description: 'Email address of the sub-admin', example: 'tomalbert@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Password for the sub-admin account', example: 'password123', minLength: 6 })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ description: 'Phone number of the sub-admin', example: '+11234567890' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ description: 'Address of the sub-admin' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ 
        description: 'List of permissions for the sub-admin',
        enum: Permission,
        isArray: true,
        example: [Permission.DASHBOARD_ACCESS, Permission.USER_MANAGEMENT]
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

