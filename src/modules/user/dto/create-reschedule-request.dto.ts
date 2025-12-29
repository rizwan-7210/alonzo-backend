import { IsNotEmpty, IsString, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class RescheduleSlotDto {
    @ApiProperty({ example: '09:00' })
    @IsNotEmpty()
    @IsString()
    startTime: string;

    @ApiProperty({ example: '10:00' })
    @IsNotEmpty()
    @IsString()
    endTime: string;
}

export class CreateRescheduleRequestDto {
    @ApiProperty({ example: '2023-12-25', description: 'Requested date for rescheduling (YYYY-MM-DD)' })
    @IsNotEmpty()
    @IsDateString()
    requestedDate: string;

    @ApiProperty({ type: [RescheduleSlotDto], description: 'Requested time slots (must be available)' })
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RescheduleSlotDto)
    requestedSlots: RescheduleSlotDto[];
}


