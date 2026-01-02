import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListContactDto {
    @ApiProperty({ required: true, default: 1, minimum: 1, description: 'Page number' })
    @Type(() => Number)
    @IsNumber({}, { message: 'Page must be a number' })
    @Min(1, { message: 'Page must be at least 1' })
    page: number = 1;

    @ApiProperty({ required: true, default: 10, minimum: 1, maximum: 100, description: 'Number of items per page' })
    @Type(() => Number)
    @IsNumber({}, { message: 'Limit must be a number' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Max(100, { message: 'Limit cannot exceed 100' })
    limit: number = 10;
}

