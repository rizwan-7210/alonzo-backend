import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserSubscriptionStatus } from '../../../common/constants/subscription.constants';

export class VendorSubscriptionLogQueryDto {
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

    @ApiPropertyOptional({ description: 'Filter by subscription status', enum: UserSubscriptionStatus })
    @IsOptional()
    @IsEnum(UserSubscriptionStatus)
    status?: UserSubscriptionStatus;

    @ApiPropertyOptional({ description: 'Filter by plan ID' })
    @IsOptional()
    @IsString()
    planId?: string;

    @ApiPropertyOptional({ description: 'Filter by start date (ISO 8601 format)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Filter by end date (ISO 8601 format)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

