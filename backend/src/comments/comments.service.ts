import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../database/entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private commentsRepository: Repository<Comment>,
        private notificationsService: NotificationsService,
        private usersService: UsersService,
    ) { }

    async findByTask(taskId: string): Promise<Comment[]> {
        return this.commentsRepository.find({
            where: { taskId },
            order: { createdAt: 'ASC' },
            relations: ['author'],
        });
    }

    async create(taskId: string, dto: CreateCommentDto, user: any): Promise<Comment> {
        const comment = this.commentsRepository.create({
            taskId,
            userId: user.id,
            content: dto.content,
        });
        const saved = await this.commentsRepository.save(comment);

        // Parse mentions e.g. @Eray Akça
        await this.parseAndNotifyMentions(dto.content, taskId, user.id);

        // Reload with author relation
        return this.commentsRepository.findOne({
            where: { id: saved.id },
            relations: ['author'],
        }) as Promise<Comment>;
    }

    private async parseAndNotifyMentions(content: string, taskId: string, actorId: string) {
        if (!content) return;

        // Simple regex: match @ followed by word characters or spaces until next @ or newline.
        // Actually, frontend will probably format it clearly, but let's assume raw text like "@Eray Akça "
        // Let's use a simpler approach: extract everything after @ until a boundary, or we can check known names.
        // Easiest is to search for all users in the system (or group) and see if "@<name>" is in the text.

        const allUsers = await this.usersService.findAll();
        for (const u of allUsers) {
            if (content.includes(`@${u.name}`)) {
                await this.notificationsService.createNotification({
                    userId: u.id,
                    actorId: actorId,
                    type: 'mention',
                    message: `mentioned you in a comment`,
                    taskId: taskId
                });
            }
        }
    }

    async update(id: string, dto: UpdateCommentDto, user: any): Promise<Comment> {
        const comment = await this.commentsRepository.findOne({ where: { id }, relations: ['author'] });
        if (!comment) throw new NotFoundException('Comment not found');
        if (comment.userId !== user.id) throw new ForbiddenException('You can only edit your own comments');
        comment.content = dto.content;
        return this.commentsRepository.save(comment);
    }

    async remove(id: string, user: any): Promise<void> {
        const comment = await this.commentsRepository.findOne({ where: { id } });
        if (!comment) throw new NotFoundException('Comment not found');
        // Allow own comment or if user is group admin (checked pragmatically — allow userId match for now)
        if (comment.userId !== user.id) throw new ForbiddenException('You can only delete your own comments');
        await this.commentsRepository.remove(comment);
    }
}
