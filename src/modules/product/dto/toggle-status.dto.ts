import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from 'src/common/constants/product.constants';

export class ToggleStatusDto {
    @ApiProperty({ example: ProductStatus.ACTIVE, enum: ProductStatus, description: 'Product status: active or inactive' })
    @IsEnum(ProductStatus, { message: 'status must be either active or inactive' })
    @IsNotEmpty({ message: 'status is required' })
    status: ProductStatus;
}

