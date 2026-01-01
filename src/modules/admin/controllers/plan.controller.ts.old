import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Query } from '@nestjs/common';
import { PlanService } from '../services/plan.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanQueryDto } from '../dto/plan-query.dto';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Assuming you have auth guards
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { UserRole } from '../../common/constants/user.constants';

@Controller('admin/plans')
// @UseGuards(JwtAuthGuard, RolesGuard) // Uncomment when auth is ready
// @Roles(UserRole.ADMIN)
export class PlanController {
    constructor(private readonly planService: PlanService) { }

    @Post()
    create(@Body() createPlanDto: CreatePlanDto) {
        return this.planService.create(createPlanDto);
    }

    @Get()
    findAll(@Query() queryDto: PlanQueryDto) {
        return this.planService.findAll(queryDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.planService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
        return this.planService.update(id, updatePlanDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.planService.remove(id);
    }
}
