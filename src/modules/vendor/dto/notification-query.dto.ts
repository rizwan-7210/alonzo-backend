import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { NotificationStatus } from '../../../shared/schemas/notification.schema';

const emptyToUndefined = ({ value }: { value: any }) =>
    value === '' || value === null || value === undefined ? undefined : value;

export class VendorNotificationQueryDto {
    @ApiProperty({ enum: NotificationStatus, required: false })
    @IsOptional()
    @IsEnum(NotificationStatus)
    status?: NotificationStatus;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({
        example: 10,
        required: false,
        description: 'Page size. If both limit and per_page are sent, per_page takes precedence.',
    })
    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({
        name: 'per_page',
        example: 10,
        required: false,
        description: 'Number of records per page (alias for limit). If both are sent, per_page takes precedence.',
    })
    @IsOptional()
    @Transform(emptyToUndefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    per_page?: number;
}

