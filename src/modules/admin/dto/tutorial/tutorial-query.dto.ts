// src/modules/admin/dto/tutorial-query.dto.ts
import { IsOptional, IsNumber, Min, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../../common/constants/tutorial.constants';
import { Type } from 'class-transformer';

export class TutorialQueryDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        required: false,
        enum: Status
    })
    @IsOptional()
    @IsEnum(Status)
    status?: Status;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiProperty({ required: false, enum: ['asc', 'desc'] })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    endDate?: string;
}