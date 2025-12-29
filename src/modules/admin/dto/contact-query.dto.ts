import { IsOptional, IsNumber, Min, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactStatus } from 'src/shared/schemas/contact.schema';
import { Type } from 'class-transformer';

export class ContactQueryDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        required: false,
        enum: ContactStatus
    })
    @IsOptional()
    @IsEnum(ContactStatus)
    status?: ContactStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiProperty({ required: false, enum: ['guest', 'user'] })
    @IsOptional()
    @IsString()
    userType?: string;
}
