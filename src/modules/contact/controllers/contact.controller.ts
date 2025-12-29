import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from '../services/contact.service';
import { SubmitContactDto } from '../dto/submit-contact.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }

    @Public()
    @Post('submit')
    @ApiOperation({ summary: 'Submit contact form' })
    @ApiResponse({ status: 201, description: 'Contact form submitted successfully' })
    async submitContactForm(@Body() submitContactDto: SubmitContactDto) {
        return this.contactService.submitContactForm(submitContactDto);
    }
}