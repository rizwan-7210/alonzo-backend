import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus, PlanDuration } from '../../../common/constants/plan.constants';

export class CreatePlanDto {
    @ApiProperty({ example: 'Basic Plan', description: 'Title of the plan' })
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
    title: string;

    @ApiProperty({ enum: PlanDuration, example: PlanDuration.MONTHLY, description: 'Duration of the plan' })
    @IsEnum(PlanDuration, { message: 'Duration must be either monthly or yearly' })
    @IsNotEmpty({ message: 'Duration is required' })
    duration: PlanDuration;

    @ApiProperty({ example: 29.99, description: 'Amount of the plan' })
    @IsNumber({}, { message: 'Amount must be a number' })
    @IsNotEmpty({ message: 'Amount is required' })
    @Min(0, { message: 'Amount must be greater than or equal to 0' })
    amount: number;

    @ApiPropertyOptional({ example: 'This is a basic plan description', description: 'Description of the plan' })
    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description?: string;

    @ApiPropertyOptional({ enum: PlanStatus, default: PlanStatus.ACTIVE, description: 'Status of the plan' })
    @IsOptional()
    @IsEnum(PlanStatus, { message: 'Status must be either active or inactive' })
    status?: PlanStatus;
}

