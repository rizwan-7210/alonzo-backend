import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDto } from './create-plan.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
    @ApiPropertyOptional({ example: 'Basic Plan Updated', description: 'Title of the plan' })
    title?: string;

    @ApiPropertyOptional({ example: 'monthly', description: 'Duration of the plan' })
    duration?: string;

    @ApiPropertyOptional({ example: 29.99, description: 'Amount of the plan' })
    amount?: number;

    @ApiPropertyOptional({ example: 'This is a basic plan description', description: 'Description of the plan' })
    description?: string;

    @ApiPropertyOptional({ example: 'active', description: 'Status of the plan' })
    status?: string;
}

