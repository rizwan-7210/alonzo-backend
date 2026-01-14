import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListRecentlyViewedDto {
    @ApiPropertyOptional({ 
        example: 1, 
        description: 'Page number for pagination',
        default: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Page must be an integer' })
    @Min(1, { message: 'Page must be at least 1' })
    page?: number = 1;

    @ApiPropertyOptional({ 
        example: 10, 
        description: 'Number of items per page',
        default: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Limit must be an integer' })
    @Min(1, { message: 'Limit must be at least 1' })
    limit?: number = 10;
}
