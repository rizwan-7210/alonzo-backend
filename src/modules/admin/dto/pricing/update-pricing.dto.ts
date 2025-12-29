import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceType } from 'src/common/constants/pricing.constants';

export class UpdatePricingDto {
    @ApiProperty({ enum: ServiceType, example: ServiceType.VIDEO_CONSULTATION })
    @IsEnum(ServiceType)
    @IsNotEmpty()
    serviceType: ServiceType;

    @ApiProperty({ example: 50, description: 'Price amount' })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount: number;

    @ApiProperty({ example: 'USD', required: false })
    @IsString()
    @IsOptional()
    currency?: string;
}
