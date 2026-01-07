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

    @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({ example: '123 Main Street' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ example: 'New York, NY' })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiPropertyOptional({ example: 'https://example.com' })
    @IsUrl()
    @IsOptional()
    website?: string;
}

