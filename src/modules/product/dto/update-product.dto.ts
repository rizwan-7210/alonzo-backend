import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from 'src/common/constants/product.constants';

export class UpdateProductDto {
    @ApiProperty({ example: 'Paracetamol 500mg', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: 100.50, required: false })
    @IsNumber()
    @IsOptional()
    @Min(0)
    amount?: number;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    hasDiscount?: boolean;

    @ApiProperty({ example: 10, required: false, description: 'Discount percentage (0-100)' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    discountPercentage?: number;

    @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, required: false })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;
}

