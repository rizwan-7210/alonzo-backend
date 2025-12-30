import { Controller, Post, Headers, Req, HttpCode, HttpStatus, Logger, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import Stripe from 'stripe';
import { Public } from '../../../common/decorators/public.decorator';
import { StripeService } from '../../../common/services/stripe.service';

@ApiTags('Stripe Webhook')
@Controller('stripe/webhook')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);

    constructor(
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
            case 'payment_intent.succeeded':
                this.logger.log(`Payment succeeded for payment intent: ${(event.data.object as Stripe.PaymentIntent).id}`);
                break;

            case 'payment_intent.payment_failed':
                this.logger.warn(`Payment failed for payment intent: ${(event.data.object as Stripe.PaymentIntent).id}`);
                break;

            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
    }
}

