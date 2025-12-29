import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto } from '../dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Admin - Authentication')
@Controller('admin/auth')
export class AdminAuthController {
    private readonly logger = new Logger(AdminAuthController.name);
    constructor(private readonly adminAuthService: AdminAuthService) { }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login admin' })
    @ApiResponse({ status: 200, description: 'Admin successfully logged in' })
    async login(@Body() loginDto: AdminLoginDto) {

        return this.adminAuthService.login(loginDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout admin' })
    @ApiResponse({ status: 200, description: 'Admin successfully logged out' })
    async logout(@Body('refreshToken') refreshToken: string) {
        this.logger.log(`refreshToken loggingn`, refreshToken);

        return { message: 'Logout successful' };
    }
}