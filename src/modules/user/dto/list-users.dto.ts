import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListUsersDto {
    @ApiProperty({
        required: true,
        minimum: 1,
        description: 'Page number for pagination',
        example: 1
    })
    @Type(() => Number)
    @IsInt({ message: 'Page must be an integer' })
    @Min(1, { message: 'Page must be at least 1' })
    page: number;

    @ApiProperty({
        required: true,
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page',
        example: 10
    })
    @Type(() => Number)
    @IsInt({ message: 'Limit must be an integer' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Max(100, { message: 'Limit cannot exceed 100' })
    limit: number;
}

