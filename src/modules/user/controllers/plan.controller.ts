import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlanService } from '../services/plan.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { SubscribePlanDto } from '../dto/subscribe-plan.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('User - Plans')
@ApiBearerAuth()
@Controller('user/plans')
@UseGuards(JwtAuthGuard)
export class PlanController {
    constructor(private readonly planService: PlanService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get all active plans' })
    @ApiResponse({ status: 200, description: 'Active plans retrieved successfully' })
    getActivePlans() {
        return this.planService.getActivePlans();
    }

    @Get('current-subscription')
    @ApiOperation({ summary: 'Get current subscription for the authenticated user' })
    @ApiResponse({ status: 200, description: 'Current subscription retrieved successfully' })
    @ApiResponse({ status: 404, description: 'No subscription found' })
    getCurrentSubscription(@CurrentUser() user: any) {
        return this.planService.getCurrentSubscription(user.id);
    }

    @Post('payment-intent')
    @ApiOperation({ summary: 'Create payment intent for plan subscription' })
    @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
    createPaymentIntent(@CurrentUser() user: any, @Body() createPaymentIntentDto: CreatePaymentIntentDto) {
        return this.planService.createPaymentIntent(user.id, createPaymentIntentDto.planId);
    }

    @Post('subscribe')
    @ApiOperation({ summary: 'Subscribe to a plan after payment' })
    @ApiResponse({ status: 201, description: 'Subscription created successfully' })
    subscribeToPlan(@CurrentUser() user: any, @Body() subscribePlanDto: SubscribePlanDto) {
        return this.planService.subscribeToPlan(user.id, subscribePlanDto.planId, subscribePlanDto.paymentIntentId);
    }
}
