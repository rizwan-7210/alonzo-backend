import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ContactService } from '../services/contact.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../common/constants/user.constants';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserType } from '../../../common/constants/contact.constants';

@ApiTags('Vendor - Contact')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/contacts')
export class VendorContactController {
    constructor(
        private readonly contactService: ContactService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Submit contact form (Vendor)' })
    @ApiBody({ type: CreateContactDto })
    @ApiResponse({
        status: 201,
        description: 'Contact message submitted successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Contact message submitted successfully' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        userId: { type: 'string', nullable: true },
                        userType: { type: 'string', example: 'vendor' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        subject: { type: 'string' },
                        message: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'resolved'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                timestamp: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Validation error or userType mismatch' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async create(
        @Body() createDto: CreateContactDto,
        @CurrentUser() user: any,
    ) {
        // Enforce userType = "vendor" for vendor submissions
        createDto.userType = UserType.VENDOR;
        
        return this.contactService.create(
            createDto,
            user?.id || user?._id?.toString(),
            UserRole.VENDOR,
        );
    }
}

