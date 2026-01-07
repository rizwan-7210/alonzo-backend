import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus, InventoryStatus } from 'src/common/constants/product.constants';
import { Type, Transform } from 'class-transformer';

// Custom transform for boolean values from form data
const TransformBoolean = () => {
    return Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    });
};

// Custom transform for number values from form data
const TransformNumber = () => {
    return Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return value;
        const num = Number(value);
        return isNaN(num) ? value : num;
    });
};

export class UpdateProductDto {
    @ApiProperty({ example: 'Paracetamol 500mg', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: 100.50, required: false })
    @TransformNumber()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    amount?: number;

    @ApiProperty({ example: false, required: false })
    @TransformBoolean()
    @IsBoolean()
    @IsOptional()
    hasDiscount?: boolean;

    @ApiProperty({ example: 10, required: false, description: 'Discount percentage (0-100)' })
    @TransformNumber()
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    @ValidateIf((o) => o.hasDiscount === true)
    discountPercentage?: number;

    @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, required: false })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @ApiProperty({ example: 'High-quality paracetamol tablets', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: InventoryStatus.IN_STOCK, enum: InventoryStatus, required: false })
    @IsEnum(InventoryStatus)
    @IsOptional()
    inventoryStatus?: InventoryStatus;
}

