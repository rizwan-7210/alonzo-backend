import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminPasswordResetService } from '../services/admin-password-reset.service';
import { ForgotPasswordDto } from '../../auth/dto/forgot-password.dto';
import { VerifyResetCodeDto } from '../../auth/dto/verify-reset-code.dto';
import { ResetPasswordDto } from '../../auth/dto/reset-password.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Admin - Password Reset')
@Controller('admin/auth/password')
export class AdminPasswordResetController {
    constructor(private readonly adminPasswordResetService: AdminPasswordResetService) { }

    @Public()
    @Post('forgot')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Allow form data to pass through
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    @ApiOperation({ summary: 'Initiate password reset for admin' })
    @ApiResponse({ status: 200, description: 'Reset code sent successfully' })
    @ApiResponse({ status: 400, description: 'Invalid email or not an admin account' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.adminPasswordResetService.initiatePasswordReset(forgotPasswordDto);
    }

    @Public()
    @Post('verify-code')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    @ApiOperation({ summary: 'Verify password reset code for admin' })
    @ApiResponse({ status: 200, description: 'Reset code verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired reset code' })
    async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
        return this.adminPasswordResetService.verifyResetCode(verifyResetCodeDto);
    }

    @Public()
    @Post('reset')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    @ApiOperation({ summary: 'Reset password for admin' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid reset code or password requirements not met' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.adminPasswordResetService.resetPassword(resetPasswordDto);
    }

    @Public()
    @Post('resend-code')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }))
    @ApiOperation({ summary: 'Resend password reset code for admin' })
    @ApiResponse({ status: 200, description: 'New reset code sent successfully' })
    @ApiResponse({ status: 400, description: 'Invalid email or not an admin account' })
    async resendResetCode(@Body('email') email: string) {
        return this.adminPasswordResetService.resendResetCode(email);
    }
}

