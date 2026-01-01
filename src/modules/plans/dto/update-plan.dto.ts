import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDto } from './create-plan.dto';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
    // All properties are inherited from CreatePlanDto via PartialType
    // No need to redeclare them
}

