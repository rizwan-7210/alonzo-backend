import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, Min, Max, ValidateIf, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { InventoryStatus, ProductStatus } from 'src/common/constants/product.constants';

// Custom transform for boolean values from form data
const TransformBoolean = () => {
    return Transform(({ value }) => {
        if (value === 'true' || value === true || value === 1 || value === '1') return true;
        if (value === 'false' || value === false || value === 0 || value === '0' || value === '' || value === null || value === undefined) return false;
        return value;
    });
};

// Custom transform for number values from form data
const TransformNumber = () => {
    return Transform(({ value }) => {
        if (value === '' || value === null || value === undefined) return undefined;
        if (typeof value === 'number') return value;
        const num = Number(value);
        return isNaN(num) ? undefined : num;
    });
};

export class CreateProductDto {
    @ApiProperty({ example: 'Paracetamol 500mg' })
    @Transform(({ value }) => {
        if (typeof value === 'string') return value.trim();
        return value;
    })
    @IsString({ message: 'title must be a string' })
    @IsNotEmpty({ message: 'title should not be empty' })
    title: string;

    @ApiProperty({ example: 100.50 })
    @TransformNumber()
    @Type(() => Number)
    @IsNumber({}, { message: 'amount must be a number' })
    @IsNotEmpty({ message: 'amount should not be empty' })
    @Min(0, { message: 'amount must not be less than 0' })
    amount: number;

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

    @ApiProperty({ example: 'High-quality paracetamol tablets', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: InventoryStatus.IN_STOCK, enum: InventoryStatus, required: false, default: InventoryStatus.IN_STOCK })
    @IsEnum(InventoryStatus)
    @IsOptional()
    inventoryStatus?: InventoryStatus;

    @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, required: false, default: ProductStatus.ACTIVE })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;
}

