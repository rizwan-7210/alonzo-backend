import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '../../../common/constants/subscription.constants';
import { PlanDuration } from '../../../common/constants/plan.constants';

const emptyToUndefined = ({ value }: { value: any }) =>
    (value === '' || value === null || value === undefined ? undefined : value);

export class SubscriptionQueryDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1 })
    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Filter by subscription creation date from (ISO 8601)' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsDateString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Filter by subscription creation date to (ISO 8601)' })
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

    @ApiPropertyOptional({ description: 'Filter by plan duration', enum: PlanDuration })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsEnum(PlanDuration, { message: 'duration must be monthly or yearly' })
    duration?: PlanDuration;

    @ApiPropertyOptional({ description: 'Filter by subscription status', enum: SubscriptionStatus })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus;

    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by plan ID' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    planId?: string;

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

    @ApiPropertyOptional({ description: 'Search by user email or name' })
    @IsOptional()
    @Transform(emptyToUndefined)
    @IsString()
    search?: string;
}
