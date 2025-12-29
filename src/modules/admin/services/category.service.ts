import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CategoryRepository } from 'src/shared/repositories/category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryStatus } from 'src/common/constants/category.constants';

@Injectable()
export class CategoryService {
    constructor(private readonly categoryRepository: CategoryRepository) { }

    async createCategory(createCategoryDto: CreateCategoryDto) {
        const { title, status } = createCategoryDto;

        // Check if category with same title already exists (case-insensitive)
        const existingCategory = await this.categoryRepository.findByTitle(title);
        if (existingCategory) {
            throw new ConflictException('Category with this title already exists');
        }

        // Create category
        const category = await this.categoryRepository.create({
            title: title.trim(),
            status: status || CategoryStatus.ACTIVE,
        });

        return this.formatCategoryResponse(category);
    }

    async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
        const { title, status } = updateCategoryDto;

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
        if (status !== undefined) {
            updateData.status = status;
        }

        const updatedCategory = await this.categoryRepository.update(id, updateData);
        if (!updatedCategory) {
            throw new NotFoundException('Category not found');
        }

        return this.formatCategoryResponse(updatedCategory);
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
        const category = await this.categoryRepository.findById(id);
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

        return this.formatCategoryResponse(updatedCategory);
    }

    // Public methods for vendor/user (read-only)
    async getActiveCategories() {
        const categories = await this.categoryRepository.findActiveCategories();
        // Sort by title ascending (alphabetical)
        const sortedCategories = categories.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            return titleA.localeCompare(titleB);
        });

        return sortedCategories.map(category => this.formatCategoryResponse(category));
    }

    async getCategoryDetails(id: string) {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return this.formatCategoryResponse(category);
    }

    private formatCategoryResponse(category: any) {
        const categoryObj = category.toObject ? category.toObject() : category;
        return {
            id: categoryObj._id ? categoryObj._id.toString() : categoryObj.id,
            title: categoryObj.title,
            status: categoryObj.status,
            createdAt: categoryObj.createdAt ? new Date(categoryObj.createdAt).toISOString() : null,
            updatedAt: categoryObj.updatedAt ? new Date(categoryObj.updatedAt).toISOString() : null,
        };
    }
}

