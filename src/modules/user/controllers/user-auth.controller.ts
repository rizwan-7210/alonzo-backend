import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
// import { Public } from '../../../../common/decorators/public.decorator';
import { UserAuthService } from '../services/user-auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/config/multer.config';

@ApiTags('User - Authentication')
@Controller('user/auth')
export class UserAuthController {
    constructor(private readonly userAuthService: UserAuthService) { }

    @Public()
    @Post('register')
    @UseInterceptors(FileInterceptor('profileImage', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: RegisterDto })
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    async register(
        @Body() registerDto: RegisterDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false, // optional file
                validators: [
                    new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
                    // new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/i }),
                ],
            }),
        )
        profileImage?: Express.Multer.File,
    ) {
        try {
            return await this.userAuthService.register(registerDto, profileImage);
        } catch (err) {
            throw new BadRequestException(err.message);
        }
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User successfully logged in' })
    async login(@Body() loginDto: LoginDto) {
        return this.userAuthService.login(loginDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'User successfully logged out' })
    async logout(@Body('refreshToken') refreshToken: string) {
        return { message: 'Logout successful' };
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
    async refreshTokens(@Body() body: { refreshToken: string }) {
        return { message: 'Refresh token endpoint' };
    }
}