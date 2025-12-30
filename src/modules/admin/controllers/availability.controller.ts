import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { UserRole, Permission } from '../../../common/constants/user.constants';
import { AvailabilityService } from '../services/availability.service';
import { CreateAvailabilityDto } from '../dto/availability/create-availability.dto';
import { UpdateAvailabilityDto } from '../dto/availability/update-availability.dto';
import { AvailabilityQueryDto } from '../dto/availability/availability-query.dto';
import { ToggleDayDto, AddTimeSlotDto, RemoveTimeSlotDto } from '../dto/availability/manage-slots.dto';
import { SlotType } from '../../../common/constants/availability.constants';

@ApiTags('Admin - Availability')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@RequirePermission(Permission.AVAILABILITY_MANAGEMENT)
@Controller('admin/availability')
export class AvailabilityController {
    constructor(
        private readonly availabilityService: AvailabilityService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create or update availability schedule by type' })
    @ApiResponse({ status: 200, description: 'Availability created or updated successfully' })
    async upsert(@Body() createAvailabilityDto: CreateAvailabilityDto) {
        return this.availabilityService.upsert(createAvailabilityDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all availability schedules with filters' })
    @ApiResponse({ status: 200, description: 'Availability schedules retrieved successfully' })
    async findAll(@Query() queryDto: AvailabilityQueryDto) {
        return this.availabilityService.findAll(queryDto);
    }

    @Get('type/:type')
    @ApiOperation({ summary: 'Get availability by type' })
    @ApiResponse({ status: 200, description: 'Availability retrieved successfully' })
    async findByType(@Param('type') type: SlotType) {
        return this.availabilityService.findByType(type);
    }

    @Get('slots')
    @ApiOperation({ summary: 'Get available slots for a specific date' })
    @ApiQuery({ name: 'type', enum: SlotType, required: true })
    @ApiQuery({ name: 'date', type: String, required: true, description: 'YYYY-MM-DD' })
    @ApiResponse({ status: 200, description: 'Available slots retrieved successfully' })
    async getAvailableSlotsForDate(
        @Query('type') type: SlotType,
        @Query('date') date: string,
    ) {
        return this.availabilityService.getAvailableSlotsForDate(type, date);
    }

    @Get('slots/:type')
    @ApiOperation({ summary: 'Get available slots by type and date range' })
    @ApiResponse({ status: 200, description: 'Available slots retrieved successfully' })
    async getAvailableSlots(
        @Param('type') type: SlotType,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.availabilityService.getAvailableSlots(type, startDate, endDate);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get availability by ID' })
    @ApiResponse({ status: 200, description: 'Availability retrieved successfully' })
    async findOne(@Param('id') id: string) {
        return this.availabilityService.findOne(id);
    }



    @Delete(':id')
    @ApiOperation({ summary: 'Delete availability schedule' })
    @ApiResponse({ status: 200, description: 'Availability deleted successfully' })
    async remove(@Param('id') id: string) {
        return this.availabilityService.remove(id);
    }

    @Patch('type/:type/toggle-day')
    @ApiOperation({ summary: 'Enable/disable availability for a specific day' })
    @ApiResponse({ status: 200, description: 'Day availability toggled successfully' })
    async toggleDay(
        @Param('type') type: SlotType,
        @Body() toggleDayDto: ToggleDayDto,
    ) {
        return this.availabilityService.toggleDay(type, toggleDayDto);
    }

    @Post('type/:type/add-slot')
    @ApiOperation({ summary: 'Add a time slot to a specific day' })
    @ApiResponse({ status: 201, description: 'Time slot added successfully' })
    async addTimeSlot(
        @Param('type') type: SlotType,
        @Body() addTimeSlotDto: AddTimeSlotDto,
    ) {
        return this.availabilityService.addTimeSlot(type, addTimeSlotDto);
    }

    @Delete('type/:type/remove-slot')
    @ApiOperation({ summary: 'Remove a time slot from a specific day' })
    @ApiResponse({ status: 200, description: 'Time slot removed successfully' })
    async removeTimeSlot(
        @Param('type') type: SlotType,
        @Body() removeTimeSlotDto: RemoveTimeSlotDto,
    ) {
        return this.availabilityService.removeTimeSlot(type, removeTimeSlotDto);
    }
}
