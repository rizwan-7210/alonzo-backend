import { IsOptional, IsInt, Min, IsEnum, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RescheduleRequestStatus } from '../../../shared/schemas/reschedule-request.schema';
import { SlotType } from '../../../common/constants/availability.constants';

export class RescheduleRequestQueryDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Filter by reschedule request status', enum: RescheduleRequestStatus })
    @IsOptional()
    @IsEnum(RescheduleRequestStatus)
    status?: RescheduleRequestStatus;

    @ApiPropertyOptional({ description: 'Filter by service type', enum: SlotType })
    @IsOptional()
    @IsEnum(SlotType)
    type?: SlotType;

    @ApiPropertyOptional({ description: 'Filter by start date (ISO 8601 format)', example: '2023-12-01' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by end date (ISO 8601 format)', example: '2023-12-31' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({ description: 'Search by user name or email' })
    @IsOptional()
    @IsString()
    search?: string;
}

