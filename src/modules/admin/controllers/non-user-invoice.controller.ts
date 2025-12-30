import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole, Permission } from '../../../common/constants/user.constants';
import { NonUserInvoiceService } from '../services/non-user-invoice.service';
import { CreateNonUserInvoiceDto } from '../dto/create-non-user-invoice.dto';
import { NonUserInvoiceQueryDto } from '../dto/non-user-invoice-query.dto';

@ApiTags('Admin - Non User Invoices')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/non-user-invoices')
export class NonUserInvoiceController {
    constructor(private readonly nonUserInvoiceService: NonUserInvoiceService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new non-user invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    async createInvoice(@Body() createDto: CreateNonUserInvoiceDto) {
        return this.nonUserInvoiceService.createInvoice(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all non-user invoices with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
    async getAllInvoices(@Query() queryDto: NonUserInvoiceQueryDto) {
        return this.nonUserInvoiceService.getAllInvoices(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get non-user invoice by ID' })
    @ApiParam({ name: 'id', description: 'Invoice ID' })
    @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async getInvoiceById(@Param('id') id: string) {
        return this.nonUserInvoiceService.getInvoiceById(id);
    }

    @Post(':id/send-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send invoice email with payment link' })
    @ApiParam({ name: 'id', description: 'Invoice ID' })
    @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    @ApiResponse({ status: 400, description: 'Invoice is already paid' })
    async sendInvoiceEmail(@Param('id') id: string) {
        return this.nonUserInvoiceService.sendInvoiceEmail(id);
    }

    @Get(':id/payment-success')
    @Public()
    @ApiOperation({ summary: 'Payment success redirect page (public)' })
    @ApiParam({ name: 'id', description: 'Invoice ID' })
    @ApiResponse({ status: 200, description: 'Payment success page' })
    async paymentSuccess(
        @Param('id') id: string,
        @Query('session_id') sessionId: string,
        @Res() res: Response,
    ) {
        // Verify payment and update invoice status, return HTML page
        const html = await this.nonUserInvoiceService.handlePaymentSuccess(id, sessionId);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    }

    @Get(':id/payment-cancel')
    @Public()
    @ApiOperation({ summary: 'Payment cancel redirect page (public)' })
    @ApiParam({ name: 'id', description: 'Invoice ID' })
    @ApiResponse({ status: 200, description: 'Payment cancelled' })
    async paymentCancel(@Param('id') id: string, @Res() res: Response) {
        // Return HTML page for cancelled payment
        const html = this.nonUserInvoiceService.generatePaymentCancelHtml(id);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    }
}

