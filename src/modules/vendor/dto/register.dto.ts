import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional, IsMongoId, IsUrl, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class VendorRegisterDto {
    @ApiProperty({ example: 'vendor@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Pharmacy' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Name', required: false })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message:
            'Password too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    })
    password: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @IsNotEmpty()
    confirmPassword: string;

    @ApiProperty({ example: '+1234567890' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ example: '+92', required: false })
    @IsString()
    @IsOptional()
    dial_code?: string;

    @ApiProperty({ example: '123 Main St', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 'https://maps.google.com/?q=Lahore+Pakistan', required: false, description: 'Google Maps link' })
    @IsOptional()
    @IsString()
    @ValidateIf((o) => o.location !== undefined && o.location !== null && o.location !== '')
    @IsUrl(
        {
            protocols: ['http', 'https'],
            require_protocol: true,
        },
        {
            message: 'Location must be a valid Google Maps URL',
        }
    )
    @ValidateIf((o) => o.location !== undefined && o.location !== null && o.location !== '')
    @Matches(/maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl/, {
        message: 'Location must be a Google Maps link',
    })
    location?: string;

    @ApiProperty({ example: 'example.com', required: true, description: 'Website URL or domain name' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/, {
        message: 'Website must be a valid domain name or URL',
    })
    website: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Category ID' })
    @IsMongoId()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ type: 'string', format: 'binary', required: true, description: 'Profile image file' })
    @IsOptional()
    profileImage?: any;

    @ApiProperty({ type: 'string', format: 'binary', required: true, description: 'Pharmacy license file' })
    @IsOptional()
    pharmacyLicense?: any;

    @ApiProperty({ type: 'string', format: 'binary', required: true, description: 'Registration certificate file' })
    @IsOptional()
    registrationCertificate?: any;
}

