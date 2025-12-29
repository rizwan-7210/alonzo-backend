import { IsEnum, IsNotEmpty, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// import { DayOfWeek } from '../../../common/constants/availability.constants';
import { TimeSlotDto } from './create-availability.dto';
import { DayOfWeek } from 'src/common/constants/availability.constants';

export class ToggleDayDto {
    @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
    @IsEnum(DayOfWeek)
    @IsNotEmpty()
    day: DayOfWeek;

    @ApiProperty({ example: true })
    @IsBoolean()
    @IsNotEmpty()
    isEnabled: boolean;
}

export class AddTimeSlotDto {
    @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
    @IsEnum(DayOfWeek)
    @IsNotEmpty()
    day: DayOfWeek;

    @ApiProperty({ type: TimeSlotDto })
    @IsNotEmpty()
    timeSlot: TimeSlotDto;
}

export class RemoveTimeSlotDto {
    @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
    @IsEnum(DayOfWeek)
    @IsNotEmpty()
    day: DayOfWeek;

    @ApiProperty({ example: 0, description: 'Index of the time slot to remove' })
    @IsNumber()
    @IsNotEmpty()
    slotIndex: number;
}
