import { Controller, Post, Body, UseGuards, Get, Query, UseInterceptors, UploadedFiles, ParseFilePipe, MaxFileSizeValidator, Delete, Param, Put } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserBookingService } from '../services/user-booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingQueryDto } from '../dto/booking-query.dto';
import { CreateRescheduleRequestDto } from '../dto/create-reschedule-request.dto';
import { RateReviewBookingDto } from '../dto/rate-review-booking.dto';
import { RespondRescheduleRequestDto } from '../dto/respond-reschedule-request.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UserAvailabilityService } from '../services/user-availability.service';
import { multerConfig } from 'src/config/multer.config';

@ApiTags('User - Bookings')
@ApiBearerAuth()
@Controller('user/bookings')
@UseGuards(JwtAuthGuard)
export class UserBookingController {
    constructor(
        private readonly userBookingService: UserBookingService,
        private readonly userAvailabilityService: UserAvailabilityService
    ) { }

    @Post()
    @UseInterceptors(FilesInterceptor('files', 5, multerConfig)) // Allow up to 5 files
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new booking (Subscription only)' })
    @ApiResponse({ status: 201, description: 'Booking created successfully' })
    async createBooking(
        @CurrentUser() user: any,
        @Body() createBookingDto: CreateBookingDto,
        @UploadedFiles() files?: Array<Express.Multer.File>,
    ) {
        return this.userBookingService.createBooking(user.id, createBookingDto, files);
    }

    @Post('payment-intent')
    @UseInterceptors(FilesInterceptor('files', 5, multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create payment intent for booking' })
    @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
    async createPaymentIntent(
        @CurrentUser() user: any,
        @Body() createBookingDto: CreateBookingDto,
        @UploadedFiles() files?: Array<Express.Multer.File>,
    ) {
        return this.userBookingService.createPaymentIntent(user.id, createBookingDto, files);
    }

    @Post('confirm')
    @ApiOperation({ summary: 'Confirm booking after payment' })
    @ApiResponse({ status: 201, description: 'Booking confirmed' })
    async confirmBooking(
        @CurrentUser() user: any,
        @Body('paymentIntentId') paymentIntentId: string,
    ) {
        return this.userBookingService.confirmBooking(user.id, paymentIntentId);
    }

    @Get()
    @ApiOperation({ summary: 'Get user bookings with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
    async getUserBookings(
        @CurrentUser() user: any,
        @Query() queryDto: BookingQueryDto,
    ) {
        return this.userBookingService.getUserBookings(user.id, queryDto);
    }


    @Delete(':id')
    @ApiOperation({ summary: 'Cancel a pending booking' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
    @ApiResponse({ status: 400, description: 'Booking cannot be cancelled' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async cancelBooking(
        @CurrentUser() user: any,
        @Param('id') bookingId: string,
    ) {
        return this.userBookingService.cancelBooking(user.id, bookingId);
    }

    @Post(':id/reschedule')
    @ApiOperation({ summary: 'Request to reschedule a booking' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 201, description: 'Reschedule request created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Booking cannot be rescheduled or slot not available' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your booking' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    @ApiResponse({ status: 409, description: 'Conflict: Pending reschedule request already exists' })
    async createRescheduleRequest(
        @CurrentUser() user: any,
        @Param('id') bookingId: string,
        @Body() createRescheduleRequestDto: CreateRescheduleRequestDto,
    ) {
        return this.userBookingService.createRescheduleRequest(user.id, bookingId, createRescheduleRequestDto);
    }

    @Delete('reschedule-requests/:requestId')
    @ApiOperation({ summary: 'Cancel a reschedule request (must be 24 hours before requested date/time)' })
    @ApiParam({ name: 'requestId', description: 'Reschedule Request ID' })
    @ApiResponse({ status: 200, description: 'Reschedule request cancelled successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Cannot cancel (less than 24 hours before requested time or already processed)' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your reschedule request' })
    @ApiResponse({ status: 404, description: 'Reschedule request not found' })
    async cancelRescheduleRequest(
        @CurrentUser() user: any,
        @Param('requestId') requestId: string,
    ) {
        return this.userBookingService.cancelRescheduleRequest(user.id, requestId);
    }

    @Get('reschedule-requests')
    @ApiOperation({ summary: 'Get user reschedule requests with pagination' })
    @ApiResponse({ status: 200, description: 'Reschedule requests retrieved successfully' })
    async getRescheduleRequests(
        @CurrentUser() user: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: string,
    ) {
        return this.userBookingService.getUserRescheduleRequests(
            user.id,
            page ? Number(page) : 1,
            limit ? Number(limit) : 10,
            status as any,
        );
    }

    @Get('reschedule-requests/:requestId')
    @ApiOperation({ summary: 'Get reschedule request details by ID' })
    @ApiParam({ name: 'requestId', description: 'Reschedule Request ID' })
    @ApiResponse({ status: 200, description: 'Reschedule request retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your reschedule request' })
    @ApiResponse({ status: 404, description: 'Reschedule request not found' })
    async getRescheduleRequestById(
        @CurrentUser() user: any,
        @Param('requestId') requestId: string,
    ) {
        return this.userBookingService.getRescheduleRequestById(user.id, requestId);
    }

    @Put('reschedule-requests/:requestId/respond')
    @ApiOperation({ summary: 'Accept or reject an admin-initiated reschedule request' })
    @ApiParam({ name: 'requestId', description: 'Reschedule Request ID' })
    @ApiResponse({ status: 200, description: 'Response submitted successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Request already processed or not admin-initiated' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your reschedule request' })
    @ApiResponse({ status: 404, description: 'Reschedule request not found' })
    async respondToAdminRescheduleRequest(
        @CurrentUser() user: any,
        @Param('requestId') requestId: string,
        @Body() respondDto: RespondRescheduleRequestDto,
    ) {
        return this.userBookingService.respondToAdminRescheduleRequest(
            user.id,
            requestId,
            respondDto.status,
        );
    }

    @Post(':id/rate-review')
    @ApiOperation({ summary: 'Rate and review a completed booking' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Rating and review submitted successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Booking is not completed' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your booking' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    @ApiResponse({ status: 409, description: 'Conflict: Booking already has a rating/review' })
    async rateReviewBooking(
        @CurrentUser() user: any,
        @Param('id') bookingId: string,
        @Body() rateReviewDto: RateReviewBookingDto,
    ) {
        return this.userBookingService.rateReviewBooking(user.id, bookingId, rateReviewDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get booking details by ID' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Booking details retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your booking' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
    async getBookingById(
        @CurrentUser() user: any,
        @Param('id') bookingId: string,
    ) {
        return this.userBookingService.getBookingById(user.id, bookingId);
    }

    @Get(':id/invoice')
    @ApiOperation({ summary: 'Get invoice for a booking' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your booking' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async getInvoiceByBooking(
        @CurrentUser() user: any,
        @Param('id') bookingId: string,
    ) {
        return this.userBookingService.getInvoiceByBooking(user.id, bookingId);
    }

    @Post(':id/invoice/payment-intent')
    @ApiOperation({ summary: 'Create payment intent for invoice' })
    @ApiParam({ name: 'id', description: 'Booking ID' })
    @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Invoice already paid or user does not have Stripe customer ID' })
    @ApiResponse({ status: 403, description: 'Forbidden: Not your booking' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async createInvoicePaymentIntent(
        @CurrentUser() user: any,
        @Param('id') bookingId: string,
    ) {
        return this.userBookingService.createInvoicePaymentIntent(user.id, bookingId);
    }

    @Post('invoice/confirm')
    @ApiOperation({ summary: 'Confirm invoice payment after payment intent succeeds' })
    @ApiResponse({ status: 200, description: 'Invoice payment confirmed successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request: Payment intent not succeeded or invoice already paid' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async confirmInvoicePayment(
        @CurrentUser() user: any,
        @Body('paymentIntentId') paymentIntentId: string,
    ) {
        return this.userBookingService.confirmInvoicePayment(user.id, paymentIntentId);
    }
}
