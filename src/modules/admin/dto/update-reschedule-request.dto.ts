import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RescheduleRequestStatus } from '../../../shared/schemas/reschedule-request.schema';

export class UpdateRescheduleRequestDto {
    @ApiProperty({ enum: RescheduleRequestStatus, description: 'New status for the reschedule request' })
    @IsNotEmpty()
    @IsEnum(RescheduleRequestStatus)
    status: RescheduleRequestStatus;

    @ApiPropertyOptional({ description: 'Admin notes or reason for the decision' })
    @IsOptional()
    @IsString()
    adminNotes?: string;
}

