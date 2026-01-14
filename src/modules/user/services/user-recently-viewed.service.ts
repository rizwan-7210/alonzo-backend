import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { RecentlyViewedRepository } from '../../../shared/repositories/recently-viewed.repository';
import { ProductRepository } from '../../../shared/repositories/product.repository';
import { ProductService } from '../../product/services/product.service';
import { AddRecentlyViewedDto } from '../dto/add-recently-viewed.dto';
import { ListRecentlyViewedDto } from '../dto/list-recently-viewed.dto';
import { ProductStatus } from '../../../common/constants/product.constants';

@Injectable()
export class UserRecentlyViewedService {
    private readonly logger = new Logger(UserRecentlyViewedService.name);

    constructor(
        private readonly recentlyViewedRepository: RecentlyViewedRepository,
        private readonly productRepository: ProductRepository,
        private readonly productService: ProductService,
    ) { }

    async addOrUpdateRecentlyViewed(userId: string, addDto: AddRecentlyViewedDto) {
        try {
            const { viewableType, viewableId } = addDto;

            // Validate viewableType
            if (viewableType !== 'Product') {
                throw new BadRequestException(`Unsupported viewableType: ${viewableType}. Only "Product" is supported.`);
            }

            // Verify the product exists and is active
            const product = await this.productRepository.findById(viewableId);
            if (!product) {
                throw new NotFoundException('Product not found');
            }

            if (product.status !== ProductStatus.ACTIVE) {
                throw new NotFoundException('Product not found or is not active');
            }

            // Find or create recently viewed entry
            // If exists, updates updatedAt; else creates new entry
            const recentlyViewed = await this.recentlyViewedRepository.findOrCreate(
                userId,
                viewableType,
                viewableId,
            );

            this.logger.log(`Recently viewed ${viewableType} ${viewableId} for user ${userId}`);

            // Format response
            const recentlyViewedObj = recentlyViewed.toObject ? recentlyViewed.toObject({ virtuals: true }) : recentlyViewed;
            return {
                id: recentlyViewedObj._id ? recentlyViewedObj._id.toString() : recentlyViewedObj.id,
                userId: recentlyViewedObj.userId ? (typeof recentlyViewedObj.userId === 'object' ? recentlyViewedObj.userId.toString() : recentlyViewedObj.userId) : null,
                viewableType: recentlyViewedObj.viewableType,
                viewableId: recentlyViewedObj.viewableId ? (typeof recentlyViewedObj.viewableId === 'object' ? recentlyViewedObj.viewableId.toString() : recentlyViewedObj.viewableId) : null,
                createdAt: recentlyViewedObj.createdAt ? new Date(recentlyViewedObj.createdAt).toISOString() : null,
                updatedAt: recentlyViewedObj.updatedAt ? new Date(recentlyViewedObj.updatedAt).toISOString() : null,
            };
        } catch (error) {
            this.logger.error(`Error adding/updating recently viewed for user ${userId}:`, error);
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to add/update recently viewed');
        }
    }

    async getRecentlyViewed(userId: string, queryDto: ListRecentlyViewedDto) {
        try {
            const page = queryDto.page || 1;
            const limit = queryDto.limit || 10;

            // Get paginated recently viewed entries
            const result = await this.recentlyViewedRepository.findByUserIdWithPagination(
                userId,
                page,
                limit,
            );

            // Format response with product details
            const formattedData = await Promise.all(
                result.data.map(async (recentlyViewed: any) => {
                    const recentlyViewedObj = recentlyViewed.toObject ? recentlyViewed.toObject({ virtuals: true }) : recentlyViewed;

                    // Get product details if viewableType is Product
                    let product = null;
                    if (recentlyViewedObj.viewableType === 'Product' && recentlyViewedObj.viewableId) {
                        try {
                            // Get product with files (even if inactive, we still show it in recently viewed)
                            const productWithFiles = await this.productRepository.findByIdWithFiles(recentlyViewedObj.viewableId.toString());
                            if (productWithFiles) {
                                // Format product using ProductService's formatProductResponse method
                                // Access private method via type assertion
                                product = (this.productService as any).formatProductResponse(productWithFiles);
                            }
                        } catch (error) {
                            // If product not found, set product to null
                            this.logger.warn(`Product ${recentlyViewedObj.viewableId} not found for recently viewed`);
                            product = null;
                        }
                    }

                    return {
                        id: recentlyViewedObj._id ? recentlyViewedObj._id.toString() : recentlyViewedObj.id,
                        userId: recentlyViewedObj.userId ? (typeof recentlyViewedObj.userId === 'object' ? recentlyViewedObj.userId.toString() : recentlyViewedObj.userId) : null,
                        viewableType: recentlyViewedObj.viewableType,
                        viewableId: recentlyViewedObj.viewableId ? (typeof recentlyViewedObj.viewableId === 'object' ? recentlyViewedObj.viewableId.toString() : recentlyViewedObj.viewableId) : null,
                        product, // Full product details
                        createdAt: recentlyViewedObj.createdAt ? new Date(recentlyViewedObj.createdAt).toISOString() : null,
                        updatedAt: recentlyViewedObj.updatedAt ? new Date(recentlyViewedObj.updatedAt).toISOString() : null,
                    };
                })
            );

            return {
                data: formattedData,
                meta: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                    hasNext: result.hasNext,
                    hasPrev: result.hasPrev,
                },
            };
        } catch (error) {
            this.logger.error(`Error getting recently viewed for user ${userId}:`, error);
            throw new InternalServerErrorException('Failed to get recently viewed');
        }
    }
}
