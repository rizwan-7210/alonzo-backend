import { IsInt, Min, Max, IsOptional, IsString, IsEnum, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SortByName {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class ListVendorsDto {
    @ApiPropertyOptional({
        minimum: 1,
        description: 'Page number for pagination',
        example: 1,
        default: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Page must be an integer' })
    @Min(1, { message: 'Page must be at least 1' })
    page?: number = 1;

    @ApiPropertyOptional({
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page',
        example: 10,
        default: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Limit must be an integer' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Max(100, { message: 'Limit cannot exceed 100' })
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Search vendors by full name (firstName + lastName)',
        example: 'john doe'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter vendors by category ID',
        example: '507f1f77bcf86cd799439011'
    })
    @IsOptional()
    @IsMongoId({ message: 'Category ID must be a valid MongoDB ObjectId' })
    categoryId?: string;

    @ApiPropertyOptional({
        description: 'Sort vendors by full name',
        enum: SortByName,
        example: 'ASC'
    })
    @IsOptional()
    @IsEnum(SortByName, { message: 'sortByName must be either ASC or DESC' })
    sortByName?: SortByName;
}
