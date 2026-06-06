import React, { useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Animated,
} from 'react-native';
import { Text, IconButton, ActivityIndicator, useTheme, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    Notification,
} from '../services/notificationsApi';
import TaskDetailSheet, { TaskForSheet } from '../components/TaskDetailSheet';

import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getNotificationIcon = (type: string): string => {
    switch (type) {
        case 'task_assigned': return 'clipboard-account-outline';
        case 'mention': return 'at';
        default: return 'bell-outline';
    }
};

const getNotificationIconColor = (type: string, primary: string): string => {
    switch (type) {
        case 'task_assigned': return primary;
        case 'mention': return '#FF9800';
        default: return '#9E9E9E';
    }
};

const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

const formatRelativeTime = (iso: string): string => {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const ActorAvatar = ({ name, type, size = 40 }: { name: string; type: string; size?: number }) => {
    const theme = useTheme();
    return (
        <View style={[styles.avatar, {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.primaryContainer,
        }]}>
            <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: size * 0.35, fontWeight: 'bold' }}>
                {getInitials(name)}
            </Text>
            {/* Type badge */}
            <View style={[styles.typeBadge, { backgroundColor: theme.colors.surface }]}>
                <IconButton
                    icon={getNotificationIcon(type)}
                    size={11}
                    iconColor={getNotificationIconColor(type, theme.colors.primary)}
                    style={{ margin: 0 }}
                />
            </View>
        </View>
    );
};

// ─── Notification Row ─────────────────────────────────────────────────────────

interface NotificationRowProps {
    item: Notification;
    onPress: (item: Notification) => void;
    onMarkRead: (id: string) => void;
}

const NotificationRow = ({ item, onPress, onMarkRead }: NotificationRowProps) => {
    const theme = useTheme();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    const handlePressOut = () =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={() => onPress(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={[
                    styles.notifRow,
                    {
                        backgroundColor: item.isRead
                            ? theme.colors.surface
                            : theme.colors.primaryContainer + '30',
                        borderLeftColor: item.isRead
                            ? 'transparent'
                            : theme.colors.primary,
                    },
                ]}
            >
                {/* Unread dot */}
                {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                )}

                <ActorAvatar name={item.actor?.name || '?'} type={item.type} />

                <View style={styles.notifContent}>
                    <Text style={[styles.notifActor, { color: theme.colors.onSurface }]}>
                        {item.actor?.name}
                    </Text>
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.notifMessage,
                            { color: item.isRead ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                            !item.isRead && { fontWeight: '500' },
                        ]}
                    >
                        {item.message}
                    </Text>
                    <Text style={[styles.notifTime, { color: theme.colors.outline }]}>
                        {formatRelativeTime(item.createdAt)}
                    </Text>
                </View>

                {!item.isRead && (
                    <TouchableOpacity
                        onPress={() => onMarkRead(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.markReadBtn}
                    >
                        <IconButton
                            icon="check"
                            size={16}
                            iconColor={theme.colors.primary}
                            style={{ margin: 0 }}
                        />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const NotificationSeparator = () => (
    <Divider style={{ opacity: 0.4 }} />
);

type ListItemType =
    | { type: 'section'; label: string }
    | { type: 'item'; data: Notification };

const renderNotificationsContentHelper = ({
    isLoading,
    notifications,
    theme,
    listData,
    renderItem,
    isFetching,
    refetch,
}: {
    isLoading: boolean;
    notifications: Notification[];
    theme: any;
    listData: ListItemType[];
    renderItem: (info: { item: ListItemType }) => React.ReactElement;
    isFetching: boolean;
    refetch: () => void;
}) => {
    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (notifications.length === 0) {
        return (
            <View style={styles.center}>
                <IconButton icon="bell-sleep-outline" size={64} iconColor={theme.colors.outline} />
                <Text style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                    All caught up!
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.outline }]}>
                    You have no notifications yet.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) =>
                item.type === 'section' ? `section-${item.label}` : item.data.id
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
                <RefreshControl
                    refreshing={isFetching && !isLoading}
                    onRefresh={refetch}
                    colors={[theme.colors.primary]}
                />
            }
            ItemSeparatorComponent={NotificationSeparator}
        />
    );
};

const NotificationsScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { user } = useSelector((state: RootState) => state.auth);

    const {
        data: notifications = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetNotificationsQuery();

    const route = useRoute<any>();
    const initialTaskId = route.params?.taskId;

    React.useEffect(() => {
        if (initialTaskId) {
            setSelectedTask({
                id: initialTaskId,
                title: 'Loading task…',
                status: 'todo',
                priority: 'medium',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            sheetRef.current?.expand();
            // Clear route params so it doesn't open again on subsequent screen visits
            navigation.setParams({ taskId: undefined } as any);
        }
    }, [initialTaskId, navigation]);

    const [markAsRead] = useMarkAsReadMutation();
    const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();

    // Bottom sheet for task detail
    const sheetRef = useRef<BottomSheet>(null);
    const [selectedTask, setSelectedTask] = useState<TaskForSheet | null>(null);


    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationPress = async (item: Notification) => {
        // Mark as read
        if (!item.isRead) {
            await markAsRead(item.id);
        }
        // If it has a taskId, open the task detail sheet
        if (item.taskId) {
            // We don't have the full task object here — just open a lightweight sheet
            // with what we know. The sheet will fetch comments/activity on its own.
            setSelectedTask({
                id: item.taskId,
                title: 'Loading task…',
                status: 'todo',
                priority: 'medium',
                createdAt: item.createdAt,
                updatedAt: item.createdAt,
            });
            sheetRef.current?.expand();
        }
    };

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    const closeSheet = () => setSelectedTask(null);

    // ── Sections: Today / Earlier ─────────────────────────────────────────────

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayItems = notifications.filter(n => new Date(n.createdAt) >= today);
    const earlierItems = notifications.filter(n => new Date(n.createdAt) < today);

    const listData: ListItemType[] = [
        ...(todayItems.length > 0 ? [{ type: 'section' as const, label: 'Today' }] : []),
        ...todayItems.map(n => ({ type: 'item' as const, data: n })),
        ...(earlierItems.length > 0 ? [{ type: 'section' as const, label: 'Earlier' }] : []),
        ...earlierItems.map(n => ({ type: 'item' as const, data: n })),
    ];

    const renderItem = ({ item }: { item: ListItemType }) => {
        if (item.type === 'section') {
            return (
                <Text style={[styles.sectionLabel, { color: theme.colors.outline }]}>
                    {item.label}
                </Text>
            );
        }
        return (
            <NotificationRow
                item={item.data}
                onPress={handleNotificationPress}
                onMarkRead={handleMarkRead}
            />
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

                {/* ── Header ── */}
                <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }]}>
                    <View style={styles.headerLeft}>
                        <IconButton
                            icon="arrow-left"
                            size={24}
                            onPress={() => navigation.goBack()}
                            style={{ margin: 0 }}
                        />
                        <View style={{ marginLeft: 4 }}>
                            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                                Notifications
                            </Text>
                            {unreadCount > 0 && (
                                <Text style={[styles.headerSub, { color: theme.colors.primary }]}>
                                    {unreadCount} unread
                                </Text>
                            )}
                        </View>
                    </View>

                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            disabled={isMarkingAll}
                            style={[styles.markAllBtn, { borderColor: theme.colors.primary }]}
                        >
                            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>
                                {isMarkingAll ? 'Marking…' : 'Mark all read'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Content ── */}
                {renderNotificationsContentHelper({
                    isLoading,
                    notifications,
                    theme,
                    listData,
                    renderItem,
                    isFetching,
                    refetch,
                })}
            </View>

            {/* ── Task Detail Sheet ── */}
            <TaskDetailSheet
                task={selectedTask}
                members={[]}
                currentUserId={user?.id}
                isAdmin={false}
                onClose={closeSheet}
                sheetRef={sheetRef}
            />
        </GestureHandlerRootView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 44,
        paddingBottom: 14,
        borderBottomWidth: 1,
        elevation: 2,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    markAllBtn: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    markAllText: {
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 40,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },
    notifRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderLeftWidth: 3,
        gap: 12,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 16,
        marginLeft: -4,
        flexShrink: 0,
    },
    avatar: {
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    typeBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    notifContent: {
        flex: 1,
    },
    notifActor: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    notifMessage: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 4,
    },
    notifTime: {
        fontSize: 11,
    },
    markReadBtn: {
        flexShrink: 0,
        marginTop: 6,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        marginTop: 6,
    },
});

export default NotificationsScreen;
