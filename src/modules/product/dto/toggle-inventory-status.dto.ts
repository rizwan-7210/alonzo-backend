import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InventoryStatus } from 'src/common/constants/product.constants';

export class ToggleInventoryStatusDto {
    @ApiProperty({ example: InventoryStatus.IN_STOCK, enum: InventoryStatus, description: 'Inventory status: inStock or outOfStock' })
    @IsEnum(InventoryStatus, { message: 'inventoryStatus must be either inStock or outOfStock' })
    @IsNotEmpty({ message: 'inventoryStatus is required' })
    inventoryStatus: InventoryStatus;
}

