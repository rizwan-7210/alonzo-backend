import { Controller, Get, Param, Put, Body, Query, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { RescheduleRequestService } from '../services/reschedule-request.service';
import { UpdateRescheduleRequestDto } from '../dto/update-reschedule-request.dto';
import { RescheduleRequestQueryDto } from '../dto/reschedule-request-query.dto';
import { CreateRescheduleRequestDto } from '../../user/dto/create-reschedule-request.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Admin - Reschedule Requests')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/reschedule-requests')
export class RescheduleRequestController {
    constructor(private readonly rescheduleRequestService: RescheduleRequestService) { }

    @Get()
    @ApiOperation({ summary: 'Get all reschedule requests with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Reschedule requests retrieved successfully' })
    async getRescheduleRequests(@Query() queryDto: RescheduleRequestQueryDto) {
        return this.rescheduleRequestService.getRescheduleRequests(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get reschedule request by ID with full details' })
    @ApiParam({ name: 'id', description: 'Reschedule Request ID' })
    @ApiResponse({ status: 200, description: 'Reschedule request retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Reschedule request not found' })
    async getRescheduleRequestById(@Param('id') requestId: string) {
        return this.rescheduleRequestService.getRescheduleRequestById(requestId);
    }

    @Post('booking/:bookingId')
    @ApiOperation({ summary: 'Create a reschedule request for a booking (admin-initiated)' })
    @ApiParam({ name: 'bookingId', description: 'Booking ID' })
    @ApiResponse({ status: 201, description: 'Reschedule request created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Booking cannot be rescheduled or slot not available' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async createRescheduleRequest(
        @CurrentUser() admin: any,
        @Param('bookingId') bookingId: string,
        @Body() createRescheduleRequestDto: CreateRescheduleRequestDto,
    ) {
        return this.rescheduleRequestService.createRescheduleRequest(
            bookingId,
            admin.id,
            createRescheduleRequestDto,
        );
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Approve or reject a user-initiated reschedule request' })
    @ApiParam({ name: 'id', description: 'Reschedule Request ID' })
    @ApiResponse({ status: 200, description: 'Reschedule request updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Request already processed or not user-initiated' })
    @ApiResponse({ status: 404, description: 'Reschedule request not found' })
    async updateRescheduleRequest(
        @CurrentUser() admin: any,
        @Param('id') requestId: string,
        @Body() updateDto: UpdateRescheduleRequestDto,
    ) {
        return this.rescheduleRequestService.updateRescheduleRequest(
            requestId,
            admin.id,
            updateDto,
        );
    }
}

