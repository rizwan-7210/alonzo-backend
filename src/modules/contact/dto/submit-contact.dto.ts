import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitContactDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Help with my account' })
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    subject: string;

    @ApiProperty({ example: 'I need help with my account settings...' })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    message: string;

    @ApiProperty({ example: 'guest', enum: ['guest', 'user'], default: 'guest' })
    @IsString()
    @IsOptional()
    userType?: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011', required: false })
    @IsString()
    @IsOptional()
    userId?: string;
}