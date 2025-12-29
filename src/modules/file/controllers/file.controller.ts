import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
// import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { FileService } from '../services/file.service';
// import { FileCategory } from '../../../../common/constants/file.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileCategory } from 'src/common/constants/file.constants';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                category: {
                    type: 'string',
                    enum: Object.values(FileCategory),
                },
                description: { type: 'string' },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a file' })
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('category') category: FileCategory,
        @Body('description') description: string,
        @CurrentUser() user: any,
    ) {
        // For now, we'll associate the file with the user (as the fileable entity)
        return this.fileService.uploadFile(
            file,
            user.id,
            'User',
            category,
            description,
            user.id,
        );
    }

    @Post('avatar')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Upload user avatar' })
    @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
    async uploadAvatar(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: any,
    ) {
        return this.fileService.uploadAvatar(user.id, file);
    }

    @Get()
    @ApiOperation({ summary: 'Get user files' })
    @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
    async getUserFiles(@CurrentUser() user: any) {
        return this.fileService.getUserFiles(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get file by ID' })
    @ApiResponse({ status: 200, description: 'File retrieved successfully' })
    async getFile(@Param('id') id: string) {
        return this.fileService.getFile(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete file' })
    @ApiResponse({ status: 200, description: 'File deleted successfully' })
    async deleteFile(@Param('id') id: string, @CurrentUser() user: any) {
        return this.fileService.deleteFile(id, user.id);
    }
}