import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PlanRepository } from '../../../shared/repositories/plan.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { StripeService } from '../../../common/services/stripe.service';
import { PlanStatus, PlanInterval } from '../../../common/constants/plan.constants';
import { PaymentType, PaymentStatus } from '../../../common/constants/payment.constants';
import { SubscriptionStatus } from '../../../common/constants/subscription.constants';

@Injectable()
export class PlanService {
    private readonly logger = new Logger(PlanService.name);

    constructor(
        private readonly planRepository: PlanRepository,
        private readonly userRepository: UserRepository,
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly stripeService: StripeService,
    ) { }

    async getActivePlans() {
        try {
            const plans = await this.planRepository.findActivePlans();
            return plans.map(plan => this.formatPlanResponse(plan));
        } catch (error) {
            this.logger.error(`Failed to get active plans: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve plans');
        }
    }

    async createPaymentIntent(userId: string, planId: string) {
        try {
            // 1. Validate plan
            const plan = await this.planRepository.findById(planId);
            if (!plan || plan.status !== PlanStatus.ACTIVE) {
                throw new NotFoundException('Plan not found or inactive');
            }

            // 2. Get user
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            // 3. Ensure user has Stripe customer ID
            if (!user.stripeCustomerId) {
                throw new BadRequestException('User does not have a Stripe customer ID');
            }

            // 4. Create payment intent in Stripe
            const stripe = this.stripeService.getStripe();
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(plan.amount * 100), // Convert to cents
                currency: plan.currency,
                customer: user.stripeCustomerId,
                setup_future_usage: 'off_session',
                metadata: {
                    userId: userId,
                    planId: planId,
                    planName: plan.name,
                },
            });

            // 5. Create payment log
            await this.paymentLogRepository.create({
                userId: user._id as any,
                paymentType: PaymentType.SUBSCRIPTION,
                planId: plan._id as any,
                paymentIntentId: paymentIntent.id,
                amount: plan.amount,
                currency: plan.currency,
                status: PaymentStatus.PENDING,
                metadata: {
                    planName: plan.name,
                },
                stripeResponse: paymentIntent as any,
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: plan.amount,
                currency: plan.currency,
            };
        } catch (error) {
            this.logger.error(`Failed to create payment intent: ${error.message}`);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create payment intent');
        }
    }

    async subscribeToPlan(userId: string, planId: string, paymentIntentId: string) {
        try {
            // 1. Validate plan
            const plan = await this.planRepository.findById(planId);
            if (!plan || plan.status !== PlanStatus.ACTIVE) {
                throw new NotFoundException('Plan not found or inactive');
            }

            // 2. Get user
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (!user.stripeCustomerId) {
                throw new BadRequestException('User does not have a Stripe customer ID');
            }

            // 3. Verify payment intent
            const stripe = this.stripeService.getStripe();
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                throw new BadRequestException('Payment has not been completed');
            }

            // Verify setup_future_usage is set (to ensure PM is saved)
            if (paymentIntent.setup_future_usage !== 'off_session') {
                throw new BadRequestException('Payment Intent was not created for future usage. Please create a new Payment Intent.');
            }

            // Verify PaymentIntent customer matches User's Stripe Customer ID
            if (paymentIntent.customer !== user.stripeCustomerId) {
                this.logger.error(`PaymentIntent customer mismatch: PI Customer ${paymentIntent.customer} vs User Customer ${user.stripeCustomerId}`);
                throw new BadRequestException('Payment intent belongs to a different customer');
            }

            // 4. Check if payment log exists
            const paymentLog = await this.paymentLogRepository.findByPaymentIntentId(paymentIntentId);
            if (!paymentLog) {
                throw new NotFoundException('Payment log not found');
            }

            // 5. Attach payment method to customer if not already attached
            if (paymentIntent.payment_method) {
                const paymentMethodId = paymentIntent.payment_method as string;
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

                // Log for debugging
                this.logger.log(`PaymentMethod Customer: ${paymentMethod.customer}, User Customer: ${user.stripeCustomerId}`);

                if (paymentMethod.customer !== user.stripeCustomerId) {
                    this.logger.log(`Attaching PaymentMethod ${paymentMethodId} to Customer ${user.stripeCustomerId}`);
                    await stripe.paymentMethods.attach(paymentMethodId, {
                        customer: user.stripeCustomerId,
                    });
                }
            }

            // 6. Validate that the plan has a Stripe price ID
            if (!plan.stripePriceId) {
                throw new BadRequestException('Plan does not have a Stripe price ID configured');
            }

            // 7. Verify that the Stripe price is recurring (not one-time)
            let stripePrice;
            try {
                stripePrice = await stripe.prices.retrieve(plan.stripePriceId);
            } catch (priceError: any) {
                this.logger.error(`Failed to retrieve Stripe price ${plan.stripePriceId}: ${priceError.message}`);
                throw new BadRequestException(`Invalid Stripe price ID: ${plan.stripePriceId}`);
            }

            if (!stripePrice.recurring) {
                throw new BadRequestException(
                    `The plan's Stripe price (${plan.stripePriceId}) is set to one-time, but subscriptions require a recurring price. Please update the plan with a recurring price.`
                );
            }

            // 8. Calculate trial end (to avoid double charge for first period)
            const trialEnd = new Date();
            if (plan.interval === PlanInterval.YEARLY) {
                trialEnd.setFullYear(trialEnd.getFullYear() + 1);
            } else {
                trialEnd.setMonth(trialEnd.getMonth() + 1);
            }
            const trialEndTimestamp = Math.floor(trialEnd.getTime() / 1000);

            // 9. Create Stripe subscription
            const subscription = await stripe.subscriptions.create({
                customer: user.stripeCustomerId,
                items: [{ price: plan.stripePriceId }],
                default_payment_method: paymentIntent.payment_method as string,
                trial_end: trialEndTimestamp,
                metadata: {
                    userId: userId,
                    planId: planId,
                },
            });

            // 10. Create user subscription
            const userSubscription = await this.userSubscriptionRepository.create({
                userId: user._id as any,
                planId: plan._id as any,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: user.stripeCustomerId,
                status: SubscriptionStatus.ACTIVE, // User already paid via PaymentIntent
                currentPeriodStart: new Date(),
                currentPeriodEnd: trialEnd,
                cancelAtPeriodEnd: false,
            });

            // 11. Update payment log
            await this.paymentLogRepository.update(paymentLog._id.toString(), {
                subscriptionId: userSubscription._id,
                status: PaymentStatus.SUCCEEDED,
                stripeResponse: {
                    ...paymentLog.stripeResponse,
                    subscription: subscription,
                },
            });

            return {
                subscription: {
                    id: userSubscription._id.toString(),
                    planName: plan.name,
                    status: userSubscription.status,
                    currentPeriodStart: userSubscription.currentPeriodStart,
                    currentPeriodEnd: userSubscription.currentPeriodEnd,
                },
            };
        } catch (error) {
            this.logger.error(`Failed to subscribe to plan: ${error.message}`);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to subscribe to plan');
        }
    }

    /**
     * Get current subscription for a user
     */
    async getCurrentSubscription(userId: string) {
        try {
            // Get the most recent subscription (active or not)
            const subscription = await this.userSubscriptionRepository.findByUserId(userId);

            if (!subscription) {
                return {
                    subscription: null,
                    message: 'No subscription found',
                };
            }

            const subscriptionObj = subscription.toObject ? subscription.toObject() : subscription;
            const planObj = subscriptionObj.planId?.toObject ? subscriptionObj.planId.toObject() : subscriptionObj.planId;

            // Check if subscription is currently active (status is ACTIVE or TRIALING and period hasn't ended)
            const now = new Date();
            const isCurrentlyActive = 
                (subscriptionObj.status === SubscriptionStatus.ACTIVE || subscriptionObj.status === SubscriptionStatus.TRIALING) &&
                new Date(subscriptionObj.currentPeriodEnd) > now;

            return {
                subscription: {
                    id: subscriptionObj._id.toString(),
                    plan: planObj ? {
                        id: planObj._id.toString(),
                        name: planObj.name,
                        description: planObj.description,
                        amount: planObj.amount,
                        currency: planObj.currency,
                        interval: planObj.interval,
                        videoSessions: planObj.videoSessions,
                    } : null,
                    status: subscriptionObj.status,
                    isActive: isCurrentlyActive,
                    currentPeriodStart: subscriptionObj.currentPeriodStart ? new Date(subscriptionObj.currentPeriodStart).toISOString() : null,
                    currentPeriodEnd: subscriptionObj.currentPeriodEnd ? new Date(subscriptionObj.currentPeriodEnd).toISOString() : null,
                    cancelAtPeriodEnd: subscriptionObj.cancelAtPeriodEnd,
                    canceledAt: subscriptionObj.canceledAt ? new Date(subscriptionObj.canceledAt).toISOString() : null,
                    endedAt: subscriptionObj.endedAt ? new Date(subscriptionObj.endedAt).toISOString() : null,
                    stripeSubscriptionId: subscriptionObj.stripeSubscriptionId,
                    createdAt: subscriptionObj.createdAt ? new Date(subscriptionObj.createdAt).toISOString() : null,
                    updatedAt: subscriptionObj.updatedAt ? new Date(subscriptionObj.updatedAt).toISOString() : null,
                },
            };
        } catch (error) {
            this.logger.error(`Failed to get current subscription: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve current subscription');
        }
    }

    private formatPlanResponse(plan: any) {
        if (!plan) return null;

        const planObj = plan.toObject
            ? plan.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(plan));

        const response: any = {};

        if (planObj._id) {
            response.id = planObj._id.toString();
        }

        const properties = [
            'name',
            'amount',
            'currency',
            'videoSessions',
            'slots',
            'interval',
            'description',
        ];

        properties.forEach(prop => {
            if (planObj[prop] !== undefined) {
                response[prop] = planObj[prop];
            }
        });

        return response;
    }
}
