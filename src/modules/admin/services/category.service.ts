import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CategoryRepository } from 'src/shared/repositories/category.repository';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { FileService } from 'src/modules/file/services/file.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryStatus } from 'src/common/constants/category.constants';
import { FileCategory } from 'src/common/constants/file.constants';

@Injectable()
export class CategoryService {
    constructor(
        private readonly categoryRepository: CategoryRepository,
        private readonly fileRepository: FileRepository,
        private readonly fileService: FileService,
    ) { }

    async createCategory(createCategoryDto: CreateCategoryDto, file?: Express.Multer.File, uploadedBy?: string) {
        const { title, description, status } = createCategoryDto;

        // Check if category with same title already exists (case-insensitive)
        const existingCategory = await this.categoryRepository.findByTitle(title);
        if (existingCategory) {
            throw new ConflictException('Category with this title already exists');
        }

        // Create category
        const category = await this.categoryRepository.create({
            title: title.trim(),
            description: description?.trim(),
            status: status || CategoryStatus.ACTIVE,
        });

        // Handle file upload if provided
        if (file) {
            // Remove any existing file for this category (shouldn't exist, but just in case)
            await this.removeCategoryFile(category._id.toString());

            // Upload new file
            await this.fileService.uploadFile(
                file,
                category._id.toString(),
                'Category',
                FileCategory.ATTACHMENT,
                'Category file',
                uploadedBy,
            );
        }

        // Load category with file relation
        const categoryWithFile = await this.categoryRepository.findByIdWithFile(category._id.toString());
        return this.formatCategoryResponse(categoryWithFile || category);
    }

    async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto, file?: Express.Multer.File, uploadedBy?: string) {
        const { title, description, status } = updateCategoryDto;

        // Check if category exists
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        // Check if title is being updated and if it conflicts with existing category
        if (title && title.trim() !== category.title) {
            const existingCategory = await this.categoryRepository.findByTitle(title);
            if (existingCategory && existingCategory._id.toString() !== id) {
                throw new ConflictException('Category with this title already exists');
            }
        }

        // Update category
        const updateData: any = {};
        if (title !== undefined) {
            updateData.title = title.trim();
        }
        if (description !== undefined) {
            updateData.description = description?.trim();
        }
        if (status !== undefined) {
            updateData.status = status;
        }

        const updatedCategory = await this.categoryRepository.update(id, updateData);
        if (!updatedCategory) {
            throw new NotFoundException('Category not found');
        }

        // Handle file upload if provided
        if (file) {
            // Remove existing file for this category
            await this.removeCategoryFile(id);

            // Upload new file
            await this.fileService.uploadFile(
                file,
                id,
                'Category',
                FileCategory.ATTACHMENT,
                'Category file',
                uploadedBy,
            );
        }

        // Load category with file relation
        const categoryWithFile = await this.categoryRepository.findByIdWithFile(id);
        return this.formatCategoryResponse(categoryWithFile || updatedCategory);
    }

    async deleteCategory(id: string) {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        await this.categoryRepository.delete(id);
        return {
            message: 'Category deleted successfully',
        };
    }

    async getCategoryById(id: string) {
        const category = await this.categoryRepository.findByIdWithFile(id);
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return this.formatCategoryResponse(category);
    }

    async getAllCategories(page: number = 1, limit: number = 10, status?: CategoryStatus) {
        const conditions: any = {};
        if (status) {
            conditions.status = status;
        }

        const result = await this.categoryRepository.paginate(page, limit, conditions, {
            sort: { createdAt: -1 },
            populate: [{
                path: 'file',
                select: 'name originalName path mimeType size type category subType description createdAt updatedAt',
            }],
        });

        return {
            data: result.data.map(category => this.formatCategoryResponse(category)),
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
            },
        };
    }

    async toggleCategoryStatus(id: string) {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        // Toggle status
        const newStatus = category.status === CategoryStatus.ACTIVE
            ? CategoryStatus.INACTIVE
            : CategoryStatus.ACTIVE;

        const updatedCategory = await this.categoryRepository.update(id, { status: newStatus });
        if (!updatedCategory) {
            throw new NotFoundException('Category not found');
        }

        // Load category with file relation
        const categoryWithFile = await this.categoryRepository.findByIdWithFile(id);
        return this.formatCategoryResponse(categoryWithFile || updatedCategory);
    }

    // Public methods for vendor/user (read-only)
    async getActiveCategories() {
        const categories = await this.categoryRepository.findAllWithFile(
            { status: CategoryStatus.ACTIVE },
            { createdAt: -1 }
        );
        // Sort by title ascending (alphabetical)
        const sortedCategories = categories.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            return titleA.localeCompare(titleB);
        });

        return sortedCategories.map(category => this.formatCategoryResponse(category));
    }

    async getCategoryDetails(id: string) {
        const category = await this.categoryRepository.findByIdWithFile(id);
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return this.formatCategoryResponse(category);
    }

    private async removeCategoryFile(categoryId: string): Promise<void> {
        // Find existing files for this category
        const existingFiles = await this.fileRepository.findByEntity(categoryId, 'Category');
        
        // Soft delete all existing files (only one should exist, but handle multiple just in case)
        for (const file of existingFiles) {
            await this.fileRepository.softDelete(file._id.toString());
        }
    }

    private formatCategoryResponse(category: any) {
        const categoryObj = category.toObject ? category.toObject({ virtuals: true }) : category;
        
        // Format file if exists
        let fileObject: any = null;
        if (categoryObj.file) {
            const fileObj = categoryObj.file.toObject ? categoryObj.file.toObject() : categoryObj.file;
            
            // Build complete URL for the file
            let fileUrl: string | null = null;
            if (fileObj.path) {
                const baseUrl = process.env.APP_URL || 'http://localhost:3000';
                const cleanBaseUrl = baseUrl.replace(/\/$/, '');
                
                if (fileObj.path.startsWith('/uploads/')) {
                    fileUrl = `${cleanBaseUrl}${fileObj.path}`;
                } else if (fileObj.path.startsWith('http')) {
                    fileUrl = fileObj.path;
                } else {
                    fileUrl = `${cleanBaseUrl}/uploads/${fileObj.path}`;
                }
            }
            
            const finalUrl = fileUrl || fileObj.url;
            
            fileObject = {
                id: fileObj._id ? fileObj._id.toString() : fileObj.id,
                name: fileObj.name,
                originalName: fileObj.originalName,
                path: fileObj.path,
                path_link: finalUrl,
                mimeType: fileObj.mimeType,
                size: fileObj.size,
                type: fileObj.type,
                category: fileObj.category,
                subType: fileObj.subType,
                description: fileObj.description,
                createdAt: fileObj.createdAt ? new Date(fileObj.createdAt).toISOString() : null,
                updatedAt: fileObj.updatedAt ? new Date(fileObj.updatedAt).toISOString() : null,
            };
        }
        
        return {
            id: categoryObj._id ? categoryObj._id.toString() : categoryObj.id,
            title: categoryObj.title,
            description: categoryObj.description || null,
            status: categoryObj.status,
            file: fileObject,
            createdAt: categoryObj.createdAt ? new Date(categoryObj.createdAt).toISOString() : null,
            updatedAt: categoryObj.updatedAt ? new Date(categoryObj.updatedAt).toISOString() : null,
        };
    }
}

