import { api } from './api';

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
    }),
});

export const {
    useGetProfileQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation
} = usersApi;
