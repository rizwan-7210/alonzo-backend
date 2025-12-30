import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ChartType {
    YEARLY = 'yearly',
    MONTHLY = 'monthly',
    SIX_MONTHS = '6-months',
}

export class DashboardChartDto {
    @ApiProperty({
        enum: ChartType,
        example: ChartType.YEARLY,
        description: 'Chart data type: yearly (current year), monthly (current month), or 6-months (last 6 months)'
    })
    @IsEnum(ChartType)
    @IsNotEmpty()
    type: ChartType;
}

