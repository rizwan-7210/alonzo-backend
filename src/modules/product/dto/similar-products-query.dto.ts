import { IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class SimilarProductsQueryDto {
    @ApiPropertyOptional({ 
        description: 'Number of similar products to return',
        example: 10,
        default: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ 
        description: 'Sort products (e.g., price:ASC, price:DESC, name:ASC, name:DESC, createdAt:DESC)',
        example: 'price:ASC'
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ 
        description: 'Search products by title or description',
        example: 'medicine'
    })
    @IsOptional()
    @Transform(({ value }) => {
        // Convert empty string to undefined
        if (value === '' || value === null || value === undefined) return undefined;
        return value;
    })
    @IsString()
    search?: string;
}
