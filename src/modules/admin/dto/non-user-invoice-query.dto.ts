import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NonUserInvoiceStatus } from '../../../shared/schemas/non-user-invoice.schema';

export class NonUserInvoiceQueryDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Filter by status', enum: NonUserInvoiceStatus })
    @IsOptional()
    @IsEnum(NonUserInvoiceStatus)
    status?: NonUserInvoiceStatus;

    @ApiPropertyOptional({ description: 'Filter by date from', example: '2025-01-01' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by date to', example: '2025-12-31' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({ description: 'Search by customer name or email', example: 'john' })
    @IsOptional()
    @IsString()
    search?: string;
}

