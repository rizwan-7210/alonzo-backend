import {
    Controller,
    Put,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Body,
    HttpCode,
    HttpStatus,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { UserProfileService } from '../services/user-profile.service';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { ChangeUserPasswordDto } from '../dto/change-user-password.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { multerConfig } from '../../../config/multer.config';

@ApiTags('Users - Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller('users/profile')
export class UserProfileController {
    constructor(
        private readonly userProfileService: UserProfileService,
    ) { }

    @Put()
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('profileImage', multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update user profile' })
    @ApiBody({ type: UpdateUserProfileDto })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Profile updated successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        phone: { type: 'string' },
                        dial_code: { type: 'string' },
                        profileImage: { type: 'object', nullable: true },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error or invalid file' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async updateProfile(
        @CurrentUser() user: any,
        @Body() updateProfileDto: UpdateUserProfileDto,
        @UploadedFile(
            new ParseFilePipe({
                fileIsRequired: false,
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
                ],
            }),
        )
        profileImage?: Express.Multer.File,
    ) {
        return this.userProfileService.updateProfile(user.id, updateProfileDto, profileImage);
    }

    @Put('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change user password' })
    @ApiBody({ type: ChangeUserPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password changed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Password changed successfully' },
                data: { type: 'null' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid request or validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async changePassword(
        @CurrentUser() user: any,
        @Body() changePasswordDto: ChangeUserPasswordDto
    ) {
        return this.userProfileService.changePassword(user.id, changePasswordDto);
    }
}
