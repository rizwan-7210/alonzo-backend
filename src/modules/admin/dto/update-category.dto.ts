import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryStatus } from 'src/common/constants/category.constants';

export class UpdateCategoryDto {
    @ApiProperty({ example: 'Pharmacy', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: CategoryStatus.ACTIVE, enum: CategoryStatus, required: false })
    @IsEnum(CategoryStatus)
    @IsOptional()
    status?: CategoryStatus;
}

