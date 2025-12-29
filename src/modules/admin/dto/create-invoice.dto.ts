import { IsNotEmpty, IsArray, ValidateNested, IsOptional, IsString, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
    @ApiProperty({ example: 'AC Repair Service', description: 'Description of the service or part' })
    @IsNotEmpty()
    @IsString()
    description: string;

    @ApiProperty({ example: 1, description: 'Quantity' })
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ example: 50.00, description: 'Unit price in dollars' })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    unitPrice: number;
}

export class CreateInvoiceDto {
    @ApiProperty({ type: [InvoiceLineItemDto], description: 'Line items for the invoice' })
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceLineItemDto)
    lineItems: InvoiceLineItemDto[];

    @ApiPropertyOptional({ example: '2025-12-31', description: 'Due date for the invoice (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;
}

