import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePushNotificationDto {
    @ApiProperty({
        example: 'System Update',
        description: 'Title of the push notification'
    })
    @IsString()
    @IsNotEmpty({ message: 'Title is required' })
    @MinLength(1, { message: 'Title cannot be empty' })
    title: string;

    @ApiProperty({
        example: 'We have updated our system with new features. Please check it out!',
        description: 'Message content of the push notification'
    })
    @IsString()
    @IsNotEmpty({ message: 'Message is required' })
    @MinLength(1, { message: 'Message cannot be empty' })
    message: string;
}

