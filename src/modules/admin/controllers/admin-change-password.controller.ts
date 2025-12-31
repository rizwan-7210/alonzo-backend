import {
    Controller,
    Put,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AdminProfileService } from '../services/admin-profile.service';
import { ChangeAdminPasswordDto } from '../dto/change-admin-password.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin - Authentication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminChangePasswordController {
    constructor(
        private readonly adminProfileService: AdminProfileService,
    ) { }

    @Put('change-password')
    @ApiOperation({ summary: 'Change admin password' })
    @ApiBody({ type: ChangeAdminPasswordDto })
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
    @ApiResponse({ status: 404, description: 'Admin not found' })
    async changePassword(
        @CurrentUser() user: any,
        @Body() changePasswordDto: ChangeAdminPasswordDto
    ) {
        return this.adminProfileService.changePassword(user.id, changePasswordDto);
    }
}

