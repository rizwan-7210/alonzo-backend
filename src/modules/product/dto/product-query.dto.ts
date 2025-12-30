import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from 'src/common/constants/product.constants';
import { Type } from 'class-transformer';

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

    @ApiProperty({ required: false, enum: ProductStatus })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;
}

