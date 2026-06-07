import React, { useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Animated,
} from 'react-native';
import { Text, IconButton, ActivityIndicator, useTheme, Divider, Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
    useMarkAllAsReadMutation,
    Notification,
} from '../services/notificationsApi';
import {
    useGetMyPendingInvitationsQuery,
    useAcceptInvitationMutation,
    useDeclineInvitationMutation,
    PendingInvitation,
} from '../services/groupsApi';
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

interface InvitationRowProps {
    item: PendingInvitation;
    onAccept: (invitation: PendingInvitation) => void;
    onDecline: (invitation: PendingInvitation) => void;
    acceptingId: string | null;
    decliningId: string | null;
}

const InvitationRow = ({ item, onAccept, onDecline, acceptingId, decliningId }: InvitationRowProps) => {
    const theme = useTheme();
    return (
        <View style={[styles.invitationRow, { backgroundColor: theme.colors.primaryContainer + '10', borderLeftColor: theme.colors.primary }]}>
            <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer, width: 40, height: 40, borderRadius: 20 }]}>
                    <IconButton icon="account-plus-outline" size={20} iconColor={theme.colors.onPrimaryContainer} style={{ margin: 0 }} />
                </View>
            </View>
            <View style={styles.notifContent}>
                <Text style={[styles.notifMessage, { color: theme.colors.onSurface, fontSize: 13, marginBottom: 2 }]}>
                    <Text style={{ fontWeight: 'bold' }}>{item.inviterName}</Text> invited you to join <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.groupName}</Text>
                </Text>
                <Text style={[styles.notifTime, { color: theme.colors.outline, marginBottom: 8 }]}>
                    {formatRelativeTime(item.createdAt)}
                </Text>
                <View style={styles.actionButtonsContainer}>
                    <Button
                        mode="contained"
                        onPress={() => onAccept(item)}
                        loading={acceptingId === item.id}
                        disabled={acceptingId !== null || decliningId !== null}
                        style={styles.actionButton}
                        labelStyle={{ fontSize: 12, marginVertical: 4, marginHorizontal: 8 }}
                    >
                        Accept
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => onDecline(item)}
                        loading={decliningId === item.id}
                        disabled={acceptingId !== null || decliningId !== null}
                        style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                        labelStyle={{ fontSize: 12, marginVertical: 4, marginHorizontal: 8 }}
                    >
                        Decline
                    </Button>
                </View>
            </View>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const NotificationSeparator = () => (
    <Divider style={{ opacity: 0.4 }} />
);

type ListItemType =
    | { type: 'section'; label: string }
    | { type: 'item'; data: Notification }
    | { type: 'invitation'; data: PendingInvitation };



const NotificationsScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { user } = useSelector((state: RootState) => state.auth);

    const {
        data: notifications = [],
        isLoading: isNotificationsLoading,
        isFetching: isNotificationsFetching,
        refetch: refetchNotifications,
    } = useGetNotificationsQuery();

    const {
        data: pendingInvitations = [],
        isLoading: isInvitationsLoading,
        isFetching: isInvitationsFetching,
        refetch: refetchInvitations,
    } = useGetMyPendingInvitationsQuery();

    const [acceptInvitation] = useAcceptInvitationMutation();
    const [declineInvitation] = useDeclineInvitationMutation();

    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);

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

    const handleAcceptInvitation = async (invitation: PendingInvitation) => {
        setAcceptingId(invitation.id);
        try {
            await acceptInvitation({ token: invitation.token }).unwrap();
            Toast.show({
                type: 'success',
                text1: 'Invitation Accepted',
                text2: `You joined ${invitation.groupName}!`,
            });
        } catch (err: any) {
            console.error('Failed to accept invitation:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to accept invitation',
            });
        } finally {
            setAcceptingId(null);
        }
    };

    const handleDeclineInvitation = async (invitation: PendingInvitation) => {
        setDecliningId(invitation.id);
        try {
            await declineInvitation(invitation.id).unwrap();
            Toast.show({
                type: 'success',
                text1: 'Invitation Declined',
                text2: `Declined invite to ${invitation.groupName}`,
            });
        } catch (err: any) {
            console.error('Failed to decline invitation:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to decline invitation',
            });
        } finally {
            setDecliningId(null);
        }
    };

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
        ...(pendingInvitations.length > 0 ? [{ type: 'section' as const, label: 'Pending Invitations' }] : []),
        ...pendingInvitations.map(inv => ({ type: 'invitation' as const, data: inv })),
        ...(todayItems.length > 0 ? [{ type: 'section' as const, label: 'Today' }] : []),
        ...todayItems.map(n => ({ type: 'item' as const, data: n })),
        ...(earlierItems.length > 0 ? [{ type: 'section' as const, label: 'Earlier' }] : []),
        ...earlierItems.map(n => ({ type: 'item' as const, data: n })),
    ];

    const handleRefresh = () => {
        refetchNotifications();
        refetchInvitations();
    };

    const renderItem = ({ item }: { item: ListItemType }) => {
        if (item.type === 'section') {
            return (
                <Text style={[styles.sectionLabel, { color: theme.colors.outline }]}>
                    {item.label}
                </Text>
            );
        }
        if (item.type === 'invitation') {
            return (
                <InvitationRow
                    item={item.data}
                    onAccept={handleAcceptInvitation}
                    onDecline={handleDeclineInvitation}
                    acceptingId={acceptingId}
                    decliningId={decliningId}
                />
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

    const isOverallLoading = isNotificationsLoading || isInvitationsLoading;
    const isOverallFetching = isNotificationsFetching || isInvitationsFetching;

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
                {isOverallLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" />
                    </View>
                ) : notifications.length === 0 && pendingInvitations.length === 0 ? (
                    <View style={styles.center}>
                        <IconButton icon="bell-sleep-outline" size={64} iconColor={theme.colors.outline} />
                        <Text style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                            All caught up!
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: theme.colors.outline }]}>
                            You have no notifications or invitations.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={listData}
                        renderItem={renderItem}
                        keyExtractor={(item) =>
                            item.type === 'section'
                                ? `section-${item.label}`
                                : item.type === 'invitation'
                                ? `invite-${item.data.id}`
                                : item.data.id
                        }
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isOverallFetching && !isOverallLoading}
                                onRefresh={handleRefresh}
                                colors={[theme.colors.primary]}
                            />
                        }
                        ItemSeparatorComponent={NotificationSeparator}
                    />
                )}
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
    invitationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderLeftWidth: 3,
        gap: 12,
    },
    avatarContainer: {
        flexShrink: 0,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    actionButton: {
        borderRadius: 8,
    },
});

export default NotificationsScreen;
