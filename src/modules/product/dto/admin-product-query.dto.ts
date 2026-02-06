import { IsOptional, IsEnum, IsNumber, Min, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, InventoryStatus } from 'src/common/constants/product.constants';
import { Type, Transform } from 'class-transformer';

export class AdminProductQueryDto {
    @ApiPropertyOptional({ type: Number, example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ type: Number, example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number;

    @ApiPropertyOptional({ description: 'Filter products by user ID (vendor ID)' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsString()
    @IsOptional()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter products from this date (ISO 8601)', example: '2024-01-01' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsDateString()
    @IsOptional()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Filter products until this date (ISO 8601)', example: '2024-12-31' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsDateString()
    @IsOptional()
    toDate?: string;

    @ApiPropertyOptional({ enum: InventoryStatus, description: 'Filter by inventory status' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsEnum(InventoryStatus, { message: 'inventoryStatus must be one of: inStock, outOfStock' })
    @IsOptional()
    inventoryStatus?: InventoryStatus;

    @ApiPropertyOptional({ enum: ProductStatus, description: 'Filter by product status' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsEnum(ProductStatus, { message: 'status must be one of: active, inactive' })
    @IsOptional()
    status?: ProductStatus;

    @ApiPropertyOptional({ description: 'Search by product title' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsString()
    @IsOptional()
    search?: string;
}
