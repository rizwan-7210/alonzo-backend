// src/modules/user/controllers/tutorial.controller.ts
import {
    Controller,
    Get,
    Param,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TutorialService } from '../services/tutorial.service';

@ApiTags('User - Tutorials')
@Controller('user/tutorials')
export class TutorialController {
    constructor(private readonly tutorialService: TutorialService) { }

    // @Get()
    // @ApiOperation({ summary: 'Get all tutorials with pagination and filters' })
    // @ApiResponse({ status: 200, description: 'Tutorials retrieved successfully' })
    // async getTutorials(@Query() queryDto: TutorialQueryDto) {
    //     return this.tutorialService.getAllTutorials(queryDto);
    // }

    @Get()
    @ApiOperation({ summary: 'Get filtered active tutorials' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['createdAt', 'updatedAt', 'title', 'viewCount', 'duration'] })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'] })
    @ApiQuery({ name: 'minDuration', required: false, type: Number, description: 'Minimum duration in seconds' })
    @ApiQuery({ name: 'maxDuration', required: false, type: Number, description: 'Maximum duration in seconds' })
    @ApiQuery({ name: 'minViews', required: false, type: Number, description: 'Minimum view count' })
    @ApiResponse({ status: 200, description: 'Filtered tutorials retrieved successfully' })
    async getFilteredTutorials(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
        @Query('sortBy') sortBy: string = 'createdAt',
        @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
        @Query('minDuration') minDuration?: number,
        @Query('maxDuration') maxDuration?: number,
        @Query('minViews') minViews: number = 0
    ) {
        return this.tutorialService.getFilteredTutorials({
            page,
            limit,
            search,
            sortBy,
            sortOrder,
            minDuration,
            maxDuration,
            minViews
        });
    }

    @Get('popular')
    @ApiOperation({ summary: 'Get popular tutorials' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Popular tutorials retrieved successfully' })
    async getPopularTutorials(@Query('limit') limit: number = 10) {
        return this.tutorialService.getPopularTutorials(limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get tutorial by ID' })
    @ApiResponse({ status: 200, description: 'Tutorial retrieved successfully' })
    async getTutorial(@Param('id') id: string) {
        return this.tutorialService.getTutorialById(id);
    }
}