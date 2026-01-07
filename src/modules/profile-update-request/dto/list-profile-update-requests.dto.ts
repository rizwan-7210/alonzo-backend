import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileUpdateRequestStatus } from '../../../common/constants/user.constants';

export class ListProfileUpdateRequestsDto {
    @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({ enum: ProfileUpdateRequestStatus })
    @IsEnum(ProfileUpdateRequestStatus)
    @IsOptional()
    status?: ProfileUpdateRequestStatus;
}

