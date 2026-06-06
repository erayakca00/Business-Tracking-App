import { api } from './api';

export const authApi = api.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        register: builder.mutation({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
        }),
        forgotPassword: builder.mutation<any, { email: string }>({
            query: (body) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body,
            }),
        }),
    }),
});

export const { useLoginMutation, useRegisterMutation, useForgotPasswordMutation } = authApi;
