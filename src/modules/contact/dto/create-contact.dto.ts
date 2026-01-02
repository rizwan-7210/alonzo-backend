import { IsNotEmpty, IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '../../../common/constants/contact.constants';
import { Type } from 'class-transformer';

export class CreateContactDto {
    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011', description: 'User ID (optional, nullable)' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiProperty({ enum: UserType, example: UserType.GUEST, description: 'User type (required)' })
    @IsEnum(UserType, { message: 'userType must be one of: guest, vendor, user' })
    @IsNotEmpty({ message: 'userType is required' })
    userType: UserType;

    @ApiProperty({ example: 'John Doe', description: 'Name of the contact' })
    @IsString({ message: 'Name must be a string' })
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    @ApiProperty({ example: 'john@example.com', description: 'Email address' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({ example: 'Help with my account', description: 'Subject of the contact message' })
    @IsString({ message: 'Subject must be a string' })
    @IsNotEmpty({ message: 'Subject is required' })
    @MinLength(5, { message: 'Subject must be at least 5 characters long' })
    subject: string;

    @ApiProperty({ example: 'I need help with my account settings...', description: 'Message content' })
    @IsString({ message: 'Message must be a string' })
    @IsNotEmpty({ message: 'Message is required' })
    @MinLength(10, { message: 'Message must be at least 10 characters long' })
    message: string;
}

