import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeAdminPasswordDto {
    @ApiProperty({ example: 'CurrentPassword123!', description: 'Current password' })
    @IsString()
    @IsNotEmpty({ message: 'Current password is required' })
    currentPassword: string;

    @ApiProperty({
        example: 'NewPassword123!',
        description: 'New password (min 8 chars, must contain uppercase, lowercase, number, and special character)'
    })
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
    password: string;

    @ApiProperty({ example: 'NewPassword123!', description: 'Confirm new password' })
    @IsString()
    @IsNotEmpty({ message: 'Confirm password is required' })
    confirmPassword: string;
}
