import { Controller, Post, Param, UseInterceptors, UploadedFile, UseGuards, Req, Delete, Get, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { v4 as uuidv4 } from 'uuid';
import { TasksService } from '../tasks/tasks.service';

@Controller('tasks/:taskId/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
    constructor(
        private attachmentsService: AttachmentsService,
        private tasksService: TasksService,
    ) { }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        })
    }))
    async uploadFile(
        @Param('taskId') taskId: string,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: any
    ) {
        await this.tasksService.findOne(taskId, req.user); // verify access to task
        return this.attachmentsService.createAttachment(taskId, req.user.id, file);
    }

    @Get()
    async getAttachments(@Param('taskId') taskId: string, @Req() req: any) {
        await this.tasksService.findOne(taskId, req.user);
        return this.attachmentsService.findByTaskId(taskId);
    }

    @Delete(':id')
    async deleteAttachment(@Param('taskId') taskId: string, @Param('id') id: string, @Req() req: any) {
        const attachment = await this.attachmentsService.findOne(id);
        if (attachment.taskId !== taskId) {
            throw new ForbiddenException('Mismatched task');
        }
        await this.tasksService.findOne(taskId, req.user); // verify access to task
        return this.attachmentsService.deleteAttachment(id, req.user);
    }
}
