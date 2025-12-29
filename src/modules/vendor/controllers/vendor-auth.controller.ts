import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { VendorAuthService } from '../services/vendor-auth.service';
import { VendorLoginDto } from '../dto/login.dto';
import { VendorRegisterDto } from '../dto/register.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { multerConfig } from 'src/config/multer.config';

@ApiTags('Vendor - Authentication')
@Controller('vendor/auth')
export class VendorAuthController {
    constructor(private readonly vendorAuthService: VendorAuthService) { }

    @Public()
    @Post('register')
    @UseInterceptors(FileInterceptor('avatar', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: VendorRegisterDto })
    @ApiOperation({ summary: 'Register a new vendor' })
    @ApiResponse({ status: 201, description: 'Vendor successfully registered' })
    async register(
        @Body() registerDto: VendorRegisterDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false, // optional file
                validators: [
                    new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
                ],
            }),
        )
        avatar?: Express.Multer.File,
    ) {
        try {
            return await this.vendorAuthService.register(registerDto, avatar);
        } catch (err) {
            throw new BadRequestException(err.message);
        }
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login vendor' })
    @ApiResponse({ status: 200, description: 'Vendor successfully logged in' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or not a vendor account' })
    async login(@Body() loginDto: VendorLoginDto) {
        return this.vendorAuthService.login(loginDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout vendor' })
    @ApiResponse({ status: 200, description: 'Vendor successfully logged out' })
    async logout(@Body('refreshToken') refreshToken: string) {
        return { message: 'Logout successful' };
    }
}

