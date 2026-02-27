import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { Provider } from 'react-redux';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  ActivityIndicator,
  adaptNavigationTheme
} from 'react-native-paper';
import { View, StyleSheet, useColorScheme, LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { store } from './src/app/store';

LogBox.ignoreLogs(['Remote debugger', 'Debugger']);
import AppNavigator from './src/navigation/AppNavigator';
import { loadStoredCredentials } from './src/features/auth/authSlice';
import { loadTheme } from './src/features/theme/themeSlice';
import { useAppDispatch, useAppSelector } from './src/app/hooks';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: MD3LightTheme,
  materialDark: MD3DarkTheme,
});

const CombinedDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
  },
  fonts: MD3LightTheme.fonts, // Explicitly preserve MD3 fonts
} as any;

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac6',
  },
  fonts: MD3DarkTheme.fonts, // Explicitly preserve MD3 fonts
} as any;

const AppContent = () => {
  const dispatch = useAppDispatch();
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const isThemeLoading = useAppSelector((state) => state.theme.isLoading);
  const themeMode = useAppSelector((state) => state.theme.mode);

  useEffect(() => {
    dispatch(loadStoredCredentials());
    dispatch(loadTheme());
  }, [dispatch]);

  const theme = themeMode === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;

  if (isAuthLoading || isThemeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme}>
        <AppNavigator />
        <Toast />
      </NavigationContainer>
    </PaperProvider>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
