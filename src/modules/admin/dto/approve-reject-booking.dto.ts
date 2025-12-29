import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../shared/schemas/booking.schema';

export class ApproveRejectBookingDto {
    @ApiProperty({
        enum: [BookingStatus.APPROVED, BookingStatus.REJECTED],
        description: 'New status for the booking (approved or cancelled for rejection)'
    })
    @IsNotEmpty()
    @IsEnum([BookingStatus.APPROVED, BookingStatus.REJECTED])
    status: BookingStatus.APPROVED | BookingStatus.REJECTED;

    @ApiPropertyOptional({
        description: 'Rejection reason (required if status is rejecetd)'
    })
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}

