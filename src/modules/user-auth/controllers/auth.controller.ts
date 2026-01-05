import { Controller, Post, Put, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserAuthService } from '../services/user-auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('User - Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly userAuthService: UserAuthService) { }

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async register(@Body() registerDto: RegisterDto) {
        return this.userAuthService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User successfully logged in' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto) {
        return this.userAuthService.login(loginDto);
    }

    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset code' })
    @ApiResponse({ status: 200, description: 'Reset code sent successfully' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.userAuthService.forgotPassword(forgotPasswordDto);
    }

    @Public()
    @Post('verify-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify reset code' })
    @ApiResponse({ status: 200, description: 'Code verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired code' })
    async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
        return this.userAuthService.verifyCode(verifyCodeDto);
    }

    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with verified code' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid code or password validation error' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.userAuthService.resetPassword(resetPasswordDto);
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.USER)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async updateProfile(
        @CurrentUser() user: any,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.userAuthService.updateProfile(user.id, updateProfileDto);
    }
}

