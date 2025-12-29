import { IsNotEmpty, IsString, IsEnum, IsDateString, IsNumber, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SlotType } from '../../../common/constants/availability.constants';

class BookingSlotDto {
    @ApiProperty({ example: '09:00' })
    @IsNotEmpty()
    @IsString()
    startTime: string;

    @ApiProperty({ example: '10:00' })
    @IsNotEmpty()
    @IsString()
    endTime: string;
}

class BookingDetailsDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    subject?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateBookingDto {
    @ApiProperty({ enum: SlotType })
    @IsNotEmpty()
    @IsEnum(SlotType)
    type: SlotType;

    @ApiProperty({ example: '2023-12-25' })
    @IsNotEmpty()
    @IsDateString()
    date: string;

    @ApiProperty({ type: [BookingSlotDto] })
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BookingSlotDto)
    slots: BookingSlotDto[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    amount?: number;

    @ApiProperty({ type: BookingDetailsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => BookingDetailsDto)
    details?: BookingDetailsDto;

    @ApiProperty({ required: false, example: '123 Main St, City, State' })
    @IsOptional()
    @IsString()
    address?: string;
}
