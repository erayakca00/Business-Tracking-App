import api from './api';

export interface NotificationUser {
    id: string;
    name: string;
    avatar?: string;
}

export interface AppNotification {
    id: string;
    userId: string;
    actorId: string;
    actor: NotificationUser;
    type: string;
    message: string;
    taskId?: string;
    isRead: boolean;
    createdAt: string;
}

export const notificationsService = {
    getNotifications: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id: string) => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    },
};
