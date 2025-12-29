import { IsString, IsEmail, IsNumber, IsArray, IsOptional, IsDateString, ValidateNested, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LineItemDto {
    @ApiProperty({ description: 'Description of the service or part', example: 'AC Repair Service' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Quantity', example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ description: 'Unit price', example: 50.00 })
    @IsNumber()
    @Min(0)
    unitPrice: number;
}

export class CreateNonUserInvoiceDto {
    @ApiProperty({ description: 'Customer name', example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    customerName: string;

    @ApiProperty({ description: 'Customer email address', example: 'johndoe@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiPropertyOptional({ description: 'Customer address', example: '23 Street, City' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ description: 'Line items for the invoice', type: [LineItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    lineItems: LineItemDto[];

    @ApiPropertyOptional({ description: 'Due date for the invoice', example: '2025-12-31' })
    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    metadata?: Record<string, any>;
}

