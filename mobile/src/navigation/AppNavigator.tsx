/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { RootState } from '../app/store';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DashboardScreen from '../app/DashboardScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MyTasksScreen from '../screens/MyTasksScreen';
import SprintPlanningScreen from '../screens/SprintPlanningScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import { useGetUnreadCountQuery } from '../services/notificationsApi';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const theme = useTheme();
    const { data: unreadData } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });
    const unreadCount = unreadData?.count ?? 0;

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.outline,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                },
            }}
        >
            <Tab.Screen
                name="DashboardTab"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="MyTasksTab"
                component={MyTasksScreen}
                options={{
                    tabBarLabel: 'My Tasks',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="checkbox-marked" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="NotificationsTab"
                component={NotificationsScreen}
                options={{
                    tabBarLabel: 'Notifications',
                    tabBarIcon: ({ color, size }) => (
                        <React.Fragment>
                            <MaterialCommunityIcons name="bell" color={color} size={size} />
                            {unreadCount > 0 && (
                                <Badge style={styles.badge} size={16}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Badge>
                            )}
                        </React.Fragment>
                    ),
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    return (
        <Stack.Navigator>
            {isAuthenticated ? (
                <>
                    <Stack.Screen
                        name="MainTabs"
                        component={MainTabs}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="GroupDetails"
                        component={GroupDetailsScreen}
                        options={({ navigation, route }: any) => ({
                            title: route.params?.groupName || 'Group Tasks',
                            headerLeft: () => (
                                <IconButton
                                    icon="arrow-left"
                                    onPress={() => navigation.goBack()}
                                />
                            ),
                        })}
                    />
                    <Stack.Screen
                        name="SprintPlanning"
                        component={SprintPlanningScreen}
                        options={({ navigation }: any) => ({
                            title: 'Sprint Planning',
                            headerLeft: () => (
                                <IconButton
                                    icon="arrow-left"
                                    onPress={() => navigation.goBack()}
                                />
                            ),
                        })}
                    />
                    <Stack.Screen
                        name="Analytics"
                        component={AnalyticsScreen}
                        options={({ navigation }: any) => ({
                            title: 'Group Analytics',
                            headerLeft: () => (
                                <IconButton
                                    icon="arrow-left"
                                    onPress={() => navigation.goBack()}
                                />
                            ),
                        })}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true, title: 'Forgot Password' }} />
                </>
            )}
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
    },
});

export default AppNavigator;
