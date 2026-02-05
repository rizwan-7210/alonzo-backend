import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PlanRepository } from '../../../shared/repositories/plan.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { UserSubscriptionRepository } from '../../../shared/repositories/user-subscription.repository';
import { PaymentLogRepository } from '../../../shared/repositories/payment-log.repository';
import { StripeService } from '../../../common/services/stripe.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { ListPlansDto } from '../dto/list-plans.dto';
import { PlanStatus, PlanDuration } from '../../../common/constants/plan.constants';
import { UserSubscriptionStatus } from '../../../common/constants/subscription.constants';
import { PaymentType, PaymentStatus } from '../../../common/constants/payment.constants';
import Stripe from 'stripe';

@Injectable()
export class PlansService {
    private readonly logger = new Logger(PlansService.name);

    constructor(
        private readonly planRepository: PlanRepository,
        private readonly userRepository: UserRepository,
        private readonly userSubscriptionRepository: UserSubscriptionRepository,
        private readonly paymentLogRepository: PaymentLogRepository,
        private readonly stripeService: StripeService,
    ) { }

    /**
     * Convert PlanDuration to Stripe interval
     */
    private getStripeInterval(duration: PlanDuration): Stripe.Price.Recurring.Interval {
        return duration === PlanDuration.MONTHLY ? 'month' : 'year';
    }

    async create(createDto: CreatePlanDto) {
        try {
            const stripe = this.stripeService.getStripe();

            // 1. Create Stripe Product
            const stripeProduct = await stripe.products.create({
                name: createDto.title.trim(),
                description: createDto.description || undefined,
            });

            this.logger.log(`Stripe product created: ${stripeProduct.id}`);

            // 2. Create Stripe Price (recurring)
            const stripeInterval = this.getStripeInterval(createDto.duration);
            const stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: Math.round(createDto.amount * 100), // Convert to cents
                currency: 'usd',
                recurring: {
                    interval: stripeInterval,
                },
            });

            this.logger.log(`Stripe price created: ${stripePrice.id} (${stripeInterval})`);

            // 3. Save Plan to Database with Stripe IDs
            const plan = await this.planRepository.create({
                title: createDto.title.trim(),
                stripe_product_id: stripeProduct.id,
                stripe_price_id: stripePrice.id,
                duration: createDto.duration,
                amount: createDto.amount,
                description: createDto.description,
                status: createDto.status || PlanStatus.ACTIVE,
            });

            this.logger.log(`Plan created: ${plan.id} with Stripe product ${stripeProduct.id} and price ${stripePrice.id}`);

            return {
                message: 'Plan created successfully',
                data: plan,
            };
        } catch (error) {
            this.logger.error('Error creating plan:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create plan');
        }
    }

    async findAll(queryDto: ListPlansDto) {
        try {
            const page = queryDto.page || 1;
            const limit = queryDto.limit || 10;
            const search = queryDto.search;
            const status = queryDto.status;
            const fromDate = queryDto.fromDate;
            const toDate = queryDto.toDate;

            const result = await this.planRepository.findAllWithPagination(page, limit, search, status, fromDate, toDate);

            return {
                message: 'Plans retrieved successfully',
                data: {
                    plans: result.data,
                    pagination: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        hasNext: result.hasNext,
                        hasPrev: result.hasPrev,
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error retrieving plans:', error);
            throw new InternalServerErrorException('Failed to retrieve plans');
        }
    }

    async findOne(id: string) {
        try {
            const plan = await this.planRepository.findById(id);

            if (!plan) {
                throw new NotFoundException('Plan not found');
            }

            return {
                message: 'Plan retrieved successfully',
                data: plan,
            };
        } catch (error) {
            this.logger.error(`Error retrieving plan ${id}:`, error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve plan');
        }
    }

    async update(id: string, updateDto: UpdatePlanDto) {
        try {
            const existingPlan = await this.planRepository.findById(id);
            if (!existingPlan) {
                throw new NotFoundException('Plan not found');
            }

            const stripe = this.stripeService.getStripe();
            const updateData: any = {};

            // Update Stripe Product if title or description changed
            if (updateDto.title !== undefined || updateDto.description !== undefined) {
                if (existingPlan.stripe_product_id) {
                    await stripe.products.update(existingPlan.stripe_product_id, {
                        name: updateDto.title !== undefined ? updateDto.title.trim() : existingPlan.title,
                        description: updateDto.description !== undefined ? updateDto.description : existingPlan.description || undefined,
                    });
                    this.logger.log(`Stripe product updated: ${existingPlan.stripe_product_id}`);
                }
                if (updateDto.title !== undefined) updateData.title = updateDto.title.trim();
                if (updateDto.description !== undefined) updateData.description = updateDto.description;
            }

            // Create new Stripe Price if amount or duration changed
            const amountChanged = updateDto.amount !== undefined && updateDto.amount !== existingPlan.amount;
            const durationChanged = updateDto.duration !== undefined && updateDto.duration !== existingPlan.duration;
            
            if (amountChanged || durationChanged) {
                if (!existingPlan.stripe_product_id) {
                    throw new BadRequestException('Cannot update price: Plan does not have a Stripe product ID');
                }

                // Create new price (Stripe doesn't allow updating prices, only creating new ones)
                const newDuration = (updateDto.duration as PlanDuration) || existingPlan.duration;
                const newAmount = updateDto.amount !== undefined ? updateDto.amount : existingPlan.amount;
                const stripeInterval = this.getStripeInterval(newDuration);

                const newStripePrice = await stripe.prices.create({
                    product: existingPlan.stripe_product_id,
                    unit_amount: Math.round(newAmount * 100), // Convert to cents
                    currency: 'usd',
                    recurring: {
                        interval: stripeInterval,
                    },
                });

                this.logger.log(`New Stripe price created: ${newStripePrice.id} (${stripeInterval})`);

                // Archive the old price (set active to false)
                if (existingPlan.stripe_price_id) {
                    try {
                        await stripe.prices.update(existingPlan.stripe_price_id, {
                            active: false,
                        });
                        this.logger.log(`Old Stripe price archived: ${existingPlan.stripe_price_id}`);
                    } catch (error) {
                        this.logger.warn(`Failed to archive old price ${existingPlan.stripe_price_id}:`, error);
                    }
                }

                updateData.stripe_price_id = newStripePrice.id;
                if (updateDto.amount !== undefined) updateData.amount = updateDto.amount;
                if (updateDto.duration !== undefined) updateData.duration = updateDto.duration;
            } else {
                // No price change, just update other fields
                if (updateDto.amount !== undefined) updateData.amount = updateDto.amount;
                if (updateDto.duration !== undefined) updateData.duration = updateDto.duration;
            }

            // Update status if provided
            if (updateDto.status !== undefined) updateData.status = updateDto.status;

            // Update plan in database
            const updatedPlan = await this.planRepository.update(id, updateData);

            if (!updatedPlan) {
                throw new NotFoundException('Plan not found');
            }

            this.logger.log(`Plan updated: ${id}`);

            return {
                message: 'Plan updated successfully',
                data: updatedPlan,
            };
        } catch (error) {
            this.logger.error(`Error updating plan ${id}:`, error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update plan');
        }
    }

    async toggleStatus(id: string) {
        try {
            const plan = await this.planRepository.findById(id);
            if (!plan) {
                throw new NotFoundException('Plan not found');
            }

            const newStatus = plan.status === PlanStatus.ACTIVE ? PlanStatus.INACTIVE : PlanStatus.ACTIVE;
            const updatedPlan = await this.planRepository.update(id, { status: newStatus });

            if (!updatedPlan) {
                throw new NotFoundException('Plan not found');
            }

            this.logger.log(`Plan status toggled: ${id} -> ${newStatus}`);

            return {
                message: `Plan ${newStatus === PlanStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
                data: updatedPlan,
            };
        } catch (error) {
            this.logger.error(`Error toggling plan status ${id}:`, error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to toggle plan status');
        }
    }

    async findActivePlans() {
        try {
            const plans = await this.planRepository.findActivePlans();

            return {
                message: 'Active plans retrieved successfully',
                data: plans,
            };
        } catch (error) {
            this.logger.error('Error retrieving active plans:', error);
            throw new InternalServerErrorException('Failed to retrieve active plans');
        }
    }

    /**
     * Create a Stripe PaymentIntent for purchasing a plan (vendor).
     * Returns the PaymentIntent so the client can confirm payment (e.g. with client_secret).
     */
    async createPurchasePaymentIntent(planId: string, userId: string): Promise<{
        clientSecret: string;
        paymentIntentId: string;
        amount: number;
        currency: string;
        planId: string;
    }> {
        const plan = await this.planRepository.findById(planId);
        if (!plan) {
            throw new NotFoundException('Plan not found');
        }
        if (plan.status !== PlanStatus.ACTIVE) {
            throw new BadRequestException('Plan is not active');
        }

        const activeSubscription = await this.userSubscriptionRepository.findActiveByUserId(userId);
        if (activeSubscription) {
            throw new BadRequestException('You have already an active subscription');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        let customerId = user.stripeCustomerId;
        if (!customerId) {
            customerId = await this.stripeService.ensureCustomer({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName || '',
                stripeCustomerId: user.stripeCustomerId,
            });
            await this.userRepository.update(userId, { stripeCustomerId: customerId });
        }

        const amountInCents = Math.round(plan.amount * 100);
        if (amountInCents < 50) {
            throw new BadRequestException('Plan amount is too low for payment');
        }

        const paymentIntent = await this.stripeService.createPaymentIntent(amountInCents, 'usd', {
            customerId,
            metadata: {
                planId,
                userId,
            },
        });

        this.logger.log(`PaymentIntent created for plan ${planId} by user ${userId}: ${paymentIntent.id}`);

        return {
            clientSecret: paymentIntent.client_secret!,
            paymentIntentId: paymentIntent.id,
            amount: plan.amount,
            currency: 'usd',
            planId,
        };
    }

    /**
     * Record successful plan payment: create active subscription and payment log.
     * Call this when the client confirms payment (e.g. after Stripe confirms).
     * Idempotent: if this paymentIntentId was already recorded, returns existing subscription and log.
     */
    async recordPaymentSuccess(paymentIntentId: string, userId: string): Promise<{
        subscription: any;
        paymentLog: any;
    }> {
        const existingLog = await this.paymentLogRepository.findByPaymentIntentId(paymentIntentId);
        if (existingLog) {
            this.logger.log(`Payment intent ${paymentIntentId} already recorded`);
            const logObj = existingLog.toObject ? existingLog.toObject() : existingLog;
            const subRef = (logObj as any).subscriptionId;
            const subId = subRef?._id ?? subRef;
            const subscription = subId
                ? await this.userSubscriptionRepository.findById(String(subId), { populate: [{ path: 'planId' }] })
                : null;
            return {
                subscription: subscription ? this.formatSubscription(subscription) : null,
                paymentLog: this.formatPaymentLog(existingLog),
            };
        }

        const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new BadRequestException(`Payment has not succeeded (status: ${paymentIntent.status})`);
        }

        const planId = paymentIntent.metadata?.planId;
        const metadataUserId = paymentIntent.metadata?.userId;
        if (!planId || !metadataUserId) {
            throw new BadRequestException('Invalid payment intent metadata (planId/userId missing)');
        }
        if (metadataUserId !== userId) {
            throw new BadRequestException('Payment intent does not belong to this user');
        }

        const plan = await this.planRepository.findById(planId);
        if (!plan) {
            throw new NotFoundException('Plan not found');
        }

        const expiryDate = this.computeExpiryDate(plan.duration);

        const subscription = await this.userSubscriptionRepository.create({
            planId: new Types.ObjectId(planId),
            userId: new Types.ObjectId(userId),
            amountPaid: plan.amount,
            status: UserSubscriptionStatus.PAID,
            duration: plan.duration,
            expiryDate,
        });

        const amountDollars = (paymentIntent.amount ?? 0) / 100;
        const paymentLog = await this.paymentLogRepository.create({
            userId: new Types.ObjectId(userId) as any,
            paymentType: PaymentType.SUBSCRIPTION,
            planId: new Types.ObjectId(planId) as any,
            subscriptionId: new Types.ObjectId(subscription._id.toString()) as any,
            paymentIntentId: paymentIntent.id,
            amount: amountDollars,
            currency: paymentIntent.currency ?? 'usd',
            status: PaymentStatus.SUCCEEDED,
            metadata: { planId, userId },
        });

        this.logger.log(`Plan purchase recorded: subscription ${subscription._id}, paymentIntent ${paymentIntentId}, user ${userId}`);

        return {
            subscription: this.formatSubscription(subscription),
            paymentLog: this.formatPaymentLog(paymentLog),
        };
    }

    private computeExpiryDate(duration: PlanDuration): Date {
        const date = new Date();
        if (duration === PlanDuration.MONTHLY) {
            date.setMonth(date.getMonth() + 1);
        } else {
            date.setFullYear(date.getFullYear() + 1);
        }
        return date;
    }

    private formatSubscription(sub: any): any {
        const o = sub.toObject ? sub.toObject() : sub;
        return {
            id: o._id?.toString() ?? o.id,
            planId: o.planId?._id?.toString() ?? o.planId?.toString() ?? o.planId,
            userId: o.userId?.toString?.() ?? o.userId,
            amountPaid: o.amountPaid,
            status: o.status,
            duration: o.duration,
            expiryDate: o.expiryDate ? new Date(o.expiryDate).toISOString() : null,
            createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
            updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : null,
        };
    }

    private formatPaymentLog(log: any): any {
        const o = log.toObject ? log.toObject() : log;
        return {
            id: o._id?.toString() ?? o.id,
            userId: o.userId?.toString?.() ?? o.userId,
            paymentType: o.paymentType,
            planId: o.planId?.toString?.() ?? o.planId,
            subscriptionId: o.subscriptionId?.toString?.() ?? o.subscriptionId,
            paymentIntentId: o.paymentIntentId,
            amount: o.amount,
            currency: o.currency,
            status: o.status,
            createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        };
    }
}

