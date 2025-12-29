import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Contact, ContactDocument, ContactStatus } from '../schemas/contact.schema';

@Injectable()
export class ContactRepository extends BaseRepository<ContactDocument> {
    constructor(
        @InjectModel(Contact.name) protected readonly contactModel: Model<ContactDocument>,
    ) {
        super(contactModel);
    }

    async findByStatus(status: ContactStatus): Promise<ContactDocument[]> {
        return this.contactModel
            .find({ status })
            .sort({ createdAt: -1 })
            .exec();
    }

    async findByEmail(email: string): Promise<ContactDocument[]> {
        return this.contactModel
            .find({ email: email.toLowerCase() })
            .sort({ createdAt: -1 })
            .exec();
    }

    async updateStatus(contactId: string, status: ContactStatus): Promise<ContactDocument | null> {
        const updateData: any = { status };

        return this.contactModel
            .findByIdAndUpdate(contactId, updateData, { new: true })
            .exec();
    }

    async getContactStats(): Promise<{
        total: number;
        pending: number;
        resolved: number;
    }> {
        const [total, pending, resolved] = await Promise.all([
            this.contactModel.countDocuments().exec(),
            this.contactModel.countDocuments({ status: ContactStatus.PENDING }).exec(),
            this.contactModel.countDocuments({ status: ContactStatus.RESOLVED }).exec(),
        ]);

        return {
            total,
            pending,
            resolved,
        };
    }
}