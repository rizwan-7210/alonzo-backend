import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileUpdateRequestService } from '../services/profile-update-request.service';
import { ApproveProfileUpdateRequestDto } from '../dto/approve-profile-update-request.dto';
import { RejectProfileUpdateRequestDto } from '../dto/reject-profile-update-request.dto';
import { ListProfileUpdateRequestsDto } from '../dto/list-profile-update-requests.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin - Profile Update Request')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/profile-update-request')
export class AdminProfileUpdateRequestController {
    constructor(
        private readonly profileUpdateRequestService: ProfileUpdateRequestService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all profile update requests' })
    @ApiResponse({ status: 200, description: 'Profile update requests retrieved successfully' })
    async listRequests(@Query() listDto: ListProfileUpdateRequestsDto) {
        const result = await this.profileUpdateRequestService.listRequests(listDto);
        return {
            message: 'Profile update requests retrieved successfully',
            ...result,
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get profile update request details' })
    @ApiResponse({ status: 200, description: 'Profile update request retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Profile update request not found' })
    async getRequestById(@Param('id') id: string) {
        const request = await this.profileUpdateRequestService.getRequestById(id);
        return {
            message: 'Profile update request retrieved successfully',
            data: request,
        };
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve a profile update request' })
    @ApiResponse({ status: 200, description: 'Profile update request approved successfully' })
    @ApiResponse({ status: 404, description: 'Profile update request not found' })
    @ApiResponse({ status: 400, description: 'Request is not pending' })
    async approveRequest(
        @Param('id') id: string,
        @Body() approveDto: ApproveProfileUpdateRequestDto,
    ) {
        const request = await this.profileUpdateRequestService.approveRequest(id);
        return {
            message: 'Profile update request approved successfully',
            data: request,
        };
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject a profile update request' })
    @ApiResponse({ status: 200, description: 'Profile update request rejected successfully' })
    @ApiResponse({ status: 404, description: 'Profile update request not found' })
    @ApiResponse({ status: 400, description: 'Request is not pending' })
    async rejectRequest(
        @Param('id') id: string,
        @Body() rejectDto: RejectProfileUpdateRequestDto,
    ) {
        const request = await this.profileUpdateRequestService.rejectRequest(id, rejectDto);
        return {
            message: 'Profile update request rejected successfully',
            data: request,
        };
    }
}

