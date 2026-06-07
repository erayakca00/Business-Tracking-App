import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { RootState } from '../app/store';
import { logout } from '../features/auth/authSlice';

// Android Emulator basic localhost mapping is 10.0.2.2
// For physical device, you must use your computer's LAN IP address (e.g., 192.168.1.x)
const PRODUCTION_URL = 'https://business-tracking-backend.onrender.com/api/v1';
const DEVELOPMENT_URL = 'http://192.168.0.11:3000/api/v1';

export const BASE_URL = __DEV__ ? DEVELOPMENT_URL : PRODUCTION_URL;

const baseQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    if (result.error?.status === 401) {
        api.dispatch(logout());
    }
    return result;
};

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['User', 'Group', 'Task', 'GroupMember', 'Comment', 'Activity', 'Notification', 'Attachment', 'TimeLog', 'Sprint', 'Backlog', 'Template'],
    endpoints: () => ({}),
});
