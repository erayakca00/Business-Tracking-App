import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

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
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
      if (user && user.pushToken) {
        // Determine user-friendly notification title
        let title = 'Business Tracking';
        if (data.type === 'assigned') title = 'Task Assigned 📋';
        else if (data.type === 'mention') title = 'New Mention 💬';
        else if (data.type === 'comment') title = 'New Comment 💬';
        else if (data.type === 'status_change')
          title = 'Task Status Updated 🔄';
        else if (data.type === 'priority_change')
          title = 'Task Priority Updated ⚠️';

        if (user.pushToken.startsWith('ExponentPushToken[')) {
          try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                to: user.pushToken,
                title,
                body: data.message,
                sound: 'default',
                data: {
                  taskId: data.taskId || '',
                  type: data.type,
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
              body: data.message,
            },
            data: {
              taskId: data.taskId || '',
              type: data.type,
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
          console.log(`👉 Message:   ${data.message}`);
          console.log(`👉 Task ID:   ${data.taskId || 'None'}`);
          console.log(
            `=============================================================\n`,
          );
        }
      }
    } catch (pushErr) {
      console.error('[Notification Push] Error sending push notification:', pushErr);
    }

    return saved;
  }
}
