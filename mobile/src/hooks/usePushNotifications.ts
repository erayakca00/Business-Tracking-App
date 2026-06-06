import { useEffect, useRef } from 'react';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';

import Toast from 'react-native-toast-message';
import { RootState } from '../app/store';
import { useRegisterPushTokenMutation } from '../services/usersApi';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const usePushNotifications = (navigationRef?: { current: any }) => {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const [registerPushToken] = useRegisterPushTokenMutation();

    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const registerForPushNotificationsAsync = async () => {
            if (!Device.isDevice) {
                console.log('Must use physical device for Push Notifications');
                return;
            }

            try {
                const settings = (await Notifications.getPermissionsAsync()) as any;
                let finalStatus = settings.status;
                if (settings.status !== 'granted') {
                    const newSettings = (await Notifications.requestPermissionsAsync()) as any;
                    finalStatus = newSettings.status;
                }
                if (finalStatus !== 'granted') {
                    console.log('Failed to get push token for push notification!');
                    return;
                }

                // Retrieve projectId from Constants
                const projectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ??
                    Constants?.easConfig?.projectId;

                console.log('Expo Project ID detected:', projectId);

                if (!projectId) {
                    console.warn(
                        'WARNING: Expo projectId is not configured in app.json. Please run "eas init" or define extra.eas.projectId in app.json.'
                    );
                }

                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: projectId || undefined,
                });
                
                const token = tokenData.data;
                console.log('Expo Push Token retrieved:', token);

                // Register with NestJS backend
                await registerPushToken({ token }).unwrap();
                console.log('Expo Push Token registered with backend successfully.');
            } catch (error: any) {
                console.warn('Failed to set up Expo push notifications:', error?.message || error);
            }
        };

        registerForPushNotificationsAsync();

        // Helper to safely navigate using the ref
        const navigateToTask = (taskId: string) => {
            if (navigationRef?.current?.isReady()) {
                (navigationRef.current as any).navigate('MainTabs', {
                    screen: 'NotificationsTab',
                    params: { taskId },
                });
            }
        };

        // Foreground notification listener
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('Received foreground notification:', notification);
                const title = notification.request.content.title || 'New Notification';
                const body = notification.request.content.body || '';
                const data = notification.request.content.data;
                const taskId = data?.taskId as string | undefined;

                // Show a beautiful in-app toast using react-native-toast-message
                Toast.show({
                    type: 'info',
                    text1: title,
                    text2: body,
                    position: 'top',
                    visibilityTime: 5000,
                    autoHide: true,
                    onPress: () => {
                        Toast.hide();
                        if (taskId) {
                            navigateToTask(taskId);
                        }
                    },
                });
            }
        );

        // Background / Terminated notification tap listener
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                console.log('User pressed notification:', response);
                const data = response.notification.request.content.data;
                const taskId = data?.taskId as string | undefined;

                if (taskId) {
                    navigateToTask(taskId);
                }
            }
        );

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [isAuthenticated, registerPushToken, navigationRef]);
};
