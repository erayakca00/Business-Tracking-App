import { api } from './api';
import { Task } from './tasksApi';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProfileDto {
    name?: string;
    mobileTheme?: string;
    webTheme?: string;
}

export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}

export const usersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getProfile: builder.query<UserProfile, void>({
            query: () => '/users/me',
            providesTags: ['User'],
        }),
        getMyTasks: builder.query<Task[], void>({
            query: () => '/tasks/my',
            providesTags: (result) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'Task' as const, id })), { type: 'Task', id: 'LIST' }]
                    : [{ type: 'Task', id: 'LIST' }],
        }),
        updateProfile: builder.mutation<UserProfile, UpdateProfileDto>({
            query: (data) => ({
                url: '/users/me',
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['User'],
        }),
        changePassword: builder.mutation<{ message: string }, ChangePasswordDto>({
            query: (data) => ({
                url: '/users/me/password',
                method: 'PATCH',
                body: data,
            }),
        }),
        registerPushToken: builder.mutation<void, { token: string }>({
            query: (body) => ({
                url: '/users/me/push-token',
                method: 'POST',
                body,
            }),
        }),
    }),
});

export const {
    useGetProfileQuery,
    useGetMyTasksQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation,
    useRegisterPushTokenMutation,
} = usersApi;
