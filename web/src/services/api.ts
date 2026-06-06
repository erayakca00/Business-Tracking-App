import axios from 'axios';

// Get baseline API URL configuration
let rawApiUrl = (import.meta as any).env.VITE_API_URL || '';

// Ensure the URL has a protocol scheme.
// Render's fromService `host` property injects just the hostname
// (e.g. "business-tracking-backend.onrender.com") without https://.
// Without a protocol, axios treats it as a relative path and requests
// go to the frontend origin instead of the backend.
if (rawApiUrl && !/^https?:\/\//i.test(rawApiUrl)) {
    rawApiUrl = `https://${rawApiUrl}`;
}

// Ensure absolute URLs have the proper /api/v1 prefix appended
if (rawApiUrl && !rawApiUrl.endsWith('/api/v1')) {
    rawApiUrl = rawApiUrl.endsWith('/') ? `${rawApiUrl}api/v1` : `${rawApiUrl}/api/v1`;
}

// Fallback to relative path if not configured
const API_URL = rawApiUrl || '/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        // Detect if the response is actually the index.html fallback due to a 404 rewritten by SPA routing rules
        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            return Promise.reject({
                response: {
                    status: 404,
                    data: { message: 'API endpoint not found (returned HTML index page).' }
                }
            });
        }
        return response;
    },
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Prevent redirect loop if already on login or register
            if (globalThis.location.pathname !== '/login' && globalThis.location.pathname !== '/register') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                globalThis.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
