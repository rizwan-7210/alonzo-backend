import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PlanInterval, PlanStatus } from '../../../common/constants/plan.constants';

export class CreatePlanDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsEnum(PlanStatus)
    @IsOptional()
    status?: PlanStatus;

    @IsNumber()
    @Min(0)
    videoSessions: number;

    @IsNumber()
    @Min(0)
    slots: number;

    @IsEnum(PlanInterval)
    @IsOptional()
    interval?: PlanInterval;

    @IsString()
    @IsOptional()
    description?: string;
}
