import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek, SlotType } from 'src/common/constants/availability.constants';
// import { SlotType, DayOfWeek } from '../../../common/constants/availability.constants';

export class AvailabilityQueryDto {
    @ApiProperty({ enum: SlotType, required: false })
    @IsOptional()
    @IsEnum(SlotType)
    type?: SlotType;

    @ApiProperty({ enum: DayOfWeek, required: false })
    @IsOptional()
    @IsEnum(DayOfWeek)
    day?: DayOfWeek;

    @ApiProperty({ required: false, description: 'Start date for filtering (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ required: false, description: 'End date for filtering (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ required: false, enum: ['month', 'week', 'day'] })
    @IsOptional()
    @IsString()
    view?: 'month' | 'week' | 'day';
}
