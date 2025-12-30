import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
    @ApiProperty({ example: 'Paracetamol 500mg' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 100.50 })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount: number;

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
}

