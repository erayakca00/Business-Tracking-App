import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Delete,
  Get,
  ForbiddenException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { v4 as uuidv4 } from 'uuid';
import { TasksService } from '../tasks/tasks.service';
import { Throttle } from '@nestjs/throttler';

@Controller('tasks/:taskId/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private tasksService: TasksService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFile(
    @Param('taskId') taskId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /image\/(jpeg|png|gif|webp)|application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.*|text\/plain|application\/zip|application\/x-zip-compressed|application\/x-tar|application\/x-rar-compressed/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
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
  async deleteAttachment(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const attachment = await this.attachmentsService.findOne(id);
    if (attachment.taskId !== taskId) {
      throw new ForbiddenException('Mismatched task');
    }
    await this.tasksService.findOne(taskId, req.user); // verify access to task
    return this.attachmentsService.deleteAttachment(id, req.user);
  }
}
