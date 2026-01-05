import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: '1234', description: '4-6 digit verification code' })
    @IsString()
    @IsNotEmpty()
    @Length(4, 6, { message: 'Token must be between 4 and 6 digits' })
    @Matches(/^\d+$/, { message: 'Token must contain only digits' })
    token: string;
}

