import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
    ) { }

    async getUserNotifications(userId: string): Promise<Notification[]> {
        return this.notificationsRepository.find({
            where: { userId },
            relations: ['actor'],
            order: { createdAt: 'DESC' },
            take: 50, // Limit to recent 50
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationsRepository.count({
            where: { userId, isRead: false },
        });
    }

    async markAsRead(id: string, userId: string): Promise<Notification> {
        const notification = await this.notificationsRepository.findOne({ where: { id, userId } });
        if (!notification) {
            throw new NotFoundException('Notification not found');
        }
        notification.isRead = true;
        return this.notificationsRepository.save(notification);
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationsRepository.update({ userId, isRead: false }, { isRead: true });
    }

    // Called internally by other services (like TasksService or CommentsService)
    async createNotification(data: {
        userId: string;
        actorId: string;
        type: string;
        message: string;
        taskId?: string;
    }): Promise<Notification | null> {
        if (data.userId === data.actorId) {
            return null; // Don't notify yourself
        }
        const notification = this.notificationsRepository.create(data);
        return this.notificationsRepository.save(notification);
    }
}
