import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAttachment } from '../database/entities/task-attachment.entity';
import * as fs from 'fs';
import * as path from 'path';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class AttachmentsService {
    constructor(
        @InjectRepository(TaskAttachment)
        private attachmentRepository: Repository<TaskAttachment>,
        @Inject(forwardRef(() => TasksService))
        private tasksService: TasksService,
    ) { }

    async createAttachment(taskId: string, userId: string, file: Express.Multer.File): Promise<TaskAttachment> {
        const attachment = this.attachmentRepository.create({
            taskId,
            userId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: `/uploads/${file.filename}`,
        });
        return this.attachmentRepository.save(attachment);
    }

    async findByTaskId(taskId: string): Promise<TaskAttachment[]> {
        return this.attachmentRepository.find({
            where: { taskId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<TaskAttachment> {
        const attach = await this.attachmentRepository.findOne({ where: { id }, relations: ['user'] });
        if (!attach) throw new NotFoundException('Attachment not found');
        return attach;
    }

    async deleteAttachment(id: string, user: any): Promise<void> {
        const attachment = await this.findOne(id);

        if (attachment.userId !== user.id) {
            throw new ForbiddenException('You can only delete your own attachments');
        }

        await this.attachmentRepository.remove(attachment);

        const filePath = path.join(process.cwd(), 'uploads', attachment.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
