import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFiles, BadRequestException, UsePipes, ValidationPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VendorAuthService } from '../services/vendor-auth.service';
import { VendorLoginDto } from '../dto/login.dto';
import { VendorRegisterDto } from '../dto/register.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { multerConfig } from 'src/config/multer.config';
import type { Request } from 'express';

@ApiTags('Vendor - Authentication')
@Controller('vendor/auth')
export class VendorAuthController {
    constructor(private readonly vendorAuthService: VendorAuthService) { }

    @Public()
    @Post('register')
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Allow file fields to pass through
        transform: true,
    }))
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'profileImage', maxCount: 1 },
        { name: 'pharmacyLicense', maxCount: 1 },
        { name: 'registrationCertificate', maxCount: 1 },
    ], multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: VendorRegisterDto })
    @ApiOperation({ summary: 'Register a new vendor' })
    @ApiResponse({ status: 201, description: 'Vendor successfully registered' })
    async register(
        @Body() registerDto: VendorRegisterDto,
        @UploadedFiles() files: {
            profileImage?: Express.Multer.File[];
            pharmacyLicense?: Express.Multer.File[];
            registrationCertificate?: Express.Multer.File[];
        },
    ) {
        try {
            return await this.vendorAuthService.register(
                registerDto,
                files.profileImage?.[0],
                files.pharmacyLicense?.[0],
                files.registrationCertificate?.[0],
            );
        } catch (err) {
            throw new BadRequestException(err.message);
        }
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Allow form data to pass through
        transform: true,
        transformOptions: {
            enableImplicitConversion: true, // Convert string to appropriate types
        },
    }))
    @ApiOperation({ summary: 'Login vendor' })
    @ApiResponse({ status: 200, description: 'Vendor successfully logged in' })
    @ApiResponse({ status: 401, description: 'Invalid credentials or not a vendor account' })
    async login(@Body() loginDto: VendorLoginDto, @Req() req: Request) {
        // Ensure form data is properly parsed - if body is empty, try to parse from request
        if (!loginDto.email && !loginDto.password && req.body) {
            const body = req.body as any;
            loginDto = {
                email: body.email || '',
                password: body.password || '',
            };
        }
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

