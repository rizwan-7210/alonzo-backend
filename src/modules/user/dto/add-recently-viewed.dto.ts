import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddRecentlyViewedDto {
    @ApiProperty({ 
        example: 'Product', 
        description: 'Type of the viewable entity (e.g., "Product")',
        required: true
    })
    @IsString({ message: 'viewableType must be a string' })
    @IsNotEmpty({ message: 'viewableType is required' })
    viewableType: string;

    @ApiProperty({ 
        example: '507f1f77bcf86cd799439011', 
        description: 'ID of the viewable entity (e.g., product ID)',
        required: true
    })
    @IsMongoId({ message: 'viewableId must be a valid MongoDB ObjectId' })
    @IsNotEmpty({ message: 'viewableId is required' })
    viewableId: string;
}
