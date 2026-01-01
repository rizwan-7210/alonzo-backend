import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '../../../common/constants/user.constants';

export class VendorActionDto {
    @ApiProperty({
        enum: [AccountStatus.APPROVED, AccountStatus.REJECTED],
        example: AccountStatus.APPROVED,
        description: 'Account status: approved or rejected'
    })
    @IsEnum([AccountStatus.APPROVED, AccountStatus.REJECTED], {
        message: 'accountStatus must be either approved or rejected'
    })
    accountStatus: AccountStatus.APPROVED | AccountStatus.REJECTED;

    @ApiPropertyOptional({
        example: 'Missing required documents',
        description: 'Rejection reason (required if accountStatus is rejected)'
    })
    @ValidateIf((o) => o.accountStatus === AccountStatus.REJECTED)
    @IsString({ message: 'Rejection reason must be a string' })
    @IsOptional()
    rejectionReason?: string;
}

