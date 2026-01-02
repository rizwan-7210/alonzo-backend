import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactDetailsDto {
    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Contact message ID' })
    @IsNotEmpty({ message: 'Contact ID is required' })
    @IsString({ message: 'Contact ID must be a string' })
    @IsMongoId({ message: 'Contact ID must be a valid MongoDB ObjectId' })
    id: string;
}

