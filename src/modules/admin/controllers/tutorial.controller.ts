// src/modules/admin/controllers/tutorial.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseInterceptors,
    UploadedFiles,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Req,
    UploadedFile,
    BadRequestException
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
// import { Roles } from '../../../../common/decorators/roles.decorator';
// import { UserRole } from '../../../../common/constants/user.constants';
import { TutorialService } from '../services/tutorial.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/constants/user.constants';
import { CreateTutorialDto } from '../dto/tutorial/create-tutorial.dto';
import { TutorialQueryDto } from '../dto/tutorial/tutorial-query.dto';
import { UpdateTutorialDto } from '../dto/tutorial/update-tutorial.dto';
import { Status } from 'src/common/constants/tutorial.constants';
import { multerConfig } from 'src/config/multer.config';
// import { CreateTutorialDto } from '../dto/create-tutorial.dto';
// import { UpdateTutorialDto } from '../dto/update-tutorial.dto';
// import { TutorialQueryDto } from '../dto/tutorial-query.dto';
// import { Status } from '../../../../common/constants/tutorial.constants';

@ApiTags('Admin - Tutorials')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/tutorials')
export class TutorialController {
    constructor(private readonly tutorialService: TutorialService) { }

    @Post()
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ], multerConfig)) // Apply multerConfig to both fields
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new tutorial' })
    @ApiResponse({ status: 201, description: 'Tutorial created successfully' })
    @ApiBody({ type: CreateTutorialDto })
    async createTutorial(
        @Body() createTutorialDto: CreateTutorialDto,
        @UploadedFiles() files: {
            video?: Express.Multer.File[],
            thumbnail?: Express.Multer.File[]
        },
        @Req() req?: any
    ) {
        const userId = req.user.id;

        // Extract files from array structure
        const video = files?.video?.[0];
        const thumbnail = files?.thumbnail?.[0];

        // Optional: Add validation here
        if (video) {
            // Validate video
            if (!video.mimetype.startsWith('video/')) {
                throw new BadRequestException('Video file must be a video');
            }
            if (video.size > 100 * 1024 * 1024) { // 100MB for video
                throw new BadRequestException('Video file too large (max 100MB)');
            }
        }

        if (thumbnail) {
            // Validate thumbnail
            const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedImageTypes.includes(thumbnail.mimetype)) {
                throw new BadRequestException('Thumbnail must be an image (jpg, png, webp, gif)');
            }
            if (thumbnail.size > 5 * 1024 * 1024) { // 5MB for thumbnail
                throw new BadRequestException('Thumbnail too large (max 5MB)');
            }
        }

        return this.tutorialService.createTutorial(createTutorialDto, userId, video, thumbnail);
    }

    @Get()
    @ApiOperation({ summary: 'Get all tutorials with pagination and filters' })
    @ApiResponse({ status: 200, description: 'Tutorials retrieved successfully' })
    async getTutorials(@Query() queryDto: TutorialQueryDto) {
        return this.tutorialService.getAllTutorials(queryDto);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get tutorial statistics' })
    @ApiResponse({ status: 200, description: 'Tutorial stats retrieved successfully' })
    async getTutorialStats() {
        return this.tutorialService.getTutorialStats();
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

    @Put(':id')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ], multerConfig))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update tutorial' })
    @ApiResponse({ status: 200, description: 'Tutorial updated successfully' })
    @ApiBody({ type: UpdateTutorialDto })
    async updateTutorial(
        @Param('id') id: string,
        @Body() updateTutorialDto: UpdateTutorialDto,
        @UploadedFiles() files: {
            video?: Express.Multer.File[],
            thumbnail?: Express.Multer.File[]
        },
        @Req() req?: any
    ) {
        // Extract files from array structure
        const video = files?.video?.[0];
        const thumbnail = files?.thumbnail?.[0];
        const userId = req.user.id;
        if (video) {
            // Validate video
            if (!video.mimetype.startsWith('video/')) {
                throw new BadRequestException('Video file must be a video');
            }
            if (video.size > 100 * 1024 * 1024) { // 100MB for video
                throw new BadRequestException('Video file too large (max 100MB)');
            }
        }

        if (thumbnail) {
            // Validate thumbnail
            const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedImageTypes.includes(thumbnail.mimetype)) {
                throw new BadRequestException('Thumbnail must be an image (jpg, png, webp, gif)');
            }
            if (thumbnail.size > 5 * 1024 * 1024) { // 5MB for thumbnail
                throw new BadRequestException('Thumbnail too large (max 5MB)');
            }
        }
        return this.tutorialService.updateTutorial(id, updateTutorialDto, userId, video, thumbnail);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete tutorial (soft delete)' })
    @ApiResponse({ status: 200, description: 'Tutorial deleted successfully' })
    async deleteTutorial(@Param('id') id: string) {
        return this.tutorialService.deleteTutorial(id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Change tutorial status' })
    @ApiResponse({ status: 200, description: 'Tutorial status updated successfully' })
    async changeTutorialStatus(
        @Param('id') id: string,
        @Body('status') status: Status
    ) {
        return this.tutorialService.changeTutorialStatus(id, status);
    }
}