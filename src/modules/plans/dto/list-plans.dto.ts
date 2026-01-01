import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus } from '../../../common/constants/plan.constants';

export class ListPlansDto {
    @ApiProperty({
        required: false,
        default: 1,
        minimum: 1,
        description: 'Page number for pagination'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Page must be an integer' })
    @Min(1, { message: 'Page must be at least 1' })
    page?: number = 1;

    @ApiProperty({
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Limit must be an integer' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Max(100, { message: 'Limit cannot exceed 100' })
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Search by title or description' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: PlanStatus, description: 'Filter by status' })
    @IsOptional()
    @IsEnum(PlanStatus, { message: 'Status must be either active or inactive' })
    status?: PlanStatus;
}

