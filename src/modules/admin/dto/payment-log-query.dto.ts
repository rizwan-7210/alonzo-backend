import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, PaymentStatus } from '../../../common/constants/payment.constants';
import { PlanDuration } from '../../../common/constants/plan.constants';

const emptyToUndefined = ({ value }: { value: any }) =>
    (value === '' || value === null || value === undefined ? undefined : value);

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

    @ApiPropertyOptional({ description: 'Filter by payment date from (ISO 8601)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Filter by payment date to (ISO 8601)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    toDate?: string;

    @ApiPropertyOptional({ description: 'Filter by subscription expiry from (ISO 8601)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    fromExpiryDate?: string;

    @ApiPropertyOptional({ description: 'Filter by subscription expiry to (ISO 8601)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    toExpiryDate?: string;

    @ApiPropertyOptional({ description: 'Filter by plan duration (subscription)', enum: PlanDuration })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsEnum(PlanDuration, { message: 'duration must be monthly or yearly' })
    duration?: PlanDuration;

    @ApiPropertyOptional({ description: 'Filter by payment type', enum: PaymentType })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsEnum(PaymentType)
    paymentType?: PaymentType;

    @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by subscription ID' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    subscriptionId?: string;

    @ApiPropertyOptional({ description: 'Filter by booking ID' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    bookingId?: string;

    @ApiPropertyOptional({ description: 'Filter by start date (ISO 8601 format)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Filter by end date (ISO 8601 format)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Search by user email, user name, booking ID, or payment intent ID' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    search?: string;
}
