import { Controller, Post, Headers, Req, HttpCode, HttpStatus, Logger, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import Stripe from 'stripe';
import { NonUserInvoiceService } from '../services/non-user-invoice.service';
import { NonUserInvoiceStatus } from '../../../shared/schemas/non-user-invoice.schema';
import { Public } from '../../../common/decorators/public.decorator';
import { StripeService } from '../../../common/services/stripe.service';

@ApiTags('Stripe Webhook')
@Controller('stripe/webhook')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);

    constructor(
        private readonly nonUserInvoiceService: NonUserInvoiceService,
        private readonly configService: ConfigService,
        private readonly stripeService: StripeService,
    ) { }

    @Post()
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle Stripe webhook events' })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    async handleWebhook(
        @Req() req: Request,
        @Headers('stripe-signature') signature: string,
        @Body() body: any,
    ) {
        const webhookSecret = this.configService.get<string>('stripe.webhookSecret');

        if (!webhookSecret) {
            this.logger.warn('Stripe webhook secret not configured');
            return { received: true };
        }

        let event: Stripe.Event;
        const stripe = this.stripeService.getStripe();

        try {
            // Get raw body from request
            const rawBody = (req as any).rawBody || JSON.stringify(body);
            
            // Verify webhook signature
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret,
            );
        } catch (err: any) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            return { received: false, error: err.message };
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.payment_failed':
                this.logger.warn(`Payment failed for payment intent: ${(event.data.object as Stripe.PaymentIntent).id}`);
                break;

            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
    }

    /**
     * Handle checkout session completed event
     */
    private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
        try {
            this.logger.log(`Processing checkout.session.completed for session: ${session.id}`);

            // Check if this is a non-user invoice
            if (session.metadata?.type === 'non_user_invoice' && session.metadata?.invoiceId) {
                const invoiceId = session.metadata.invoiceId;
                const paymentIntentId = session.payment_intent as string;

                // Update invoice status to PAID
                await this.nonUserInvoiceService.updateInvoiceStatusFromWebhook(
                    session.id,
                    NonUserInvoiceStatus.PAID,
                    new Date(),
                );

                // Update payment intent ID if available
                if (paymentIntentId) {
                    await this.nonUserInvoiceService.updateInvoicePaymentIntent(invoiceId, paymentIntentId);
                }

                this.logger.log(`Invoice ${invoiceId} marked as paid via checkout session ${session.id}`);
            }
        } catch (error) {
            this.logger.error(`Error handling checkout.session.completed: ${error.message}`, error.stack);
        }
    }

    /**
     * Handle payment intent succeeded event
     */
    private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
        try {
            this.logger.log(`Processing payment_intent.succeeded for payment intent: ${paymentIntent.id}`);

            // For non-user invoices, the checkout.session.completed event should handle it
            // This is a fallback in case the session event doesn't fire
            // We'll check metadata for invoice information
            if (paymentIntent.metadata?.type === 'non_user_invoice' && paymentIntent.metadata?.invoiceId) {
                const invoiceId = paymentIntent.metadata.invoiceId;
                
                // Try to find invoice by payment intent ID
                const invoice = await this.nonUserInvoiceService.getRepository()
                    .findByStripePaymentIntentId(paymentIntent.id);

                if (invoice && invoice.status !== NonUserInvoiceStatus.PAID) {
                    await this.nonUserInvoiceService.updateInvoiceStatusFromWebhook(
                        invoice.stripeCheckoutSessionId || '',
                        NonUserInvoiceStatus.PAID,
                        new Date(),
                    );

                    this.logger.log(`Invoice ${invoice._id} marked as paid via payment intent ${paymentIntent.id}`);
                }
            }
        } catch (error: any) {
            this.logger.error(`Error handling payment_intent.succeeded: ${error.message}`, error.stack);
        }
    }
}

