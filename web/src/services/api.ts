import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

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
    (response) => response,
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
