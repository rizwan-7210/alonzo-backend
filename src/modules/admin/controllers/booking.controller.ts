import { Controller, Put, Post, Get, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { UserRole, Permission } from '../../../common/constants/user.constants';
import { AdminBookingService } from '../services/booking.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AdminBookingQueryDto } from '../dto/booking-query.dto';
import { BookingRequestQueryDto } from '../dto/booking-request-query.dto';
import { ApproveRejectBookingDto } from '../dto/approve-reject-booking.dto';
import { CreateRescheduleRequestDto } from '../../user/dto/create-reschedule-request.dto';

@ApiTags('Admin - Bookings')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
@RequirePermission(Permission.BOOKING_MANAGEMENT)
@Controller('admin/bookings')
export class AdminBookingController {
    constructor(private readonly adminBookingService: AdminBookingService) { }

    @Get()
    @ApiOperation({ summary: 'Get all bookings with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
    async getAllBookings(
        @Query() queryDto: AdminBookingQueryDto,
    ) {
        return this.adminBookingService.getAllBookings(queryDto);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get bookings for a specific user with filters and pagination' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User bookings retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserBookings(
        @Param('userId') userId: string,
        @Query() queryDto: AdminBookingQueryDto,
    ) {
        return this.adminBookingService.getUserBookings(userId, queryDto);
    }

    @Get('requests')
    @ApiOperation({ summary: 'Get all booking requests (pending, cancelled, and rejected bookings) with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Booking requests retrieved successfully' })
    async getBookingRequests(
        @Query() queryDto: BookingRequestQueryDto,
    ) {
        return this.adminBookingService.getBookingRequests(queryDto);
    }

    @Get('pending/count')
    @ApiOperation({ summary: 'Get count of pending bookings' })
    @ApiResponse({ status: 200, description: 'Pending bookings count retrieved successfully' })
    async getPendingBookingsCount() {
        const count = await this.adminBookingService.getPendingBookingsCount();
        return {
            count,
        };
    }

    @Put(':id/approve-reject')
    @ApiOperation({ summary: 'Approve or reject a booking request' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Booking request updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Booking is not pending or rejection reason missing' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async approveRejectBooking(
        @Param('id') bookingId: string,
        @Body() approveRejectDto: ApproveRejectBookingDto,
    ) {
        return this.adminBookingService.approveRejectBooking(bookingId, approveRejectDto);
    }

    @Post(':id/reschedule')
    @ApiOperation({ summary: 'Create a reschedule request for a booking (admin-initiated)' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 201, description: 'Reschedule request created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Booking cannot be rescheduled or slot not available' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async createRescheduleRequest(
        @CurrentUser() admin: any,
        @Param('id') bookingId: string,
        @Body() createRescheduleRequestDto: CreateRescheduleRequestDto,
    ) {
        return this.adminBookingService.createRescheduleRequest(
            bookingId,
            admin.id,
            createRescheduleRequestDto,
        );
    }

    @Put(':id/complete')
    @ApiOperation({ summary: 'Mark booking as completed' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Booking marked as completed successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Booking already completed or cancelled' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async markBookingAsCompleted(
        @Param('id') bookingId: string,
    ) {
        return this.adminBookingService.markBookingAsCompleted(bookingId);
    }

    @Post(':id/invoice')
    @ApiOperation({ summary: 'Create invoice for a booking' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: User does not have Stripe customer ID' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    @ApiResponse({ status: 409, description: 'Conflict: Invoice already exists for this booking' })
    async createInvoice(
        @Param('id') bookingId: string,
        @Body() createInvoiceDto: CreateInvoiceDto,
    ) {
        return this.adminBookingService.createInvoice(bookingId, createInvoiceDto);
    }

    @Get(':id/invoice')
    @ApiOperation({ summary: 'Get invoice for a booking' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async getInvoiceByBooking(
        @Param('id') bookingId: string,
    ) {
        return this.adminBookingService.getInvoiceByBooking(bookingId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get booking details by ID' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Booking details retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your booking' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async getBookingById(
        @Param('id') bookingId: string,
    ) {
        return this.adminBookingService.getBookingById(bookingId);
    }
}

