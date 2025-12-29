import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserAvailabilityService } from '../services/user-availability.service';
import { SlotType } from '../../../common/constants/availability.constants';

@ApiTags('User - Availability')
@ApiBearerAuth()
@Controller('user/availability')
export class UserAvailabilityController {
    constructor(private readonly userAvailabilityService: UserAvailabilityService) { }

    @Get('slots')
    @ApiOperation({ summary: 'Get available slots for a specific date' })
    @ApiQuery({ name: 'type', enum: SlotType, required: true })
    @ApiQuery({ name: 'date', type: String, required: true, description: 'YYYY-MM-DD' })
    @ApiResponse({ status: 200, description: 'Available slots retrieved successfully' })
    async getAvailableSlots(
        @Query('type') type: SlotType,
        @Query('date') date: string,
    ) {
        return this.userAvailabilityService.getAvailableSlots(type, date);
    }
}
