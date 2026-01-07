import { IsOptional, IsEnum, IsNumber, Min, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from 'src/common/constants/product.constants';
import { Type, Transform } from 'class-transformer';

export class ProductQueryDto {
    @ApiProperty({ required: false, type: Number, example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiProperty({ required: false, type: Number, example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number;

    @ApiProperty({ required: false, enum: ProductStatus, description: 'Filter by product status' })
    @Transform(({ value }) => {
        // Convert empty string to undefined
        if (value === '' || value === null || value === undefined) return undefined;
        return value;
    })
    @IsEnum(ProductStatus, { message: 'status must be one of the following values: active, inactive' })
    @IsOptional()
    status?: ProductStatus;

    @ApiProperty({ required: false, description: 'Search by product title' })
    @Transform(({ value }) => {
        // Convert empty string to undefined
        if (value === '' || value === null || value === undefined) return undefined;
        return value;
    })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiProperty({ required: false, description: 'Filter products from this date (ISO 8601 format)', example: '2024-01-01' })
    @Transform(({ value }) => {
        // Convert empty string to undefined
        if (value === '' || value === null || value === undefined) return undefined;
        return value;
    })
    @IsDateString()
    @IsOptional()
    fromDate?: string;

    @ApiProperty({ required: false, description: 'Filter products until this date (ISO 8601 format)', example: '2024-12-31' })
    @Transform(({ value }) => {
        // Convert empty string to undefined
        if (value === '' || value === null || value === undefined) return undefined;
        return value;
    })
    @IsDateString()
    @IsOptional()
    toDate?: string;
}

