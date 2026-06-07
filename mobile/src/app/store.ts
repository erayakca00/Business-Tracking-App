import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { api } from '../services/api';
import authReducer from '../features/auth/authSlice';
import themeReducer from '../features/theme/themeSlice';

const appReducer = combineReducers({
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    theme: themeReducer,
});

const rootReducer = (state: any, action: any) => {
    if (action.type === 'auth/logout') {
        // Clear all state to prevent cache leakage, but preserve user's theme selection
        const theme = state?.theme;
        state = { theme };
    }
    return appReducer(state, action);
};

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
