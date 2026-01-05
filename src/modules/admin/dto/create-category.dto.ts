import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryStatus } from 'src/common/constants/category.constants';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Pharmacy' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'This is a pharmacy category description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: CategoryStatus.ACTIVE, enum: CategoryStatus, default: CategoryStatus.ACTIVE, required: false })
    @IsEnum(CategoryStatus)
    @IsOptional()
    status?: CategoryStatus;
}

