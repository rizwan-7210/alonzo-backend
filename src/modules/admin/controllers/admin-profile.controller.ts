import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseInterceptors,
    UseGuards,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AdminProfileService } from '../services/admin-profile.service';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { ChangeAdminPasswordDto } from '../dto/change-admin-password.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { multerConfig } from '../../../config/multer.config';

@ApiTags('Admin - Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/profile')
export class AdminProfileController {
    constructor(
        private readonly adminProfileService: AdminProfileService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get admin profile' })
    @ApiResponse({ status: 200, description: 'Admin profile retrieved successfully' })
    async getProfile(@CurrentUser() user: any) {
        return this.adminProfileService.getProfile(user.id);
    }

    @Put()
    @UseInterceptors(FileInterceptor('avatar', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateAdminProfileDto })
    @ApiOperation({ summary: 'Update admin profile' })
    @ApiResponse({ status: 200, description: 'Admin profile updated successfully' })
    async updateProfile(
        @CurrentUser() user: any,
        @Body() updateProfileDto: UpdateAdminProfileDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                ],
            }),
        )
        avatar?: Express.Multer.File,
    ) {
        return this.adminProfileService.updateProfile(user.id, updateProfileDto, avatar);
    }

    @Put('change-password')
    @ApiOperation({ summary: 'Change admin password' })
    @ApiBody({ type: ChangeAdminPasswordDto })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    async changePassword(
        @CurrentUser() user: any,
        @Body() changePasswordDto: ChangeAdminPasswordDto
    ) {
        return this.adminProfileService.changePassword(user.id, changePasswordDto);
    }

    @Post('avatar')
    @UseInterceptors(FileInterceptor('file', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload admin avatar' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
    async uploadAvatar(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @CurrentUser() user: any,
    ) {
        return this.adminProfileService.uploadAvatar(user.id, file);
    }
}
