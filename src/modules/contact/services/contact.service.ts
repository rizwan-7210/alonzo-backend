import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactRepository } from '../../../shared/repositories/contact.repository';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ListContactDto } from '../dto/list-contact.dto';
import { UserType } from '../../../common/constants/contact.constants';
import { UserRole } from '../../../common/constants/user.constants';

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(
        private readonly contactRepository: ContactRepository,
    ) { }

    async create(createDto: CreateContactDto, authenticatedUserId?: string, authenticatedUserRole?: UserRole) {
        try {
            // Validate userType rules
            if (createDto.userType === UserType.USER && authenticatedUserRole !== UserRole.USER) {
                throw new BadRequestException('userType must be "user" for authenticated users');
            }

            if (createDto.userType === UserType.VENDOR && authenticatedUserRole !== UserRole.VENDOR) {
                throw new BadRequestException('userType must be "vendor" for authenticated vendors');
            }

            // If userType is guest, userId must be null
            if (createDto.userType === UserType.GUEST && createDto.userId) {
                throw new BadRequestException('userId must be null for guest submissions');
            }

            // If userType is user or vendor, use authenticated user ID if available
            let userId: Types.ObjectId | undefined = undefined;
            if (createDto.userType === UserType.USER || createDto.userType === UserType.VENDOR) {
                if (authenticatedUserId) {
                    userId = new Types.ObjectId(authenticatedUserId);
                } else if (createDto.userId) {
                    userId = new Types.ObjectId(createDto.userId);
                }
            }

            const contact = await this.contactRepository.create({
                userId,
                userType: createDto.userType,
                name: createDto.name.trim(),
                email: createDto.email.trim().toLowerCase(),
                subject: createDto.subject.trim(),
                message: createDto.message.trim(),
            });

            this.logger.log(`Contact message created: ${contact.id} (userType: ${createDto.userType})`);

            return {
                message: 'Contact message submitted successfully',
                data: this.formatContactResponse(contact),
            };
        } catch (error) {
            this.logger.error('Error creating contact message:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Failed to submit contact message');
        }
    }

    async findAll(queryDto: ListContactDto) {
        try {
            const page = queryDto.page || 1;
            const limit = queryDto.limit || 10;

            const result = await this.contactRepository.findAllWithPagination(page, limit);

            return {
                message: 'Contact messages retrieved successfully',
                data: {
                    contacts: result.data.map(contact => this.formatContactResponse(contact)),
                    pagination: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit,
                        totalPages: result.totalPages,
                        hasNext: result.hasNext,
                        hasPrev: result.hasPrev,
                    },
                },
            };
        } catch (error) {
            this.logger.error('Error retrieving contact messages:', error);
            throw new BadRequestException('Failed to retrieve contact messages');
        }
    }

    async findOne(id: string) {
        try {
            const contact = await this.contactRepository.findById(id);

            if (!contact) {
                throw new NotFoundException('Contact message not found');
            }

            return {
                message: 'Contact message retrieved successfully',
                data: this.formatContactResponse(contact),
            };
        } catch (error) {
            this.logger.error(`Error retrieving contact message ${id}:`, error);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new NotFoundException('Contact message not found');
        }
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
            'userId',
            'userType',
            'name',
            'email',
            'subject',
            'message',
            'status',
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
