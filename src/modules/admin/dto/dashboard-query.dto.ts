import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum GroupBy {
    MONTH = 'month',
    WEEK = 'week',
    DAY = 'day'
}

export class DashboardQueryDto {
    @ApiProperty({
        example: 2024,
        required: false,
        description: 'Year to filter data (default: current year)'
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2020)
    @Max(2100)
    year?: number;

    @ApiProperty({
        enum: GroupBy,
        required: false,
        default: GroupBy.MONTH,
        description: 'Group data by time period'
    })
    @IsOptional()
    @IsEnum(GroupBy)
    groupBy?: GroupBy = GroupBy.MONTH;
}
