import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PlanRepository } from '../../../shared/repositories/plan.repository';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanQueryDto } from '../dto/plan-query.dto';
import { PlanDocument } from '../../../shared/schemas/plan.schema';
import { PlanStatus, PlanInterval } from '../../../common/constants/plan.constants';

@Injectable()
export class PlanService {
    private stripe: Stripe;
    private readonly logger = new Logger(PlanService.name);

    constructor(
        private readonly planRepository: PlanRepository,
        private readonly configService: ConfigService,
    ) {
        this.stripe = new Stripe(this.configService.get<string>('stripe.secretKey') || '', {
            apiVersion: '2025-12-15.clover' as any,
        });
    }

    async create(createPlanDto: CreatePlanDto) {
        try {
            // Ensure interval is set (default to MONTHLY)
            const interval = createPlanDto.interval || PlanInterval.MONTHLY;

            // 1. Create Product in Stripe
            const product = await this.stripe.products.create({
                name: createPlanDto.name,
                description: createPlanDto.description,
            });

            // 2. Create Recurring Price in Stripe (ALWAYS recurring for subscriptions)
            const price = await this.stripe.prices.create({
                product: product.id,
                unit_amount: Math.round(createPlanDto.amount * 100),
                currency: createPlanDto.currency || 'usd',
                recurring: {
                    interval: interval as Stripe.Price.Recurring.Interval,
                },
            });

            // 3. Verify the price is recurring (safety check)
            const retrievedPrice = await this.stripe.prices.retrieve(price.id);
            if (!retrievedPrice.recurring) {
                // If somehow a one-time price was created, delete it and throw error
                await this.stripe.prices.update(price.id, { active: false });
                throw new BadRequestException('Failed to create recurring price. Please try again.');
            }

            // 4. Save Plan to Database
            const plan = await this.planRepository.create({
                ...createPlanDto,
                interval: interval,
                stripeProductId: product.id,
                stripePriceId: price.id,
            });

            this.logger.log(`Created plan ${plan._id} with recurring price ${price.id} (${interval})`);

            return this.formatPlanResponse(plan);
        } catch (error) {
            this.logger.error(`Failed to create plan: ${error.message}`);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to create plan');
        }
    }

    async findAll(queryDto: PlanQueryDto) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                status,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                startDate,
                endDate,
                planId
            } = queryDto;

            let conditions: any = {};

            // Filter by status
            if (status) {
                conditions.status = status;
            } else {
                // Exclude deleted plans by default
                conditions.deletedAt = null;
            }

            // Search functionality
            if (search) {
                conditions.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                ];
            }

            // Filter by planId
            if (planId) {
                conditions._id = planId;
            }

            // Filter by date range
            if (startDate || endDate) {
                conditions.createdAt = {};
                if (startDate) {
                    conditions.createdAt.$gte = new Date(startDate);
                }
                if (endDate) {
                    conditions.createdAt.$lte = new Date(endDate);
                }
            }

            // Sort configuration
            const sort: any = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Get paginated results
            const result = await this.planRepository.paginate(
                page,
                limit,
                conditions,
                { sort }
            );

            // Format response
            result.data = result.data.map(plan => this.formatPlanResponse(plan));

            return result;
        } catch (error) {
            this.logger.error(`Failed to get plans: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve plans');
        }
    }

    async findOne(id: string) {
        const plan = await this.planRepository.findById(id);
        if (!plan) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }
        return this.formatPlanResponse(plan);
    }

    async update(id: string, updatePlanDto: UpdatePlanDto) {
        try {
            const plan = await this.planRepository.findById(id);
            if (!plan) {
                throw new NotFoundException(`Plan with ID ${id} not found`);
            }

            // Update Stripe Product if name or description changed
            if (updatePlanDto.name || updatePlanDto.description) {
                await this.stripe.products.update(plan.stripeProductId || '', {
                    name: updatePlanDto.name,
                    description: updatePlanDto.description,
                });
            }

            if (updatePlanDto.amount !== undefined || updatePlanDto.interval !== undefined) {
                // Ensure interval is set (use existing if not provided)
                const interval = updatePlanDto.interval || plan.interval || PlanInterval.MONTHLY;

                // Create new Recurring Price in Stripe (ALWAYS recurring for subscriptions)
                const newPrice = await this.stripe.prices.create({
                    product: plan.stripeProductId || '',
                    unit_amount: Math.round((updatePlanDto.amount ?? plan.amount) * 100),
                    currency: updatePlanDto.currency || plan.currency,
                    recurring: {
                        interval: interval as Stripe.Price.Recurring.Interval,
                    },
                });

                // Verify the price is recurring (safety check)
                const retrievedPrice = await this.stripe.prices.retrieve(newPrice.id);
                if (!retrievedPrice.recurring) {
                    // If somehow a one-time price was created, delete it and throw error
                    await this.stripe.prices.update(newPrice.id, { active: false });
                    throw new BadRequestException('Failed to create recurring price. Please try again.');
                }

                // Archive old price
                if (plan.stripePriceId) {
                    await this.stripe.prices.update(plan.stripePriceId, { active: false });
                }

                // Update plan with new price ID
                const updatedPlan = await this.planRepository.update(id, {
                    ...updatePlanDto,
                    interval: interval,
                    stripePriceId: newPrice.id,
                });

                this.logger.log(`Updated plan ${id} with new recurring price ${newPrice.id} (${interval})`);

                return this.formatPlanResponse(updatedPlan);
            }

            const updatedPlan = await this.planRepository.update(id, updatePlanDto);
            return this.formatPlanResponse(updatedPlan);
        } catch (error) {
            this.logger.error(`Failed to update plan: ${error.message}`);
            throw new InternalServerErrorException('Failed to update plan');
        }
    }

    async remove(id: string): Promise<void> {
        const plan = await this.planRepository.findById(id);
        if (!plan) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        // Archive Product in Stripe
        if (plan.stripeProductId) {
            await this.stripe.products.update(plan.stripeProductId, { active: false });
        }

        await this.planRepository.softDelete(id);
    }

    /**
     * Fix plans that have one-time prices by converting them to recurring prices
     * This is a migration/repair method
     */
    async fixPlansWithOneTimePrices(): Promise<{ fixed: number; errors: string[] }> {
        const errors: string[] = [];
        let fixed = 0;

        try {
            // Get all active plans (not deleted)
            const plans = await this.planRepository.findAllNonDeleted();

            for (const plan of plans) {
                if (!plan.stripePriceId) {
                    this.logger.warn(`Plan ${plan._id} (${plan.name}) has no Stripe price ID`);
                    continue;
                }

                try {
                    // Check the price type in Stripe
                    const stripePrice = await this.stripe.prices.retrieve(plan.stripePriceId);

                    // If it's one-time, we need to create a recurring price
                    if (!stripePrice.recurring) {
                        this.logger.log(`Fixing plan ${plan._id} (${plan.name}) - converting one-time price to recurring`);

                        // Ensure we have an interval (default to MONTHLY)
                        const interval = plan.interval || PlanInterval.MONTHLY;

                        // Create a new recurring price
                        if (!stripePrice.unit_amount) {
                            throw new Error(`Price ${plan.stripePriceId} has no unit_amount`);
                        }

                        const newRecurringPrice = await this.stripe.prices.create({
                            product: plan.stripeProductId || stripePrice.product as string,
                            unit_amount: stripePrice.unit_amount,
                            currency: stripePrice.currency,
                            recurring: {
                                interval: interval as Stripe.Price.Recurring.Interval,
                            },
                        });

                        // Verify it's recurring
                        const verifiedPrice = await this.stripe.prices.retrieve(newRecurringPrice.id);
                        if (!verifiedPrice.recurring) {
                            throw new Error(`Failed to create recurring price for plan ${plan._id}`);
                        }

                        // Archive the old one-time price
                        await this.stripe.prices.update(plan.stripePriceId, { active: false });

                        // Update the plan with the new recurring price ID
                        await this.planRepository.update(plan._id.toString(), {
                            stripePriceId: newRecurringPrice.id,
                            interval: interval,
                        });

                        fixed++;
                        this.logger.log(`Successfully fixed plan ${plan._id} (${plan.name}) - new price: ${newRecurringPrice.id}`);
                    } else {
                        // Price is already recurring, but ensure interval is set in database
                        if (!plan.interval) {
                            const interval = stripePrice.recurring.interval === 'year' ? PlanInterval.YEARLY : PlanInterval.MONTHLY;
                            await this.planRepository.update(plan._id.toString(), { interval });
                            this.logger.log(`Updated plan ${plan._id} interval to ${interval}`);
                        }
                    }
                } catch (error: any) {
                    const errorMsg = `Failed to fix plan ${plan._id} (${plan.name}): ${error.message}`;
                    this.logger.error(errorMsg);
                    errors.push(errorMsg);
                }
            }

            return { fixed, errors };
        } catch (error: any) {
            this.logger.error(`Failed to fix plans with one-time prices: ${error.message}`);
            throw new InternalServerErrorException('Failed to fix plans');
        }
    }

    private formatPlanResponse(plan: any) {
        if (!plan) return null;

        // Force conversion to plain object
        const planObj = plan.toObject
            ? plan.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(plan));

        const response: any = {};

        // Map properties explicitly
        if (planObj._id) {
            response.id = planObj._id.toString();
        }

        const properties = [
            'name',
            'amount',
            'currency',
            'status',
            'videoSessions',
            'slots',
            'stripeProductId',
            'stripePriceId',
            'interval',
            'description',
            'createdAt',
            'updatedAt'
        ];

        properties.forEach(prop => {
            if (planObj[prop] !== undefined) {
                response[prop] = planObj[prop];
            }
        });

        // Convert dates
        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }
}
