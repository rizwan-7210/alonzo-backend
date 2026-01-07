import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus, InventoryStatus } from 'src/common/constants/product.constants';

export class ToggleProductStatusDto {
    @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, required: false })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @ApiProperty({ example: InventoryStatus.IN_STOCK, enum: InventoryStatus, required: false })
    @IsEnum(InventoryStatus)
    @IsOptional()
    inventoryStatus?: InventoryStatus;
}

