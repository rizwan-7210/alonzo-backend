import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/user.constants';

export class UpdateSubAdminPermissionsDto {
    @ApiProperty({ 
        description: 'List of permissions for the sub-admin',
        enum: Permission,
        isArray: true,
        example: [Permission.DASHBOARD_ACCESS, Permission.USER_MANAGEMENT]
    })
    @IsArray()
    @IsEnum(Permission, { each: true })
    permissions: Permission[];

    @ApiPropertyOptional({ description: 'Description of rights/permissions', example: 'Can manage users and bookings' })
    @IsString()
    @IsOptional()
    rights?: string;
}

