import { IsNotEmpty, IsString } from 'class-validator';

export class SubscribePlanDto {
    @IsString()
    @IsNotEmpty()
    planId: string;

    @IsString()
    @IsNotEmpty()
    paymentIntentId: string;
}
