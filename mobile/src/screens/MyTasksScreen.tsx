import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, Card, Chip, ActivityIndicator, useTheme, IconButton } from 'react-native-paper';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGetMyTasksQuery } from '../services/usersApi';
import TaskDetailSheet, { TaskForSheet } from '../components/TaskDetailSheet';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'todo': return '#9E9E9E';
        case 'in_progress': return '#2196F3';
        case 'review': return '#FF9800';
        case 'done': return '#4CAF50';
        case 'blocked': return '#F44336';
        default: return '#9E9E9E';
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'low': return '#4CAF50';
        case 'medium': return '#FF9800';
        case 'high': return '#F44336';
        default: return '#9E9E9E';
    }
};

const STATUS_FILTERS: { key: 'active' | 'all' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'; label: string }[] = [
    { key: 'active', label: 'Active Tasks' },
    { key: 'all', label: 'All Statuses' },
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'In Review' },
    { key: 'blocked', label: 'Blocked' },
    { key: 'done', label: 'Done' },
];

const MyTasksScreen = () => {
    const theme = useTheme();
    const { data: tasks = [], isLoading, isFetching, refetch } = useGetMyTasksQuery();

    const sheetRef = useRef<BottomSheet>(null);
    const [selectedTask, setSelectedTask] = useState<TaskForSheet | null>(null);

    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'>('active');

    const uniqueGroups = useMemo(() => {
        const groupMap = new Map<string, string>();
        tasks.forEach((t: any) => {
            if (t.group) {
                groupMap.set(t.group.id, t.group.name);
            }
        });
        return Array.from(groupMap.entries()).map(([id, name]) => ({ id, name }));
    }, [tasks]);

    const getFilteredTasks = () => {
        return tasks.filter((t: any) => {
            if (selectedGroup && t.group?.id !== selectedGroup) {
                return false;
            }
            if (statusFilter === 'active') {
                return t.status !== 'done';
            }
            if (statusFilter !== 'all' && t.status !== statusFilter) {
                return false;
            }
            return true;
        });
    };

    const openTaskSheet = (task: any) => {
        setSelectedTask(task);
        sheetRef.current?.expand();
    };

    const closeTaskSheet = () => {
        setSelectedTask(null);
    };

    const renderTaskItem = ({ item }: { item: any }) => {
        const isBlocked = item.blockedBy?.some((b: any) => b.status !== 'done') || false;
        const activeBlockers = item.blockedBy?.filter((b: any) => b.status !== 'done') || [];

        return (
            <Card style={styles.card} onPress={() => openTaskSheet(item)}>
                <Card.Content>
                    <View style={styles.taskHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                            {isBlocked && <Text style={{ fontSize: 14, marginRight: 4 }}>🔒</Text>}
                            <Text variant="titleMedium" style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                        </View>
                        {item.dueDate && (
                            <View style={styles.dateContainer}>
                                <IconButton icon="calendar-outline" size={14} style={styles.dateIcon} />
                                <Text variant="bodySmall" style={styles.dateText}>
                                    {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </Text>
                            </View>
                        )}
                    </View>
                    {isBlocked && (
                        <Text variant="bodySmall" style={{ color: '#F44336', marginBottom: 4, fontWeight: 'bold' }}>
                            Blocked by: {activeBlockers.map((b: any) => b.title).join(', ')}
                        </Text>
                    )}
                    {item.description && (
                        <Text variant="bodyMedium" numberOfLines={2} style={styles.taskDescription}>
                            {item.description}
                        </Text>
                    )}
                    <View style={styles.taskFooter}>
                        <View style={styles.chipsContainer}>
                            <Chip
                                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                                textStyle={styles.chipText}
                            >
                                {item.status.replace('_', ' ')}
                            </Chip>
                            <Chip
                                style={[styles.statusChip, { backgroundColor: getPriorityColor(item.priority) }]}
                                textStyle={styles.chipText}
                            >
                                {item.priority}
                            </Chip>
                            {item.effortScore !== undefined && item.effortScore !== null && (
                                <Chip style={[styles.statusChip, { backgroundColor: theme.colors.primaryContainer }]} textStyle={[styles.chipText, { color: theme.colors.onPrimaryContainer }]}>
                                    {item.effortScore} pts
                                </Chip>
                            )}
                        </View>
                        {item.group && (
                            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                                {item.group.name}
                            </Text>
                        )}
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>My Tasks</Text>
                </View>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" />
                    </View>
                ) : tasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>
                            You have no assigned tasks.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Filters */}
                        <View style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant, paddingBottom: 6 }}>
                            {uniqueGroups.length > 0 && (
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    style={{ flexGrow: 0, flexShrink: 0, height: 42, paddingVertical: 4 }}
                                    contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
                                >
                                    <TouchableOpacity
                                        onPress={() => setSelectedGroup(null)}
                                        style={[
                                            styles.filterChip, 
                                            { borderColor: theme.colors.primary },
                                            selectedGroup === null && { backgroundColor: theme.colors.primary }
                                        ]}
                                    >
                                        <Text style={{ color: selectedGroup === null ? '#fff' : theme.colors.primary, fontSize: 11, fontWeight: '500' }}>All Groups</Text>
                                    </TouchableOpacity>
                                    {uniqueGroups.map(g => (
                                        <TouchableOpacity
                                            key={g.id}
                                            onPress={() => setSelectedGroup(g.id)}
                                            style={[
                                                styles.filterChip, 
                                                { borderColor: theme.colors.primary },
                                                selectedGroup === g.id && { backgroundColor: theme.colors.primary }
                                            ]}
                                        >
                                            <Text style={{ color: selectedGroup === g.id ? '#fff' : theme.colors.primary, fontSize: 11, fontWeight: '500' }}>📁 {g.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                style={{ flexGrow: 0, flexShrink: 0, height: 38, paddingVertical: 2 }}
                                contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
                            >
                                {STATUS_FILTERS.map(opt => (
                                    <TouchableOpacity
                                        key={opt.key}
                                        onPress={() => setStatusFilter(opt.key)}
                                        style={[
                                            styles.filterChip, 
                                            { borderColor: theme.colors.secondary },
                                            statusFilter === opt.key && { backgroundColor: theme.colors.secondary }
                                        ]}
                                    >
                                        <Text style={{ color: statusFilter === opt.key ? '#fff' : theme.colors.secondary, fontSize: 10, fontWeight: '500' }}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <FlatList
                            data={getFilteredTasks()}
                            keyExtractor={(item) => item.id}
                            renderItem={renderTaskItem}
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.list}
                            refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text variant="bodyLarge" style={{ color: theme.colors.outline, marginTop: 40 }}>
                                        No tasks match the active filters.
                                    </Text>
                                </View>
                            }
                        />
                    </>
                )}
            </View>

            <TaskDetailSheet
                task={selectedTask}
                members={[]} // In MyTasks, we might not have all group members readily available, but the sheet handles it
                currentUserId={selectedTask?.assignedToId} // Just to enable editing if assigned to current user
                isAdmin={false} // Assume false for editing privileges
                onClose={closeTaskSheet}
                sheetRef={sheetRef}
            />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 44,
        paddingBottom: 15,
        paddingHorizontal: 20,
        elevation: 2,
    },
    list: {
        padding: 10,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 10,
        elevation: 2,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    taskTitle: {
        flex: 1,
        fontWeight: 'bold',
        marginRight: 10,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateIcon: {
        margin: 0,
        width: 20,
        height: 20,
    },
    dateText: {
        color: '#666',
    },
    taskDescription: {
        color: '#666',
        marginBottom: 10,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    chipsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statusChip: {
        height: 24,
    },
    chipText: {
        fontSize: 10,
        color: '#fff',
        marginVertical: 0,
        textTransform: 'capitalize',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginRight: 8,
        flexShrink: 0,
    },
});

export default MyTasksScreen;
