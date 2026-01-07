import { ApiProperty } from '@nestjs/swagger';

export class ApproveProfileUpdateRequestDto {
    @ApiProperty({ example: 'Profile update request approved', required: false })
    message?: string;
}

