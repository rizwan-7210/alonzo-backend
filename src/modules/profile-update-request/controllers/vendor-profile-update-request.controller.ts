import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFiles,
    UseGuards,
    UsePipes,
    ValidationPipe,
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
    @ApiBody({ type: CreateProfileUpdateRequestDto })
    @ApiResponse({ status: 201, description: 'Profile update request created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - pending request already exists' })
    async createRequest(
        @CurrentUser() user: any,
        @Body() createDto: CreateProfileUpdateRequestDto,
        @UploadedFiles() files: {
            profileImage?: Express.Multer.File[];
            pharmacyLicense?: Express.Multer.File[];
            registrationCertificate?: Express.Multer.File[];
        },
    ) {
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

