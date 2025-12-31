import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GraphType {
    YEARLY = 'yearly',
    SIX_MONTHS = '6-months',
    MONTHLY = 'monthly',
}

export class GraphQueryDto {
    @ApiProperty({
        enum: GraphType,
        required: false,
        default: GraphType.YEARLY,
        description: 'Graph type: yearly (current year), 6-months (last 6 months), or monthly (current month)'
    })
    @IsOptional()
    @IsEnum(GraphType)
    type?: GraphType = GraphType.YEARLY;
}

