import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: string;
    email: string;
    name: string;
    webTheme?: string;
    mobileTheme?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start as loading to check for saved credentials
};

// Async thunk to load credentials from storage on app start
export const loadStoredCredentials = createAsyncThunk(
    'auth/loadStoredCredentials',
    async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userJson = await AsyncStorage.getItem('user');

            if (token && userJson) {
                const user = JSON.parse(userJson);
                return { user, token };
            }
            return null;
        } catch (error) {
            console.error('Failed to load credentials', error);
            return null;
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ user: User; token: string }>
        ) => {
            const { user, token } = action.payload;
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;

            // Save to AsyncStorage
            AsyncStorage.setItem('token', token);
            AsyncStorage.setItem('user', JSON.stringify(user));
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;

            // Clear from AsyncStorage
            AsyncStorage.removeItem('token');
            AsyncStorage.removeItem('user');
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadStoredCredentials.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(loadStoredCredentials.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload) {
                    state.user = action.payload.user;
                    state.token = action.payload.token;
                    state.isAuthenticated = true;
                }
            })
            .addCase(loadStoredCredentials.rejected, (state) => {
                state.isLoading = false;
            });
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
