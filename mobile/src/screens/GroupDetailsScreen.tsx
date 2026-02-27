import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text, Card, FAB, Portal, Modal, TextInput, Button, ActivityIndicator, Chip, Menu, Dialog, useTheme, IconButton } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useGetTasksByGroupQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from '../services/tasksApi';
import { useGetGroupByIdQuery, useGetGroupMembersQuery, useAddGroupMemberMutation, useRemoveGroupMemberMutation } from '../services/groupsApi';
import { RootState } from '../app/store';

type RouteParams = {
    GroupDetails: {
        groupId: string;
    };
};

const GroupDetailsScreen = () => {
    const theme = useTheme();
    const route = useRoute<RouteProp<RouteParams, 'GroupDetails'>>();
    const { groupId } = route.params;

    const { user } = useSelector((state: RootState) => state.auth);
    const currentUserId = user?.id;

    const { data: group } = useGetGroupByIdQuery(groupId);
    const { data: tasks, isLoading, error, refetch: refetchTasks } = useGetTasksByGroupQuery(groupId);
    const { data: members, refetch: refetchMembers } = useGetGroupMembersQuery(groupId);
    const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [deleteTask] = useDeleteTaskMutation();
    const [addMember] = useAddGroupMemberMutation();
    const [removeMember] = useRemoveGroupMemberMutation();

    const [visible, setVisible] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [assignedTo, setAssignedTo] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');
    const [tagPrefix, setTagPrefix] = useState('');   // e.g. PRO
    const [tagNumber, setTagNumber] = useState('');   // e.g. 1
    const [tagError, setTagError] = useState('');

    const projectTag = tagPrefix.length === 3 && tagNumber ? `${tagPrefix}-${tagNumber}` : undefined;

    const handlePrefixChange = (val: string) => {
        setTagPrefix(val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3));
    };
    const handleNumberChange = (val: string) => {
        setTagNumber(val.replace(/[^0-9]/g, ''));
    };
    const applyExistingTag = (tag: string) => {
        const parts = tag.split('-');
        if (parts.length === 2) { setTagPrefix(parts[0]); setTagNumber(parts[1]); }
    };
    const resetTag = () => { setTagPrefix(''); setTagNumber(''); setTagError(''); };

    // Edit/Delete state
    const [editingTask, setEditingTask] = useState<any>(null);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [menuVisible, setMenuVisible] = useState<string | null>(null);
    const [statusMenuVisible, setStatusMenuVisible] = useState<string | null>(null);

    // Member management state
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [memberEmail, setMemberEmail] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showAssigneeList, setShowAssigneeList] = useState(false);
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [showModalTagList, setShowModalTagList] = useState(false);
    const [mobileSortBy, setMobileSortBy] = useState<'title' | 'tag' | 'createdAt' | 'updatedAt' | 'dueDate' | 'priority'>('createdAt');
    const [mobileSortDir, setMobileSortDir] = useState<'asc' | 'desc'>('desc');

    const SORT_OPTIONS: { key: typeof mobileSortBy; label: string }[] = [
        { key: 'createdAt', label: 'Created' },
        { key: 'updatedAt', label: 'Updated' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'title', label: 'Name' },
        { key: 'tag', label: 'Tag' },
        { key: 'priority', label: 'Priority' },
    ];

    const priorityOrderM: Record<string, number> = { high: 0, medium: 1, low: 2 };

    const getSortedFilteredTasks = () => {
        const base = tagFilter ? tasks?.filter((t: any) => t.projectTag === tagFilter) : tasks;
        if (!base) return [];
        return [...base].sort((a: any, b: any) => {
            let cmp = 0;
            if (mobileSortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
            else if (mobileSortBy === 'tag') cmp = (a.projectTag || '').localeCompare(b.projectTag || '');
            else if (mobileSortBy === 'priority') cmp = (priorityOrderM[a.priority] ?? 9) - (priorityOrderM[b.priority] ?? 9);
            else {
                const da = a[mobileSortBy] ? new Date(a[mobileSortBy]).getTime() : 0;
                const db = b[mobileSortBy] ? new Date(b[mobileSortBy]).getTime() : 0;
                cmp = da - db;
            }
            return mobileSortDir === 'asc' ? cmp : -cmp;
        });
    };

    // Permission checks
    const currentUserMember = members?.find((m: any) => m.userId === currentUserId);
    const isAdmin = currentUserMember?.role === 'admin';

    const canEdit = (task: any) => isAdmin || (currentUserId && task.assignedToId === currentUserId);
    const canDelete = isAdmin;

    const showModal = () => setVisible(true);
    const hideModal = () => {
        setVisible(false);
        setTaskTitle('');
        setTaskDesc('');
        setPriority('medium');
        setAssignedTo(null);
        setDueDate('');
        resetTag();
        setEditingTask(null);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchTasks(), refetchMembers()]);
        setRefreshing(false);
    };

    const handleCreateTask = async () => {
        if (!taskTitle.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Task title is required',
            });
            return;
        }
        try {
            if (editingTask) {
                if (projectTag && projectTag.length > 0) {
                    // format is already guaranteed by split inputs, but validate just in case
                }
                // Update existing task
                await updateTask({
                    id: editingTask.id,
                    data: {
                        title: taskTitle,
                        description: taskDesc,
                        priority,
                        assignedToId: assignedTo,
                        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                        projectTag: projectTag?.trim() || undefined,
                    }
                }).unwrap();
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Task updated successfully!',
                });
            } else {
                // Create new task
                await createTask({
                    title: taskTitle,
                    description: taskDesc,
                    priority,
                    groupId,
                    assignedToId: assignedTo || undefined,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                    projectTag: projectTag?.trim() || undefined,
                }).unwrap();
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Task created successfully!',
                });
            }
            hideModal();
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to save task',
            });
        }
    };

    const handleEditTask = (task: any) => {
        setEditingTask(task);
        setTaskTitle(task.title);
        setTaskDesc(task.description || '');
        setPriority(task.priority);
        setAssignedTo(task.assignedToId || null);
        setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        if (task.projectTag) { applyExistingTag(task.projectTag); } else { resetTag(); }
        setMenuVisible(null);
        showModal();
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;
        try {
            await deleteTask(taskToDelete).unwrap();
            setDeleteDialogVisible(false);
            setTaskToDelete(null);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Task deleted successfully!',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to delete task',
            });
        }
    };

    const openDeleteDialog = (taskId: string) => {
        setTaskToDelete(taskId);
        setMenuVisible(null);
        setDeleteDialogVisible(true);
    };

    const handleAddMember = async () => {
        if (!memberEmail.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Email is required',
            });
            return;
        }
        try {
            await addMember({ groupId, email: memberEmail }).unwrap();
            setMemberEmail('');
            setMemberModalVisible(false);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Member added successfully!',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to add member',
            });
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            await removeMember({ groupId, userId }).unwrap();
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Member removed successfully!',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to remove member',
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'todo': return '#9E9E9E';
            case 'in_progress': return '#2196F3';
            case 'review': return '#FFC107';
            case 'done': return '#4CAF50';
            default: return '#9E9E9E';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'low': return '#4CAF50';
            case 'medium': return '#FF9800';
            case 'high': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
        try {
            await updateTask({ id: taskId, data: { status: newStatus } }).unwrap();
            setStatusMenuVisible(null);
        } catch (err) {
            console.error('Failed to update task status', err);
        }
    };

    const renderTaskItem = ({ item }: { item: any }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.taskHeader}>
                    <Text variant="titleMedium" style={styles.taskTitle}>{item.title}</Text>
                    <Menu
                        visible={menuVisible === item.id}
                        onDismiss={() => setMenuVisible(null)}
                        anchor={
                            <Button onPress={() => setMenuVisible(item.id)} icon="dots-vertical" compact>Menu</Button>
                        }
                    >
                        {/* Only show Edit if allowed */}
                        {canEdit(item) && <Menu.Item onPress={() => handleEditTask(item)} title="Edit" leadingIcon="pencil" />}
                        {/* Only show Delete if admin */}
                        {canDelete && <Menu.Item onPress={() => openDeleteDialog(item.id)} title="Delete" leadingIcon="delete" />}
                    </Menu>
                </View>
                {item.description ? <Text variant="bodySmall" numberOfLines={2} style={[styles.taskDesc, { color: theme.colors.onSurfaceVariant }]}>{item.description}</Text> : null}
                <View style={styles.taskFooter}>
                    <Menu
                        visible={statusMenuVisible === item.id}
                        onDismiss={() => setStatusMenuVisible(null)}
                        anchor={
                            <Chip
                                compact
                                style={{ backgroundColor: getStatusColor(item.status) }}
                                textStyle={{ color: '#fff', fontSize: 10 }}
                                // Only allow status change if can edit
                                onPress={() => canEdit(item) && setStatusMenuVisible(item.id)}
                            >
                                {item.status.replace('_', ' ')}
                            </Chip>
                        }
                    >
                        <Menu.Item onPress={() => handleStatusChange(item.id, 'todo')} title="To Do" />
                        <Menu.Item onPress={() => handleStatusChange(item.id, 'in_progress')} title="In Progress" />
                        <Menu.Item onPress={() => handleStatusChange(item.id, 'review')} title="In Review" />
                        <Menu.Item onPress={() => handleStatusChange(item.id, 'done')} title="Done" />
                    </Menu>
                    <Chip compact style={{ backgroundColor: getPriorityColor(item.priority), marginLeft: 5 }} textStyle={{ color: '#fff', fontSize: 10 }}>
                        {item.priority}
                    </Chip>
                    {item.dueDate && (
                        <Chip compact icon="calendar" style={{ marginLeft: 5, backgroundColor: theme.colors.surfaceVariant }} textStyle={{ fontSize: 10 }}>
                            {new Date(item.dueDate).toLocaleDateString()}
                        </Chip>
                    )}
                    {item.assignedToId && (
                        <Chip compact icon="account" style={{ marginLeft: 5, backgroundColor: theme.colors.secondaryContainer }} textStyle={{ fontSize: 10 }}>
                            {members?.find((m: any) => m.userId === item.assignedToId)?.name || 'Assigned'}
                        </Chip>
                    )}
                    {item.projectTag && (
                        <Chip compact icon="folder" style={{ marginLeft: 5, backgroundColor: theme.colors.tertiaryContainer }} textStyle={{ fontSize: 10 }}>
                            {item.projectTag}
                        </Chip>
                    )}
                    {item.createdAt && (
                        <Chip compact icon="clock-outline" style={{ marginLeft: 5, backgroundColor: theme.colors.surfaceVariant }} textStyle={{ fontSize: 10 }}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Chip>
                    )}
                    {item.updatedAt && item.updatedAt !== item.createdAt && (
                        <Chip compact icon="pencil-outline" style={{ marginLeft: 5, backgroundColor: theme.colors.surfaceVariant }} textStyle={{ fontSize: 10 }}>
                            edited {new Date(item.updatedAt).toLocaleDateString()}
                        </Chip>
                    )}
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
                <Text variant="headlineSmall">{group?.name}</Text>
                <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>{group?.description}</Text>
                {isAdmin && <Chip style={{ alignSelf: 'flex-start', marginTop: 8 }} icon="shield-account">Admin View</Chip>}
            </View>

            <View style={[styles.membersSection, { backgroundColor: theme.colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Members ({members?.length || 0})</Text>
                    <IconButton
                        icon={showMembers ? "chevron-up" : "chevron-down"}
                        onPress={() => setShowMembers(!showMembers)}
                        size={20}
                    />
                </View>

                {showMembers && (
                    <>
                        {members?.map((member: any) => (
                            <View key={member.id} style={styles.memberRow}>
                                <View style={styles.memberInfo}>
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
                                        <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text variant="bodyLarge" style={{ fontWeight: '500' }}>{member.name}</Text>
                                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                                            {member.role === 'admin' ? 'Admin' : 'Member'}
                                        </Text>
                                    </View>
                                </View>

                                {isAdmin && member.userId !== currentUserId && (
                                    <IconButton
                                        icon="delete-outline"
                                        iconColor={theme.colors.error}
                                        size={20}
                                        onPress={() => handleRemoveMember(member.userId)}
                                    />
                                )}
                            </View>
                        ))}

                        {isAdmin && (
                            <Button
                                mode="outlined"
                                onPress={() => setMemberModalVisible(true)}
                                icon="account-plus"
                                style={{ marginTop: 10, borderColor: theme.colors.primary }}
                            >
                                Add Member
                            </Button>
                        )}
                    </>
                )}
            </View>

            {isLoading && !refreshing ? (
                <ActivityIndicator animating={true} style={styles.loader} />
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>Error loading tasks</Text>
                    <Button mode="outlined" onPress={() => refetchTasks()} style={styles.retryBtn}>
                        Retry
                    </Button>
                </View>
            ) : (
                <>
                    {/* Project Tag Filter */}
                    {tasks && tasks.some((t: any) => t.projectTag) && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 10, paddingVertical: 6, flexGrow: 0 }}>
                            <TouchableOpacity
                                onPress={() => setTagFilter(null)}
                                style={[styles.filterChip, tagFilter === null && { backgroundColor: theme.colors.primary }]}
                            >
                                <Text style={{ color: tagFilter === null ? '#fff' : theme.colors.primary, fontSize: 12 }}>All</Text>
                            </TouchableOpacity>
                            {Array.from(new Set(tasks.map((t: any) => t.projectTag).filter(Boolean))).map((tag: any) => (
                                <TouchableOpacity
                                    key={tag}
                                    onPress={() => setTagFilter(tagFilter === tag ? null : tag)}
                                    style={[styles.filterChip, tagFilter === tag && { backgroundColor: theme.colors.primary }]}
                                >
                                    <Text style={{ color: tagFilter === tag ? '#fff' : theme.colors.primary, fontSize: 12 }}>📁 {tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    {/* Sort Bar */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 10, paddingBottom: 4, flexGrow: 0 }}>
                        {SORT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                onPress={() => {
                                    if (mobileSortBy === opt.key) setMobileSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setMobileSortBy(opt.key); setMobileSortDir('asc'); }
                                }}
                                style={[styles.filterChip, mobileSortBy === opt.key && { backgroundColor: theme.colors.secondary }]}
                            >
                                <Text style={{ color: mobileSortBy === opt.key ? '#fff' : theme.colors.secondary, fontSize: 11 }}>
                                    {opt.label} {mobileSortBy === opt.key ? (mobileSortDir === 'asc' ? '↑' : '↓') : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <FlatList
                        data={getSortedFilteredTasks()}
                        renderItem={renderTaskItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>No Tasks Yet</Text>
                                <Text style={[styles.emptyText, { color: theme.colors.outline }]}>Create your first task to get started!</Text>
                            </View>
                        }
                    />
                </>
            )}

            <Portal>
                <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleLarge">{editingTask ? 'Edit Task' : 'Create New Task'}</Text>
                    <TextInput
                        label="Task Title"
                        value={taskTitle}
                        onChangeText={setTaskTitle}
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                    />
                    <TextInput
                        label="Description"
                        value={taskDesc}
                        onChangeText={setTaskDesc}
                        multiline
                        numberOfLines={3}
                        style={[styles.input, { minHeight: 60, backgroundColor: theme.colors.surface }]}
                    />
                    <TextInput
                        label="Deadline (YYYY-MM-DD)"
                        value={dueDate}
                        onChangeText={setDueDate}
                        placeholder="2026-05-20"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                    />
                    {/* Structured split tag input */}
                    <View style={{ marginBottom: 8 }}>
                        <Text variant="labelMedium" style={{ marginBottom: 4, color: theme.colors.onSurface }}>Project Tag</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ alignItems: 'center' }}>
                                <TextInput
                                    label="Letters"
                                    value={tagPrefix}
                                    onChangeText={handlePrefixChange}
                                    placeholder="PRO"
                                    autoCapitalize="characters"
                                    maxLength={3}
                                    style={[styles.input, { width: 80, backgroundColor: theme.colors.surface, textAlign: 'center' }]}
                                />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.outline, paddingTop: 8 }}>-</Text>
                            <View style={{ alignItems: 'center' }}>
                                <TextInput
                                    label="Number"
                                    value={tagNumber}
                                    onChangeText={handleNumberChange}
                                    placeholder="1"
                                    keyboardType="numeric"
                                    style={[styles.input, { width: 80, backgroundColor: theme.colors.surface, textAlign: 'center' }]}
                                />
                            </View>
                            {projectTag ? (
                                <Chip icon="folder" compact style={{ backgroundColor: theme.colors.tertiaryContainer, marginTop: 8 }} textStyle={{ fontSize: 11 }}>
                                    {projectTag}
                                </Chip>
                            ) : null}
                        </View>
                        <Text style={{ color: theme.colors.outline, fontSize: 11, marginTop: 2 }}>e.g. PRO-1, DEV-3, MKT-12</Text>
                    </View>
                    {/* Existing tag chips - collapsible */}
                    {tasks && tasks.some((t: any) => t.projectTag) && (
                        <View style={{ marginBottom: 8 }}>
                            <TouchableOpacity
                                onPress={() => setShowModalTagList(v => !v)}
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                            >
                                <IconButton icon={showModalTagList ? 'chevron-up' : 'chevron-down'} size={16} style={{ margin: 0 }} />
                                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>
                                    {showModalTagList ? 'Hide' : 'Show'} existing tags ({Array.from(new Set(tasks.map((t: any) => t.projectTag).filter(Boolean))).length})
                                </Text>
                            </TouchableOpacity>
                            {showModalTagList && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {Array.from(new Set(tasks.map((t: any) => t.projectTag).filter(Boolean))).map((tag: any) => (
                                        <TouchableOpacity
                                            key={tag}
                                            onPress={() => { applyExistingTag(tag); setShowModalTagList(false); }}
                                            style={[styles.filterChip, projectTag === tag && { backgroundColor: theme.colors.primary }]}
                                        >
                                            <Text style={{ color: projectTag === tag ? '#fff' : theme.colors.primary, fontSize: 12 }}>{tag}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    )}

                    <View>
                        <TouchableOpacity
                            onPress={() => setShowAssigneeList(!showAssigneeList)}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 5 }}
                        >
                            <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                                Assign To: {assignedTo ? members?.find((m: any) => m.userId === assignedTo)?.name : 'Unassigned'}
                            </Text>
                            <IconButton icon={showAssigneeList ? "chevron-up" : "chevron-down"} size={20} />
                        </TouchableOpacity>

                        {showAssigneeList && (isAdmin ? (
                            <View style={{ maxHeight: 200 }}>
                                <ScrollView nestedScrollEnabled>
                                    <TouchableOpacity
                                        onPress={() => { setAssignedTo(null); setShowAssigneeList(false); }}
                                        style={[styles.memberRow, { backgroundColor: assignedTo === null ? theme.colors.secondaryContainer : 'transparent' }]}
                                    >
                                        <Text style={{ marginLeft: 10 }}>Unassigned</Text>
                                        {assignedTo === null && <IconButton icon="check" size={20} />}
                                    </TouchableOpacity>
                                    {members?.map((member: any) => (
                                        <TouchableOpacity
                                            key={member.userId}
                                            onPress={() => { setAssignedTo(member.userId); setShowAssigneeList(false); }}
                                            style={[styles.memberRow, { backgroundColor: assignedTo === member.userId ? theme.colors.secondaryContainer : 'transparent' }]}
                                        >
                                            <View style={styles.memberInfo}>
                                                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryContainer, width: 28, height: 28 }]}>
                                                    <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 12, fontWeight: 'bold' }}>
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={{ marginLeft: 10 }}>{member.name}</Text>
                                            </View>
                                            {assignedTo === member.userId && <IconButton icon="check" size={20} />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : (
                            <Text style={{ fontStyle: 'italic', marginBottom: 10, color: '#666' }}>
                                Only admins can change assignment.
                            </Text>
                        ))}
                    </View>

                    <Text variant="labelLarge" style={styles.label}>Priority</Text>
                    <View style={styles.priorityButtons}>
                        <Button
                            mode={priority === 'low' ? 'contained' : 'outlined'}
                            onPress={() => setPriority('low')}
                            style={styles.priorityBtn}
                        >
                            Low
                        </Button>
                        <Button
                            mode={priority === 'medium' ? 'contained' : 'outlined'}
                            onPress={() => setPriority('medium')}
                            style={styles.priorityBtn}
                        >
                            Medium
                        </Button>
                        <Button
                            mode={priority === 'high' ? 'contained' : 'outlined'}
                            onPress={() => setPriority('high')}
                            style={styles.priorityBtn}
                        >
                            High
                        </Button>
                    </View>
                    <Button mode="contained" onPress={handleCreateTask} loading={isCreating} style={styles.createBtn}>
                        {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                </Modal>

                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
                    <Dialog.Title>Delete Task</Dialog.Title>
                    <Dialog.Content>
                        <Text>Are you sure you want to delete this task? This action cannot be undone.</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleDeleteTask} textColor="red">Delete</Button>
                    </Dialog.Actions>
                </Dialog>

                <Modal visible={memberModalVisible} onDismiss={() => setMemberModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="titleLarge">Add Member</Text>
                    <TextInput
                        label="Member Email"
                        value={memberEmail}
                        onChangeText={setMemberEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                    />
                    <Button mode="contained" onPress={handleAddMember} style={styles.createBtn}>
                        Add Member
                    </Button>
                </Modal>
            </Portal>

            <FAB
                style={styles.fab}
                icon="plus"
                onPress={showModal}
                label="New Task"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        elevation: 2,
    },
    description: {
        marginTop: 5,
    },
    loader: {
        marginTop: 50,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    error: {
        color: 'red',
        fontSize: 16,
        marginBottom: 15,
    },
    retryBtn: {
        marginTop: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 100,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    list: {
        padding: 10,
        flexGrow: 1,
    },
    card: {
        marginBottom: 10,
        elevation: 2,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskTitle: {
        fontWeight: 'bold',
        flex: 1,
    },
    taskDesc: {
        marginTop: 5,
    },
    taskFooter: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#2196F3',
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 10,
    },
    input: {
        marginTop: 10,
    },
    label: {
        marginTop: 15,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    assignmentButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    assignBtn: {
        marginRight: 5,
        marginBottom: 5,
    },
    priorityButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityBtn: {
        flex: 1,
        marginHorizontal: 2,
    },
    createBtn: {
        marginTop: 20,
    },
    membersSection: {
        padding: 15,
        marginTop: 10,
    },
    sectionTitle: {
        marginBottom: 10,
        fontWeight: 'bold',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#6200ee',
        marginRight: 8,
    },
});

export default GroupDetailsScreen;
