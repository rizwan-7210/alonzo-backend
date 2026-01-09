import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthForgotPasswordDto {
    @ApiProperty({ example: 'lewis@mailinator.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}