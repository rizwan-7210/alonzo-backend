import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe: Stripe | null = null;

    constructor(private readonly configService: ConfigService) {
        const secretKey = this.configService.get<string>('stripe.secretKey');
        if (secretKey) {
            this.stripe = new Stripe(secretKey, {
                apiVersion: '2025-12-15.clover' as any,
            });
        }
    }

    async createCustomer(email: string, name: string): Promise<string> {
        if (!this.stripe) {
            throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
        }
        const customer = await this.stripe.customers.create({
            email,
            name,
        });
        return customer.id;
    }

    async ensureCustomer(user: { email: string; firstName: string; lastName: string; stripeCustomerId?: string }): Promise<string> {
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const fullName = `${user.firstName} ${user.lastName}`;
        return this.createCustomer(user.email, fullName);
    }

    getStripe(): Stripe {
        if (!this.stripe) {
            throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
        }
        return this.stripe;
    }

    /**
     * Create a PaymentIntent for one-time payment.
     * @param amountInCents amount in smallest currency unit (e.g. cents for USD)
     * @param currency e.g. 'usd'
     * @param options optional customerId and metadata
     * @returns Stripe PaymentIntent (include client_secret for client-side confirmation)
     */
    async createPaymentIntent(
        amountInCents: number,
        currency: string = 'usd',
        options?: { customerId?: string; metadata?: Record<string, string> },
    ): Promise<Stripe.PaymentIntent> {
        const stripe = this.getStripe();
        const params: Stripe.PaymentIntentCreateParams = {
            amount: amountInCents,
            currency,
            automatic_payment_methods: { enabled: true },
            ...(options?.metadata && { metadata: options.metadata }),
            ...(options?.customerId && { customer: options.customerId }),
        };
        return stripe.paymentIntents.create(params);
    }

    async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        const stripe = this.getStripe();
        return stripe.paymentIntents.retrieve(paymentIntentId);
    }
}
