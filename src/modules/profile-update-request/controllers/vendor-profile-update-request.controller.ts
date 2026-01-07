import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFiles,
    UseGuards,
    UsePipes,
    ValidationPipe,
    BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProfileUpdateRequestService } from '../services/profile-update-request.service';
import { CreateProfileUpdateRequestDto } from '../dto/create-profile-update-request.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { multerConfig } from '../../../config/multer.config';

@ApiTags('Vendor - Profile Update Request')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/profile-update-request')
export class VendorProfileUpdateRequestController {
    constructor(
        private readonly profileUpdateRequestService: ProfileUpdateRequestService,
    ) { }

    @Post()
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
    @ApiOperation({ summary: 'Create a profile update request' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['firstName', 'phone', 'categoryId', 'address', 'location', 'website'],
            properties: {
                firstName: { type: 'string', example: 'John' },
                phone: { type: 'string', example: '1234567890' },
                dial_code: { type: 'string', example: '+92' },
                categoryId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                address: { type: 'string', example: '123 Main Street' },
                location: { type: 'string', example: 'New York, NY' },
                website: { type: 'string', example: 'https://example.com' },
                profileImage: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional profile image (must be jpg, jpeg, png, gif, or webp, max 10MB)',
                },
                pharmacyLicense: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional pharmacy license image (must be jpg, jpeg, png, gif, or webp, max 10MB)',
                },
                registrationCertificate: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional registration certificate image (must be jpg, jpeg, png, gif, or webp, max 10MB)',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Profile update request created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - pending request already exists or invalid file type' })
    async createRequest(
        @CurrentUser() user: any,
        @Body() createDto: CreateProfileUpdateRequestDto,
        @UploadedFiles() files: {
            profileImage?: Express.Multer.File[];
            pharmacyLicense?: Express.Multer.File[];
            registrationCertificate?: Express.Multer.File[];
        },
    ) {
        // Validate that if files are provided, they must be images
        const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        
        if (files.profileImage?.[0]) {
            const file = files.profileImage[0];
            if (!imageMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException('profileImage must be an image file (jpg, jpeg, png, gif, or webp)');
            }
            if (file.size > maxFileSize) {
                throw new BadRequestException('profileImage size must not exceed 10MB');
            }
        }

        if (files.pharmacyLicense?.[0]) {
            const file = files.pharmacyLicense[0];
            if (!imageMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException('pharmacyLicense must be an image file (jpg, jpeg, png, gif, or webp)');
            }
            if (file.size > maxFileSize) {
                throw new BadRequestException('pharmacyLicense size must not exceed 10MB');
            }
        }

        if (files.registrationCertificate?.[0]) {
            const file = files.registrationCertificate[0];
            if (!imageMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException('registrationCertificate must be an image file (jpg, jpeg, png, gif, or webp)');
            }
            if (file.size > maxFileSize) {
                throw new BadRequestException('registrationCertificate size must not exceed 10MB');
            }
        }

        const request = await this.profileUpdateRequestService.createRequest(
            user.id,
            createDto,
            files.profileImage?.[0],
            files.pharmacyLicense?.[0],
            files.registrationCertificate?.[0],
        );

        return {
            message: 'Profile update request created successfully',
            data: request,
        };
    }
}

