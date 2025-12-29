import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { ContactRepository } from 'src/shared/repositories/contact.repository';
import { ContactStatus } from 'src/shared/schemas/contact.schema';
import { ContactQueryDto } from 'src/modules/admin/dto/contact-query.dto';

@Injectable()
export class ContactService {
    constructor(
        private readonly contactRepository: ContactRepository,
        private readonly notificationService: NotificationService,
    ) { }

    async submitContactForm(data: {
        name: string;
        email: string;
        subject: string;
        message: string;
        userType?: string;
        userId?: string;
    }) {
        const createData: any = { ...data };
        if (data.userId) {
            createData.userId = new Types.ObjectId(data.userId);
        }
        const contact = await this.contactRepository.create(createData);

        // Notify admins about new contact form submission
        await this.notificationService.notifyContactFormSubmission({
            name: data.name,
            email: data.email,
            subject: data.subject,
            message: data.message,
        });

        return this.formatContactResponse(contact);
    }

    async getAllContacts(queryDto: ContactQueryDto) {
        const { page = 1, limit = 10, status, search, startDate, endDate, userType } = queryDto;
        const conditions: any = {};

        if (status) {
            conditions.status = status;
        }

        if (userType) {
            conditions.userType = userType;
        }

        if (search) {
            conditions.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        if (startDate || endDate) {
            conditions.createdAt = {};
            if (startDate) {
                conditions.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                conditions.createdAt.$lte = end;
            }
        }

        const result = await this.contactRepository.paginate(page, limit, conditions, { sort: { createdAt: -1 } });

        // Format response
        result.data = result.data.map(contact => this.formatContactResponse(contact));

        return result;
    }

    async getContactById(contactId: string) {
        const contact = await this.contactRepository.findById(contactId);
        return this.formatContactResponse(contact);
    }

    async updateContactStatus(contactId: string, status: ContactStatus) {
        const contact = await this.contactRepository.updateStatus(contactId, status);
        return this.formatContactResponse(contact);
    }

    async getContactStats() {
        return this.contactRepository.getContactStats();
    }

    private formatContactResponse(contact: any) {
        if (!contact) return null;

        // Force conversion to plain object
        const contactObj = contact.toObject
            ? contact.toObject({ virtuals: true, getters: true })
            : JSON.parse(JSON.stringify(contact));

        const response: any = {};

        // Map properties explicitly
        if (contactObj._id) {
            response.id = contactObj._id.toString();
        }

        const properties = [
            'name',
            'email',
            'subject',
            'message',
            'status',
            'userType',
            'userId',
            'createdAt',
            'updatedAt'
        ];

        properties.forEach(prop => {
            if (contactObj[prop] !== undefined) {
                response[prop] = contactObj[prop];
            }
        });

        // Convert userId to string if it exists
        if (response.userId && typeof response.userId === 'object') {
            response.userId = response.userId.toString();
        }

        // Convert dates
        if (response.createdAt) {
            response.createdAt = new Date(response.createdAt).toISOString();
        }
        if (response.updatedAt) {
            response.updatedAt = new Date(response.updatedAt).toISOString();
        }

        return response;
    }
}