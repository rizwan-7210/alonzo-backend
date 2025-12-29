// src/modules/admin/dto/tutorial/create-tutorial.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../../common/constants/tutorial.constants';

export class CreateTutorialDto {
    @ApiProperty({ example: 'Introduction to Node.js', description: 'Tutorial title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Learn Node.js from scratch', description: 'Tutorial description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        example: Status.ACTIVE,
        description: 'Tutorial status',
        enum: Status,
        required: false
    })
    @IsEnum(Status)
    @IsOptional()
    status?: Status;

    @ApiProperty({
        example: 300,
        description: 'Duration in seconds',
        required: false
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    duration?: number;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Video file (optional)',
        required: false
    })
    @IsOptional()
    video?: any;

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Thumbnail image file (optional)',
        required: false
    })
    @IsOptional()
    thumbnail?: any;
}