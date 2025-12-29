import { IsOptional, IsEnum, IsInt, Min, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../../shared/schemas/booking.schema';
import { SlotType } from '../../../common/constants/availability.constants';

export class AdminBookingQueryDto {
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

    @ApiPropertyOptional({ description: 'Filter by booking status', enum: BookingStatus })
    @IsOptional()
    @IsEnum(BookingStatus)
    status?: BookingStatus;

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

