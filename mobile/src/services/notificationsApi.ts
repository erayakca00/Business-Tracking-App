import { api } from './api';

export interface Notification {
    id: string;
    userId: string;
    actorId: string;
    type: 'task_assigned' | 'mention' | string;
    message: string;
    taskId?: string;
    isRead: boolean;
    createdAt: string;
    actor: {
        id: string;
        name: string;
        email: string;
    };
}

export interface UnreadCountResponse {
    count: number;
}

export const notificationsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getNotifications: builder.query<Notification[], void>({
            query: () => '/notifications',
            providesTags: ['Notification'],
        }),
        getUnreadCount: builder.query<UnreadCountResponse, void>({
            query: () => '/notifications/unread-count',
            providesTags: ['Notification'],
        }),
        markAsRead: builder.mutation<Notification, string>({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification'],
        }),
        markAllAsRead: builder.mutation<{ success: boolean }, void>({
            query: () => ({
                url: '/notifications/read-all',
                method: 'PATCH',
            }),
            invalidatesTags: ['Notification'],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useGetUnreadCountQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
} = notificationsApi;
