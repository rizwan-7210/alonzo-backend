import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentSuccessDto {
    @ApiProperty({ description: 'Stripe PaymentIntent ID after successful payment' })
    @IsString()
    @IsNotEmpty()
    paymentIntentId: string;
}
