import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import * as admin from 'firebase-admin';
import * as fs from 'node:fs';
import * as path from 'node:path';

let firebaseApp: admin.app.App | null = null;
try {
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    'firebase-service-account.json';
  const resolvedPath = path.resolve(serviceAccountPath);
  if (fs.existsSync(resolvedPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      firebaseApp = admin.app();
    }
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.warn(
      `Firebase service account file not found at: ${resolvedPath}. FCM Push Notifications will operate in [MOCK MODE].`,
    );
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserNotifications(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<any> {
    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [data, total] = await this.notificationsRepository.findAndCount({
        where: { userId },
        relations: ['actor'],
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });
      return {
        data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    }

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
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'assigned':
        return 'Task Assigned 📋';
      case 'mention':
        return 'New Mention 💬';
      case 'comment':
        return 'New Comment 💬';
      case 'status_change':
        return 'Task Status Updated 🔄';
      case 'priority_change':
        return 'Task Priority Updated ⚠️';
      default:
        return 'Business Tracking';
    }
  }

  private async sendPush(
    user: any,
    title: string,
    message: string,
    type: string,
    taskId?: string,
  ): Promise<void> {
    if (user.pushToken.startsWith('ExponentPushToken[')) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            to: user.pushToken,
            title,
            body: message,
            sound: 'default',
            data: {
              taskId: taskId || '',
              type,
            },
          }),
        });
        const result = await response.json();
        console.log(
          `[Expo Push] Successfully requested push to user ${user.name} (${user.email}). Response:`,
          JSON.stringify(result),
        );
      } catch (expoErr) {
        console.error('[Expo Push] Error sending push notification:', expoErr);
      }
    } else if (firebaseApp) {
      await firebaseApp.messaging().send({
        token: user.pushToken,
        notification: {
          title,
          body: message,
        },
        data: {
          taskId: taskId || '',
          type,
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });
      console.log(
        `[FCM] Successfully delivered push to user ${user.name} (${user.email})`,
      );
    } else {
      console.log(
        `\n=============================================================`,
      );
      console.log(`📢 [MOCK PUSH NOTIFICATION TRIGGERED]`);
      console.log(`👉 To User:   ${user.name} (${user.email})`);
      console.log(`👉 Token:     ${user.pushToken}`);
      console.log(`👉 Title:     ${title}`);
      console.log(`👉 Message:   ${message}`);
      console.log(`👉 Task ID:   ${taskId || 'None'}`);
      console.log(
        `=============================================================\n`,
      );
    }
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
    const saved = await this.notificationsRepository.save(notification);

    // Fetch user with pushToken to send push notification
    try {
      const user = await this.userRepository.findOne({
        where: { id: data.userId },
      });
      if (user?.pushToken) {
        const title = this.getNotificationTitle(data.type);
        await this.sendPush(user, title, data.message, data.type, data.taskId);
      }
    } catch (pushErr) {
      console.error(
        '[Notification Push] Error sending push notification:',
        pushErr,
      );
    }

    return saved;
  }
}
