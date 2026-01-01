import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PlanRepository } from '../../../shared/repositories/plan.repository';
import { StripeService } from '../../../common/services/stripe.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { ListPlansDto } from '../dto/list-plans.dto';
import { PlanStatus, PlanDuration } from '../../../common/constants/plan.constants';
import Stripe from 'stripe';

@Injectable()
export class PlansService {
    private readonly logger = new Logger(PlansService.name);

    constructor(
        private readonly planRepository: PlanRepository,
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
}

