import { Controller, Get, Param, Query, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductQueryDto } from '../dto/product-query.dto';
import { SimilarProductsQueryDto } from '../dto/similar-products-query.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRecentlyViewedService } from 'src/modules/user/services/user-recently-viewed.service';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@ApiTags('Products')
@Public()
@Controller('products')
export class UserProductController {
    private readonly logger = new Logger(UserProductController.name);

    constructor(
        private readonly productService: ProductService,
        private readonly userRecentlyViewedService: UserRecentlyViewedService,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Extract user from JWT token if provided (for public routes with optional auth)
     * Verifies the token to ensure it's valid and not expired
     */
    private extractUserFromToken(req: Request): any | null {
        try {
            const authHeader = req.headers?.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return null;
            }

            const token = authHeader.replace('Bearer ', '');
            
            // Verify and decode the token (throws if invalid or expired)
            const payload = this.jwtService.verify(token) as any;
            
            if (!payload) {
                return null;
            }

            // Return user object in the same format as JwtStrategy.validate
            return {
                id: payload.sub,
                sub: payload.sub,
                email: payload.email,
                role: payload.role,
            };
        } catch (error) {
            // Token is invalid, expired, or malformed - silently ignore for public routes
            this.logger.debug('Token verification failed (expected for public routes):', error.message);
            return null;
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all active products (read-only)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product title' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async getProducts(@Query() queryDto: ProductQueryDto) {
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        return {
            message: 'Products retrieved successfully',
            data: await this.productService.getActiveProducts(Number(page), Number(limit), queryDto.search),
        };
    }

    @Get('similar/:productId')
    @ApiOperation({ summary: 'Get similar products from the same vendor (read-only, only active products)' })
    @ApiParam({ name: 'productId', description: 'Product ID to find similar products for. Similar products are from the same vendor (userId).' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of similar products to return', example: 10 })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort products (e.g., price:ASC, price:DESC, name:ASC, name:DESC)', example: 'price:ASC' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search products by title or description' })
    @ApiResponse({ 
        status: 200, 
        description: 'Similar products retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Similar products retrieved successfully' },
                data: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { type: 'object' }
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                limit: { type: 'number' }
                            }
                        }
                    }
                },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 404, description: 'Product not found or is not active' })
    @ApiResponse({ status: 500, description: 'Server error' })
    async getSimilarProducts(
        @Param('productId') productId: string,
        @Query() queryDto: SimilarProductsQueryDto,
    ) {
        const limit = queryDto.limit || 10;
        return {
            message: 'Similar products retrieved successfully',
            data: await this.productService.getSimilarProducts(
                productId,
                limit,
                queryDto.sortBy,
                queryDto.search,
            ),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product details by ID (read-only, only active products). Automatically tracks recently viewed if user is authenticated.' })
    @ApiParam({ name: 'id', description: 'Product ID' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found or is not active' })
    async getProductById(
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        // Get product details
        const product = await this.productService.getActiveProductById(id);

        // Extract user from token if provided (since route is public, @CurrentUser won't work)
        const user = this.extractUserFromToken(req);

        // If user is authenticated, automatically track this product as recently viewed
        if (user) {
            try {
                const userId = user.sub || user.id || user._id;
                if (userId) {
                    this.logger.log(`Tracking recently viewed product ${id} for user ${userId}`);
                    // Track recently viewed asynchronously (don't wait for it)
                    this.userRecentlyViewedService.addOrUpdateRecentlyViewed(userId, {
                        viewableType: 'Product',
                        viewableId: id,
                    }).catch((error) => {
                        // Log error but don't fail the request
                        this.logger.error(`Failed to track recently viewed product ${id} for user ${userId}:`, error);
                    });
                } else {
                    this.logger.warn(`User object found but no userId: ${JSON.stringify(user)}`);
                }
            } catch (error) {
                // Log error but don't fail the request
                this.logger.error(`Error tracking recently viewed product ${id}:`, error);
            }
        } else {
            this.logger.debug(`No user found in request for product ${id}`);
        }

        return {
            message: 'Product retrieved successfully',
            data: product,
        };
    }
}
