import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationByEmailDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email of the user to send notification to' })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({ example: 'New Product Available', description: 'Notification title' })
    @IsString()
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    @ApiProperty({ example: 'A new product has been added to our catalog', description: 'Notification body/message' })
    @IsString()
    @IsNotEmpty({ message: 'Body is required' })
    body: string;
}

