import { IsOptional, IsInt, Min, Max, IsString, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PushNotificationQueryDto {
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

    @ApiPropertyOptional({ description: 'Search by title or message' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by start date (ISO 8601 format)' })
    @ValidateIf((o) => o.fromDate !== undefined && o.fromDate !== null && o.fromDate !== '')
    @IsDateString({}, { message: 'fromDate must be a valid ISO 8601 date string' })
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Filter by end date (ISO 8601 format)' })
    @ValidateIf((o) => o.toDate !== undefined && o.toDate !== null && o.toDate !== '')
    @IsDateString({}, { message: 'toDate must be a valid ISO 8601 date string' })
    toDate?: string;

    @ApiPropertyOptional({ description: 'Status filter (optional, not used for push notifications but allowed for consistency)' })
    @IsOptional()
    @IsString()
    status?: string;
}

