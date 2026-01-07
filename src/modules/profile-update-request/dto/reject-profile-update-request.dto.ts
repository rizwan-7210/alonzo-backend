import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectProfileUpdateRequestDto {
    @ApiProperty({ example: 'The provided documents are not clear enough' })
    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}

