import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
    @ApiProperty({ example: 'John', required: true, description: 'User first name' })
    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty({ message: 'First name is required' })
    @MinLength(1, { message: 'First name must be at least 1 character long' })
    firstName: string;

    @ApiProperty({ example: 'Doe', required: true, description: 'User last name' })
    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty({ message: 'Last name is required' })
    @MinLength(1, { message: 'Last name must be at least 1 character long' })
    lastName: string;

    @ApiProperty({ example: '1234567890', required: true, description: 'User phone number' })
    @IsString({ message: 'Phone must be a string' })
    @IsNotEmpty({ message: 'Phone is required' })
    phone: string;

    @ApiPropertyOptional({ example: '+1', description: 'Phone dial code' })
    @IsString({ message: 'Dial code must be a string' })
    @IsOptional()
    dial_code?: string;

    @ApiPropertyOptional({ 
        type: 'string', 
        format: 'binary', 
        description: 'Profile image file (jpg, png, jpeg)' 
    })
    @IsOptional()
    profileImage?: any;
}
