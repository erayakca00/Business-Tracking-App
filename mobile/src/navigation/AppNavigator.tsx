import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { IconButton } from 'react-native-paper';
import { RootState } from '../app/store';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import DashboardScreen from '../app/DashboardScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    return (
        <Stack.Navigator>
            {isAuthenticated ? (
                <>
                    <Stack.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="GroupDetails"
                        component={GroupDetailsScreen}
                        options={({ navigation }) => ({
                            title: 'Group Tasks',
                            headerLeft: () => (
                                <IconButton
                                    icon="arrow-left"
                                    onPress={() => navigation.goBack()}
                                />
                            ),
                        })}
                    />
                    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                </>
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
