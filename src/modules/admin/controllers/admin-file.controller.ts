import { Controller, Get, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from 'src/common/constants/user.constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileRepository } from 'src/shared/repositories/file.repository';

@ApiTags('Admin - Files')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/files')
export class AdminFileController {
    constructor(private readonly fileRepository: FileRepository) { }

    @Get()
    @ApiOperation({ summary: 'Get all files with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
    async getAllFiles(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.fileRepository.paginate(page, limit, {}, { sort: { createdAt: -1 } });
    }

    // @Get('stats')
    // @ApiOperation({ summary: 'Get file statistics' })
    // @ApiResponse({ status: 200, description: 'File stats retrieved successfully' })
    // async getFileStats() {
    //     const [totalFiles, totalSize] = await Promise.all([
    //         this.fileRepository.count(),
    //         this.fileRepository.findAll().then(files =>
    //             files.reduce((acc, file) => acc + file.size, 0)
    //         ),
    //     ]);

    //     return {
    //         totalFiles,
    //         totalSize,
    //         averageSize: totalFiles > 0 ? totalSize / totalFiles : 0,
    //     };
    // }

    @Get(':id')
    @ApiOperation({ summary: 'Get file by ID' })
    @ApiResponse({ status: 200, description: 'File retrieved successfully' })
    async getFile(@Param('id') id: string) {
        return this.fileRepository.findById(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete file (admin override)' })
    @ApiResponse({ status: 200, description: 'File deleted successfully' })
    async deleteFile(@Param('id') id: string) {
        // Admin can delete any file without ownership check
        return this.fileRepository.softDelete(id);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get all files by user' })
    @ApiResponse({ status: 200, description: 'User files retrieved successfully' })
    async getUserFiles(@Param('userId') userId: string) {
        return this.fileRepository.findByUser(userId);
    }
}