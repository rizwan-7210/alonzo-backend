import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserSubscriptionStatus } from '../../../common/constants/subscription.constants';

export class ListUserSubscriptionsDto {
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

    @ApiPropertyOptional({ enum: UserSubscriptionStatus, description: 'Filter by status' })
    @IsOptional()
    @IsEnum(UserSubscriptionStatus, { message: 'Status must be either paid or unpaid' })
    status?: UserSubscriptionStatus;

    @ApiPropertyOptional({ description: 'Filter by user ID (admin only)' })
    @IsOptional()
    @IsString()
    userId?: string;
}

