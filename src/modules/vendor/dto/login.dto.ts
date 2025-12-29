import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VendorLoginDto {
    @ApiProperty({ example: 'vendor@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

