import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileUpdateRequestDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: '1234567890' })
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiPropertyOptional({ example: '+92' })
    @IsString()
    @IsOptional()
    dial_code?: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    categoryId: string;

    @ApiProperty({ example: '123 Main Street' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ example: 'New York, NY' })
    @IsString()
    @IsNotEmpty()
    location: string;

    @ApiProperty({ example: 'https://example.com' })
    @IsUrl()
    @IsNotEmpty()
    website: string;
}

