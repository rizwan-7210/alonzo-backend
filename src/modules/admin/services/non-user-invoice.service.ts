import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NonUserInvoiceRepository } from '../../../shared/repositories/non-user-invoice.repository';
import { NonUserInvoiceStatus } from '../../../shared/schemas/non-user-invoice.schema';
import { CreateNonUserInvoiceDto } from '../dto/create-non-user-invoice.dto';
import { NonUserInvoiceQueryDto } from '../dto/non-user-invoice-query.dto';
import { StripeService } from '../../../common/services/stripe.service';
import { EmailService } from '../../../common/services/email.service';
import { FormatterService } from '../../../shared/services/formatter.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../../shared/schemas/notification.schema';

@Injectable()
export class NonUserInvoiceService {
    private readonly logger = new Logger(NonUserInvoiceService.name);

    constructor(
        private readonly nonUserInvoiceRepository: NonUserInvoiceRepository,
        private readonly stripeService: StripeService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
        private readonly formatterService: FormatterService,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Generate unique invoice number
     */
    private async generateInvoiceNumber(): Promise<string> {
        const prefix = 'INV-';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `${prefix}${timestamp}${random}`;

        // Check if invoice number already exists
        const existing = await this.nonUserInvoiceRepository.findByInvoiceNumber(invoiceNumber);
        if (existing) {
            // If exists, generate a new one recursively
            return this.generateInvoiceNumber();
        }

        return invoiceNumber;
    }

    /**
     * Calculate total amount from line items
     */
    private calculateTotal(lineItems: Array<{ quantity: number; unitPrice: number }>): number {
        return lineItems.reduce((total, item) => {
            return total + (item.quantity * item.unitPrice);
        }, 0);
    }

    /**
     * Create a non-user invoice and automatically send email
     */
    async createInvoice(createDto: CreateNonUserInvoiceDto) {
        try {
            // Generate invoice number
            const invoiceNumber = await this.generateInvoiceNumber();

            // Calculate total amount
            const lineItems = createDto.lineItems.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
            }));

            const amount = this.calculateTotal(createDto.lineItems);

            // Stripe limit: total must be <= 999,999.99 USD
            const maxAmount = 999999.99;
            if (amount > maxAmount) {
                throw new BadRequestException(`Total invoice amount cannot exceed $${maxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please reduce the line items or amounts.`);
            }

            // Create invoice in database
            const invoice = await this.nonUserInvoiceRepository.create({
                customerName: createDto.customerName,
                email: createDto.email,
                address: createDto.address,
                invoiceNumber,
                amount,
                currency: 'usd',
                status: NonUserInvoiceStatus.DRAFT,
                invoiceDate: new Date(),
                dueDate: createDto.dueDate ? new Date(createDto.dueDate) : undefined,
                lineItems,
                metadata: createDto.metadata || {},
            });

            // Notify admins that a new non-user invoice was created
            try {
                await this.notificationService.notifyAdmins({
                    title: 'New Non-User Invoice Created',
                    message: `A new non-user invoice ${invoice.invoiceNumber} was created for ${invoice.customerName} (${invoice.email}) with amount $${invoice.amount.toFixed(2)}.`,
                    type: NotificationType.SYSTEM,
                    data: {
                        invoiceId: invoice._id.toString(),
                        invoiceNumber,
                        amount: invoice.amount,
                        customerName: invoice.customerName,
                        customerEmail: invoice.email,
                    },
                });
            } catch (notifyError) {
                this.logger.error(`Failed to send admin notification for non-user invoice creation: ${notifyError.message}`, notifyError.stack);
            }

            // Automatically send invoice email with payment link
            try {
                const emailResult = await this.sendInvoiceEmail(invoice._id.toString());
                return {
                    invoice: emailResult.invoice,
                    paymentLink: emailResult.paymentLink,
                    message: 'Invoice created and sent successfully via email',
                };
            } catch (emailError: any) {
                // If email fails, still return the created invoice but log the error
                this.logger.error(`Failed to send invoice email: ${emailError.message}`, emailError.stack);
                return {
                    invoice: this.formatterService.formatNonUserInvoice(invoice),
                    message: 'Invoice created successfully, but email sending failed. You can send it manually later.',
                    warning: emailError.message,
                };
            }
        } catch (error: any) {
            this.logger.error(`Failed to create invoice: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to create invoice');
        }
    }

    /**
     * Generate Stripe payment link and send invoice via email
     */
    async sendInvoiceEmail(invoiceId: string) {
        try {
            const invoice = await this.nonUserInvoiceRepository.findById(invoiceId);
            if (!invoice) {
                throw new NotFoundException('Invoice not found');
            }

            if (invoice.status === NonUserInvoiceStatus.PAID) {
                throw new BadRequestException('Invoice is already paid');
            }

            const stripe = this.stripeService.getStripe();

            // Create or get Stripe customer
            let customerId = invoice.stripeCustomerId;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: invoice.email,
                    name: invoice.customerName,
                    metadata: {
                        invoiceId: invoice._id.toString(),
                        invoiceNumber: invoice.invoiceNumber,
                    },
                });
                customerId = customer.id;
            }

            // Create Stripe Checkout Session
            const lineItems = invoice.lineItems.map(item => ({
                price_data: {
                    currency: invoice.currency || 'usd',
                    product_data: {
                        name: item.description,
                    },
                    unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
                },
                quantity: item.quantity,
            }));

            const appUrl = this.configService.get<string>('app.url') || 'http://localhost:3000';
            const successUrl = `${appUrl}/api/v1/admin/non-user-invoices/${invoiceId}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${appUrl}/api/v1/admin/non-user-invoices/${invoiceId}/payment-cancel`;

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    invoiceId: invoice._id.toString(),
                    invoiceNumber: invoice.invoiceNumber,
                    type: 'non_user_invoice',
                },
                invoice_creation: {
                    enabled: true,
                },
            });

            // Update invoice with Stripe information
            await this.nonUserInvoiceRepository.updateStripeInfo(
                invoiceId,
                session.id,
                session.url || undefined,
                undefined,
                customerId
            );

            // Update status to SENT
            await this.nonUserInvoiceRepository.updateStatus(invoiceId, NonUserInvoiceStatus.SENT);

            // Send email with payment link
            const emailHtml = this.generateInvoiceEmailHtml(invoice, session.url || '');

            await this.emailService.sendEmail({
                to: invoice.email,
                subject: `Invoice ${invoice.invoiceNumber} - Payment Required`,
                html: emailHtml,
            });

            // Get updated invoice
            const updatedInvoice = await this.nonUserInvoiceRepository.findById(invoiceId);

            return {
                invoice: this.formatterService.formatNonUserInvoice(updatedInvoice!),
                paymentLink: session.url,
                message: 'Invoice sent successfully via email',
            };
        } catch (error) {
            this.logger.error(`Failed to send invoice email: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to send invoice email');
        }
    }

    /**
     * Generate invoice email HTML
     */
    private generateInvoiceEmailHtml(invoice: any, paymentLink: string): string {
        const lineItemsHtml = invoice.lineItems.map((item: any) => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.description}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${item.total.toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; }
                    .invoice-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
                    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>CMS PLUMBING INC.</h1>
                        <p>Invoice ${invoice.invoiceNumber}</p>
                    </div>
                    <div class="content">
                        <div class="invoice-details">
                            <h2>Invoice Information</h2>
                            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                            <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                            ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
                        </div>
                        <div class="invoice-details">
                            <h2>Customer Information</h2>
                            <p><strong>Name:</strong> ${invoice.customerName}</p>
                            <p><strong>Email:</strong> ${invoice.email}</p>
                            ${invoice.address ? `<p><strong>Address:</strong> ${invoice.address}</p>` : ''}
                        </div>
                        <div class="invoice-details">
                            <h2>Service / Work Details</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Service/Parts</th>
                                        <th style="text-align: center;">Qty</th>
                                        <th style="text-align: right;">Unit Price</th>
                                        <th style="text-align: right;">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${lineItemsHtml}
                                </tbody>
                            </table>
                            <div class="total">
                                Total Amount: $${invoice.amount.toFixed(2)}
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <a href="${paymentLink}" class="button">Pay Now</a>
                        </div>
                        <p style="text-align: center; color: #666; font-size: 12px;">
                            Click the button above to complete your payment securely via Stripe.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Get all non-user invoices with filters and pagination
     */
    async getAllInvoices(queryDto: NonUserInvoiceQueryDto) {
        const { page = 1, limit = 10, status, dateFrom, dateTo, search } = queryDto;

        // Build query filters
        const query: any = {};

        if (status) {
            query.status = status;
        }

        if (dateFrom || dateTo) {
            query.invoiceDate = {};
            if (dateFrom) {
                query.invoiceDate.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                query.invoiceDate.$lte = endDate;
            }
        }

        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { invoiceNumber: { $regex: search, $options: 'i' } },
            ];
        }

        const result = await this.nonUserInvoiceRepository.paginate(page, limit, query, { sort: { createdAt: -1 } });

        return {
            data: result.data.map(invoice => this.formatterService.formatNonUserInvoice(invoice)),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
        };
    }

    /**
     * Get invoice by ID
     */
    async getInvoiceById(invoiceId: string) {
        const invoice = await this.nonUserInvoiceRepository.findById(invoiceId);
        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return {
            invoice: this.formatterService.formatNonUserInvoice(invoice),
        };
    }

    /**
     * Update invoice status (called by webhook)
     */
    async updateInvoiceStatusFromWebhook(sessionId: string, status: NonUserInvoiceStatus, paidAt?: Date) {
        const invoice = await this.nonUserInvoiceRepository.findByStripeCheckoutSessionId(sessionId);
        if (!invoice) {
            this.logger.warn(`Invoice not found for session ID: ${sessionId}`);
            return null;
        }

        const previousStatus = invoice.status;
        const updated = await this.nonUserInvoiceRepository.updateStatus(invoice._id.toString(), status, paidAt);

        // If status changed to PAID, notify admins
        if (updated && previousStatus !== NonUserInvoiceStatus.PAID && status === NonUserInvoiceStatus.PAID) {
            try {
                await this.notificationService.notifyAdmins({
                    title: 'Non-User Invoice Paid',
                    message: `Non-user invoice ${updated.invoiceNumber} for ${updated.customerName} (${updated.email}) has been paid. Amount: $${updated.amount.toFixed(2)}.`,
                    type: NotificationType.SYSTEM,
                    data: {
                        invoiceId: updated._id.toString(),
                        invoiceNumber: updated.invoiceNumber,
                        amount: updated.amount,
                        customerName: updated.customerName,
                        customerEmail: updated.email,
                        stripeCheckoutSessionId: updated.stripeCheckoutSessionId,
                    },
                });
            } catch (notifyError) {
                this.logger.error(`Failed to send admin notification for non-user invoice payment: ${notifyError.message}`, notifyError.stack);
            }
        }

        return updated;
    }

    /**
     * Update invoice with payment intent (called by webhook)
     */
    async updateInvoicePaymentIntent(invoiceId: string, paymentIntentId: string) {
        return await this.nonUserInvoiceRepository.updateStripeInfo(
            invoiceId,
            undefined,
            undefined,
            paymentIntentId
        );
    }

    /**
     * Handle payment success redirect - verify payment and update status
     */
    async handlePaymentSuccess(invoiceId: string, sessionId?: string) {
        try {
            const invoice = await this.nonUserInvoiceRepository.findById(invoiceId);
            if (!invoice) {
                return this.generatePaymentErrorHtml('Invoice not found');
            }

            const previousStatus = invoice.status;
            let paymentVerified = false;
            let paymentStatus = invoice.status;

            // If we have a session ID, verify payment with Stripe
            if (sessionId || invoice.stripeCheckoutSessionId) {
                const stripe = this.stripeService.getStripe();
                const checkoutSessionId = sessionId || invoice.stripeCheckoutSessionId;

                if (checkoutSessionId) {
                    try {
                        // Retrieve the checkout session from Stripe
                        const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

                        // Check if payment was successful
                        if (session.payment_status === 'paid') {
                            paymentVerified = true;

                            // Update invoice status to PAID if not already paid
                            if (invoice.status !== NonUserInvoiceStatus.PAID) {
                                await this.nonUserInvoiceRepository.updateStatus(
                                    invoiceId,
                                    NonUserInvoiceStatus.PAID,
                                    new Date(),
                                );
                                paymentStatus = NonUserInvoiceStatus.PAID;

                                // Fetch updated invoice to ensure latest data for notifications
                                const updatedInvoice = await this.nonUserInvoiceRepository.findById(invoiceId);

                                // Notify admins only if status actually changed to PAID here
                                if (updatedInvoice && previousStatus !== NonUserInvoiceStatus.PAID) {
                                    try {
                                        await this.notificationService.notifyAdmins({
                                            title: 'Non-User Invoice Paid',
                                            message: `Non-user invoice ${updatedInvoice.invoiceNumber} for ${updatedInvoice.customerName} (${updatedInvoice.email}) has been paid. Amount: $${updatedInvoice.amount.toFixed(2)}.`,
                                            type: NotificationType.SYSTEM,
                                            data: {
                                                invoiceId: updatedInvoice._id.toString(),
                                                invoiceNumber: updatedInvoice.invoiceNumber,
                                                amount: updatedInvoice.amount,
                                                customerName: updatedInvoice.customerName,
                                                customerEmail: updatedInvoice.email,
                                                stripeCheckoutSessionId: updatedInvoice.stripeCheckoutSessionId,
                                            },
                                        });
                                    } catch (notifyError) {
                                        this.logger.error(`Failed to send admin notification for non-user invoice payment (success redirect): ${notifyError.message}`, notifyError.stack);
                                    }
                                }
                            }

                            // Update payment intent ID if available
                            if (session.payment_intent) {
                                await this.nonUserInvoiceRepository.updateStripeInfo(
                                    invoiceId,
                                    undefined,
                                    undefined,
                                    session.payment_intent as string
                                );
                            }

                            this.logger.log(`Invoice ${invoiceId} marked as paid via payment success redirect`);
                        }
                    } catch (stripeError: any) {
                        this.logger.error(`Failed to verify payment with Stripe: ${stripeError.message}`);
                        // If Stripe verification fails, check if invoice is already paid
                        if (invoice.status === NonUserInvoiceStatus.PAID) {
                            paymentVerified = true;
                            paymentStatus = NonUserInvoiceStatus.PAID;
                        }
                    }
                }
            }

            // If invoice is already paid, show success
            if (invoice.status === NonUserInvoiceStatus.PAID || paymentStatus === NonUserInvoiceStatus.PAID) {
                return this.generatePaymentSuccessHtml(invoice);
            }

            // Payment not verified yet, show processing message
            return this.generatePaymentProcessingHtml(invoice);
        } catch (error: any) {
            this.logger.error(`Error handling payment success: ${error.message}`, error.stack);
            return this.generatePaymentErrorHtml('An error occurred while processing your payment');
        }
    }

    /**
     * Generate payment success HTML page
     */
    private generatePaymentSuccessHtml(invoice: any): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - CMS Plumbing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        .success-icon {
            width: 100px;
            height: 100px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            animation: scaleIn 0.5s ease-out;
        }
        .success-icon svg {
            width: 60px;
            height: 60px;
            color: white;
        }
        @keyframes scaleIn {
            from {
                transform: scale(0);
            }
            to {
                transform: scale(1);
            }
        }
        h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 700;
        }
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .invoice-details {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }
        .invoice-details h3 {
            color: #1f2937;
            font-size: 18px;
            margin-bottom: 15px;
            text-align: center;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            color: #6b7280;
            font-weight: 500;
        }
        .detail-value {
            color: #1f2937;
            font-weight: 600;
        }
        .amount {
            font-size: 24px;
            color: #10b981;
            font-weight: 700;
        }
        .footer {
            margin-top: 30px;
            color: #9ca3af;
            font-size: 14px;
        }
        .company-logo {
            margin-bottom: 20px;
        }
        .company-logo h2 {
            color: #dc2626;
            font-size: 24px;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="company-logo">
            <h2>CMS PLUMBING INC.</h2>
        </div>
        <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <h1>Payment Successful!</h1>
        <p class="message">Thank you for your payment. Your invoice has been paid successfully.</p>
        <div class="invoice-details">
            <h3>Invoice Details</h3>
            <div class="detail-row">
                <span class="detail-label">Invoice Number:</span>
                <span class="detail-value">${invoice.invoiceNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Customer Name:</span>
                <span class="detail-value">${invoice.customerName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount Paid:</span>
                <span class="detail-value amount">$${invoice.amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Date:</span>
                <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>
        </div>
        <div class="footer">
            <p>Your payment has been processed securely through Stripe.</p>
            <p style="margin-top: 10px;">You will receive a confirmation email shortly.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate payment processing HTML page
     */
    private generatePaymentProcessingHtml(invoice: any): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Processing - CMS Plumbing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #f3f4f6;
            border-top: 4px solid #f59e0b;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 30px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 700;
        }
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .footer {
            margin-top: 30px;
            color: #9ca3af;
            font-size: 14px;
        }
        .company-logo {
            margin-bottom: 20px;
        }
        .company-logo h2 {
            color: #dc2626;
            font-size: 24px;
            font-weight: 700;
        }
    </style>
    <script>
        // Auto-refresh after 3 seconds to check payment status
        setTimeout(function() {
            window.location.reload();
        }, 3000);
    </script>
</head>
<body>
    <div class="container">
        <div class="company-logo">
            <h2>CMS PLUMBING INC.</h2>
        </div>
        <div class="spinner"></div>
        <h1>Processing Payment...</h1>
        <p class="message">Your payment is being processed. Please wait while we verify your transaction.</p>
        <p class="message">This page will automatically refresh in a few seconds.</p>
        <div class="footer">
            <p>Invoice: ${invoice.invoiceNumber}</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate payment error HTML page
     */
    private generatePaymentErrorHtml(errorMessage: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Error - CMS Plumbing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        .error-icon {
            width: 100px;
            height: 100px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
        }
        .error-icon svg {
            width: 60px;
            height: 60px;
            color: white;
        }
        h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 700;
        }
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .footer {
            margin-top: 30px;
            color: #9ca3af;
            font-size: 14px;
        }
        .company-logo {
            margin-bottom: 20px;
        }
        .company-logo h2 {
            color: #dc2626;
            font-size: 24px;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="company-logo">
            <h2>CMS PLUMBING INC.</h2>
        </div>
        <div class="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </div>
        <h1>Payment Error</h1>
        <p class="message">${errorMessage}</p>
        <p class="message">Please contact support if you continue to experience issues.</p>
        <div class="footer">
            <p>If you have already paid, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate payment cancel HTML page
     */
    generatePaymentCancelHtml(invoiceId: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Cancelled - CMS Plumbing</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        .cancel-icon {
            width: 100px;
            height: 100px;
            background: #6b7280;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
        }
        .cancel-icon svg {
            width: 60px;
            height: 60px;
            color: white;
        }
        h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 700;
        }
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .footer {
            margin-top: 30px;
            color: #9ca3af;
            font-size: 14px;
        }
        .company-logo {
            margin-bottom: 20px;
        }
        .company-logo h2 {
            color: #dc2626;
            font-size: 24px;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="company-logo">
            <h2>CMS PLUMBING INC.</h2>
        </div>
        <div class="cancel-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </div>
        <h1>Payment Cancelled</h1>
        <p class="message">Your payment was cancelled. No charges have been made to your account.</p>
        <p class="message">You can try again later or contact us if you need assistance.</p>
        <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Get repository (for webhook access)
     */
    getRepository() {
        return this.nonUserInvoiceRepository;
    }
}

