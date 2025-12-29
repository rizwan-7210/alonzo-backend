import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, PaymentStatus } from '../../../common/constants/payment.constants';

export class PaymentLogQueryDto {
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

    @ApiPropertyOptional({ description: 'Filter by payment type', enum: PaymentType })
    @IsOptional()
    @IsEnum(PaymentType)
    paymentType?: PaymentType;

    @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus })
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by subscription ID' })
    @IsOptional()
    @IsString()
    subscriptionId?: string;

    @ApiPropertyOptional({ description: 'Filter by booking ID' })
    @IsOptional()
    @IsString()
    bookingId?: string;

    @ApiPropertyOptional({ description: 'Filter by start date (ISO 8601 format)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Filter by end date (ISO 8601 format)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Search by user email, user name, booking ID, or payment intent ID' })
    @IsOptional()
    @IsString()
    search?: string;
}
