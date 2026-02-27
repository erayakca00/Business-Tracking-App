import { configureStore } from '@reduxjs/toolkit';
import { api } from '../services/api';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authReducer,
        theme: themeReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
