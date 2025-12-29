import { IsEnum, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsBoolean, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayOfWeek, SlotType } from 'src/common/constants/availability.constants';
// import { SlotType, DayOfWeek } from '../../../common/constants/availability.constants';

export class TimeSlotDto {
    @ApiProperty({ example: '09:00', description: 'Start time in HH:mm format' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:mm format' })
    startTime: string;

    @ApiProperty({ example: '10:00', description: 'End time in HH:mm format' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:mm format' })
    endTime: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;
}

export class DayAvailabilityDto {
    @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
    @IsEnum(DayOfWeek)
    @IsNotEmpty()
    day: DayOfWeek;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isEnabled?: boolean;

    @ApiProperty({ type: [TimeSlotDto], required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TimeSlotDto)
    @IsOptional()
    slots?: TimeSlotDto[];
}

export class CreateAvailabilityDto {
    @ApiProperty({ enum: SlotType, example: SlotType.VIDEO_CONSULTANCY })
    @IsEnum(SlotType)
    @IsNotEmpty()
    type: SlotType;

    @ApiProperty({ type: [DayAvailabilityDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DayAvailabilityDto)
    weeklySchedule: DayAvailabilityDto[];

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
