import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RescheduleRequestStatus } from '../../../shared/schemas/reschedule-request.schema';

export class RespondRescheduleRequestDto {
    @ApiProperty({ 
        enum: [RescheduleRequestStatus.APPROVED, RescheduleRequestStatus.REJECTED],
        description: 'User response to admin-initiated reschedule request',
        example: RescheduleRequestStatus.APPROVED
    })
    @IsNotEmpty()
    @IsEnum([RescheduleRequestStatus.APPROVED, RescheduleRequestStatus.REJECTED])
    status: RescheduleRequestStatus.APPROVED | RescheduleRequestStatus.REJECTED;
}

