import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi } from '../../services/usersApi';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
    mode: ThemeMode;
    isLoading: boolean;
}

const initialState: ThemeState = {
    mode: 'light', // Default to light, will be updated from storage/api
    isLoading: true,
};

export const loadTheme = createAsyncThunk(
    'theme/loadTheme',
    async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            return savedTheme as ThemeMode | null;
        } catch (error) {
            console.error('Failed to load theme', error);
            return null;
        }
    }
);

export const toggleTheme = createAsyncThunk(
    'theme/toggleTheme',
    async (_, { getState, dispatch }) => {
        const state = getState() as any;
        const currentMode = state.theme.mode;
        const newMode = currentMode === 'light' ? 'dark' : 'light';

        // 1. Persist to AsyncStorage
        await AsyncStorage.setItem('theme', newMode);

        // 2. Sync with Backend if logged in
        const { token, user } = state.auth;
        if (token && user) {
            try {
                // We use the api slice (usersApi) to update the backend
                // But since we are inside a thunk, we can validly dispatch the api mutation if we imported the valid endpoint
                // Alternatively, we can just make a fetch call or ignore backend sync error here if UI updates optimistically
                await dispatch(usersApi.endpoints.updateProfile.initiate({ mobileTheme: newMode })).unwrap();
            } catch (error) {
                console.error('Failed to sync theme with backend', error);
            }
        }

        return newMode;
    }
);

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<ThemeMode>) => {
            state.mode = action.payload;
            AsyncStorage.setItem('theme', action.payload);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loadTheme.fulfilled, (state, action) => {
            if (action.payload) {
                state.mode = action.payload;
            }
            state.isLoading = false;
        });
        builder.addCase(toggleTheme.fulfilled, (state, action) => {
            state.mode = action.payload;
        });
    },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
