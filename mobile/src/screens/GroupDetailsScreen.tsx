/* eslint-disable react-native/no-inline-styles, react/no-unstable-nested-components */
import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Text, Card, FAB as PaperFAB, Portal, Modal, TextInput, Button, ActivityIndicator, Chip, Menu, Dialog, useTheme, IconButton } from 'react-native-paper';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useGetTasksByGroupQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from '../services/tasksApi';
import { useGetGroupByIdQuery, useGetGroupMembersQuery, useAddGroupMemberMutation, useRemoveGroupMemberMutation, useDeleteGroupMutation } from '../services/groupsApi';
import { RootState } from '../app/store';
import TaskDetailSheet, { TaskForSheet } from '../components/TaskDetailSheet';
import { useSocket } from '../hooks/useSocket';
import { useGetTemplatesByGroupQuery } from '../services/templatesApi';

type RouteParams = {
    GroupDetails: {
        groupId: string;
        groupName?: string;
    };
};

type TaskStatusType = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
type TaskPriorityType = 'low' | 'medium' | 'high';
type MobileSortByType = 'title' | 'tag' | 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'todo': return '#9E9E9E';
        case 'in_progress': return '#2196F3';
        case 'review': return '#FFC107';
        case 'done': return '#4CAF50';
        case 'blocked': return '#F44336';
        default: return '#9E9E9E';
    }
};

const getPriorityColor = (pri: string) => {
    switch (pri.toLowerCase()) {
        case 'low': return '#4CAF50';
        case 'medium': return '#FF9800';
        case 'high': return '#F44336';
        default: return '#9E9E9E';
    }
};

const renderTaskItemHelper = ({
    item,
    theme,
    currentUserId,
    isAdmin,
    members,
    bulkSelectMode,
    selectedTaskIds,
    handleSelectTask,
    openTaskSheet,
    menuVisible,
    setMenuVisible,
    openDeleteDialog,
    statusMenuVisible,
    setStatusMenuVisible,
    handleStatusChange,
    handleEditTask,
}: {
    item: any;
    theme: any;
    currentUserId: string | undefined;
    isAdmin: boolean;
    members: any[] | undefined;
    bulkSelectMode: boolean;
    selectedTaskIds: Set<string>;
    handleSelectTask: (id: string) => void;
    openTaskSheet: (t: any) => void;
    menuVisible: string | null;
    setMenuVisible: (id: string | null) => void;
    openDeleteDialog: (id: string) => void;
    statusMenuVisible: string | null;
    setStatusMenuVisible: (id: string | null) => void;
    handleStatusChange: (id: string, status: any) => void;
    handleEditTask: (task: any) => void;
}) => {
    const isBlocked = item.blockedBy?.some((b: any) => b.status !== 'done') || false;
    const activeBlockers = item.blockedBy?.filter((b: any) => b.status !== 'done') || [];
    const isSelected = selectedTaskIds.has(item.id);

    const canEdit = isAdmin || (currentUserId && item.assignedToId === currentUserId);
    const canDelete = isAdmin;

    return (
        <Card
            style={[
                styles.card,
                isSelected && { borderColor: theme.colors.primary, borderWidth: 1.5 }
            ]}
            onPress={() => {
                if (bulkSelectMode) {
                    handleSelectTask(item.id);
                } else {
                    openTaskSheet(item);
                }
            }}
        >
            <Card.Content>
                <View style={styles.taskHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        {bulkSelectMode && (
                            <IconButton
                                icon={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                                iconColor={isSelected ? theme.colors.primary : theme.colors.outline}
                                size={20}
                                style={{ margin: 0, marginRight: 4 }}
                            />
                        )}
                        {isBlocked && <Text style={{ fontSize: 14, marginRight: 4 }}>🔒</Text>}
                        <Text variant="titleMedium" style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                    </View>
                    {!bulkSelectMode && (canEdit || canDelete) && (
                        <Menu
                            visible={menuVisible === item.id}
                            onDismiss={() => setMenuVisible(null)}
                            anchor={
                                <Button onPress={() => setMenuVisible(item.id)} icon="dots-vertical" compact style={{ margin: 0 }}>Menu</Button>
                            }
                        >
                            {/* Only show Edit if allowed */}
                            {canEdit && <Menu.Item onPress={() => handleEditTask(item)} title="Edit" leadingIcon="pencil" />}
                            {/* Only show Delete if admin */}
                            {canDelete && <Menu.Item onPress={() => openDeleteDialog(item.id)} title="Delete" leadingIcon="delete" />}
                        </Menu>
                    )}
                </View>
                {isBlocked && (
                    <Text variant="bodySmall" style={{ color: '#F44336', marginBottom: 4, fontWeight: 'bold' }}>
                        Blocked by: {activeBlockers.map((b: any) => b.title).join(', ')}
                    </Text>
                )}
                {item.description ? <Text variant="bodySmall" numberOfLines={2} style={[styles.taskDesc, { color: theme.colors.onSurfaceVariant }]}>{item.description}</Text> : null}
                <View style={styles.taskFooter}>
                    {bulkSelectMode ? (
                        <Chip
                            compact
                            style={{ backgroundColor: getStatusColor(item.status) }}
                            textStyle={{ color: '#fff', fontSize: 10 }}
                        >
                            {item.status.replaceAll('_', ' ')}
                        </Chip>
                    ) : (
                        <Menu
                            visible={statusMenuVisible === item.id}
                            onDismiss={() => setStatusMenuVisible(null)}
                            anchor={
                                <Chip
                                    compact
                                    style={{ backgroundColor: getStatusColor(item.status) }}
                                    textStyle={{ color: '#fff', fontSize: 10 }}
                                    // Only allow status change if can edit
                                    onPress={() => canEdit && setStatusMenuVisible(item.id)}
                                >
                                    {item.status.replaceAll('_', ' ')}
                                </Chip>
                            }
                        >
                            <Menu.Item onPress={() => handleStatusChange(item.id, 'todo')} title="To Do" />
                            <Menu.Item onPress={() => handleStatusChange(item.id, 'in_progress')} title="In Progress" disabled={isBlocked} />
                            <Menu.Item onPress={() => handleStatusChange(item.id, 'review')} title="In Review" disabled={isBlocked} />
                            <Menu.Item onPress={() => handleStatusChange(item.id, 'done')} title="Done" disabled={isBlocked} />
                            <Menu.Item onPress={() => handleStatusChange(item.id, 'blocked')} title="Blocked" />
                        </Menu>
                    )}
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
                    {item.effortScore !== undefined && item.effortScore !== null && (
                        <Chip compact icon="star" style={{ marginLeft: 5, backgroundColor: theme.colors.primaryContainer }} textStyle={{ fontSize: 10 }}>
                            {item.effortScore} pts
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
};

const renderTasksListHelper = ({
    isLoading,
    refreshing,
    error,
    tasks,
    tagFilter,
    setTagFilter,
    theme,
    mobileSortBy,
    mobileSortDir,
    setMobileSortBy,
    setMobileSortDir,
    getSortedFilteredTasks,
    onRefresh,
    refetchTasks,
    renderTaskItem,
}: {
    isLoading: boolean;
    refreshing: boolean;
    error: any;
    tasks: any[] | undefined;
    tagFilter: string | null;
    setTagFilter: (tag: string | null) => void;
    theme: any;
    mobileSortBy: MobileSortByType;
    mobileSortDir: 'asc' | 'desc';
    setMobileSortBy: (key: any) => void;
    setMobileSortDir: (dir: any) => void;
    getSortedFilteredTasks: () => any[];
    onRefresh: () => void;
    refetchTasks: () => void;
    renderTaskItem: (item: any) => React.ReactElement;
}) => {
    const SORT_OPTIONS: { key: typeof mobileSortBy; label: string }[] = [
        { key: 'createdAt', label: 'Created' },
        { key: 'updatedAt', label: 'Updated' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'title', label: 'Name' },
        { key: 'tag', label: 'Tag' },
        { key: 'priority', label: 'Priority' },
    ];

    const getSortIcon = (key: string) => {
        if (mobileSortBy !== key) return '';
        return mobileSortDir === 'asc' ? '↑' : '↓';
    };

    if (isLoading && !refreshing) {
        return <ActivityIndicator animating={true} style={styles.loader} />;
    }
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.error}>Error loading tasks</Text>
                <Button mode="outlined" onPress={() => refetchTasks()} style={styles.retryBtn}>
                    Retry
                </Button>
            </View>
        );
    }
    return (
        <>
            {/* Project Tag Filter */}
            {tasks && tasks.some((t: any) => t.projectTag) && (
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={{ flexGrow: 0, flexShrink: 0, height: 44, paddingVertical: 6 }}
                    contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'center' }}
                >
                    <TouchableOpacity
                        onPress={() => setTagFilter(null)}
                        style={[
                            styles.filterChip, 
                            { borderColor: theme.colors.primary },
                            tagFilter === null && { backgroundColor: theme.colors.primary }
                        ]}
                    >
                        <Text style={{ color: tagFilter === null ? '#fff' : theme.colors.primary, fontSize: 12 }}>All</Text>
                    </TouchableOpacity>
                    {Array.from(new Set(tasks.map((t: any) => t.projectTag).filter(Boolean))).map((tag: any) => (
                        <TouchableOpacity
                            key={tag}
                            onPress={() => setTagFilter(tagFilter === tag ? null : tag)}
                            style={[
                                styles.filterChip, 
                                { borderColor: theme.colors.primary },
                                tagFilter === tag && { backgroundColor: theme.colors.primary }
                            ]}
                        >
                            <Text style={{ color: tagFilter === tag ? '#fff' : theme.colors.primary, fontSize: 12 }}>📁 {tag}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
            {/* Sort Bar */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={{ flexGrow: 0, flexShrink: 0, height: 40, paddingBottom: 4 }}
                contentContainerStyle={{ paddingHorizontal: 10, alignItems: 'center' }}
            >
                {SORT_OPTIONS.map(opt => (
                    <TouchableOpacity
                        key={opt.key}
                        onPress={() => {
                            if (mobileSortBy === opt.key) {
                                setMobileSortDir(mobileSortDir === 'asc' ? 'desc' : 'asc');
                            } else {
                                setMobileSortBy(opt.key);
                                setMobileSortDir('asc');
                            }
                        }}
                        style={[
                            styles.filterChip, 
                            { borderColor: theme.colors.secondary },
                            mobileSortBy === opt.key && { backgroundColor: theme.colors.secondary }
                        ]}
                    >
                        <Text style={{ color: mobileSortBy === opt.key ? '#fff' : theme.colors.secondary, fontSize: 11 }}>
                            {opt.label} {getSortIcon(opt.key)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <FlatList
                data={getSortedFilteredTasks()}
                renderItem={({ item }) => renderTaskItem(item)}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
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
    );
};

const priorityOrderM: Record<string, number> = { high: 0, medium: 1, low: 2 };

const getSortedFilteredTasksHelper = (
    tasks: any[] | undefined,
    tagFilter: string | null,
    mobileSortBy: MobileSortByType,
    mobileSortDir: 'asc' | 'desc'
) => {
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

const renderDeleteTaskDialogHelper = ({
    visible,
    setVisible,
    onDelete,
    theme,
}: {
    visible: boolean;
    setVisible: (v: boolean) => void;
    onDelete: () => void;
    theme: any;
}) => (
    <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
        <Dialog.Title>Delete Task</Dialog.Title>
        <Dialog.Content>
            <Text>Are you sure you want to delete this task? This action cannot be undone.</Text>
        </Dialog.Content>
        <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={onDelete} textColor="red">Delete</Button>
        </Dialog.Actions>
    </Dialog>
);

const renderInviteMemberModalHelper = ({
    visible,
    setVisible,
    memberEmail,
    setMemberEmail,
    onInvite,
    theme,
}: {
    visible: boolean;
    setVisible: (v: boolean) => void;
    memberEmail: string;
    setMemberEmail: (email: string) => void;
    onInvite: () => void;
    theme: any;
}) => (
    <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge">Invite Member</Text>
        <TextInput
            label="Member Email"
            value={memberEmail}
            onChangeText={setMemberEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
        />
        <Button mode="contained" onPress={onInvite} style={styles.createBtn}>
            Invite Member
        </Button>
    </Modal>
);

const renderMembersListModalHelper = ({
    visible,
    setVisible,
    members,
    theme,
    isAdmin,
    currentUserId,
    onRemoveMember,
    onOpenInvite,
}: {
    visible: boolean;
    setVisible: (v: boolean) => void;
    members: any[] | undefined;
    theme: any;
    isAdmin: boolean;
    currentUserId: string | undefined;
    onRemoveMember: (userId: string) => void;
    onOpenInvite: () => void;
}) => (
    <Modal 
        visible={visible} 
        onDismiss={() => setVisible(false)} 
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]}
    >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Group Members ({members?.length || 0})</Text>
            <IconButton icon="close" size={24} onPress={() => setVisible(false)} style={{ margin: 0 }} />
        </View>
        
        <ScrollView style={{ marginBottom: 15 }} showsVerticalScrollIndicator={true}>
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
                            onPress={() => onRemoveMember(member.userId)}
                        />
                    )}
                </View>
            ))}
        </ScrollView>

        {isAdmin && (
            <Button
                mode="contained"
                onPress={onOpenInvite}
                icon="account-plus"
                style={{ marginTop: 10 }}
            >
                Invite Member
            </Button>
        )}
    </Modal>
);

const renderBulkReassignModalHelper = ({
    visible,
    setVisible,
    members,
    theme,
    onAssign,
}: {
    visible: boolean;
    setVisible: (v: boolean) => void;
    members: any[] | undefined;
    theme: any;
    onAssign: (memberId: string | null) => void;
}) => (
    <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge" style={{ marginBottom: 15 }}>Bulk Reassign Tasks</Text>
        <ScrollView style={{ maxHeight: 200 }}>
            <TouchableOpacity
                onPress={() => onAssign(null)}
                style={styles.memberRow}
            >
                <Text style={{ marginLeft: 10 }}>Unassigned</Text>
            </TouchableOpacity>
            {members?.map((member: any) => (
                <TouchableOpacity
                    key={member.userId}
                    onPress={() => onAssign(member.userId)}
                    style={styles.memberRow}
                >
                    <View style={styles.memberInfo}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primaryContainer, width: 28, height: 28 }]}>
                            <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 12, fontWeight: 'bold' }}>
                                {member.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={{ marginLeft: 10 }}>{member.name}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    </Modal>
);

const renderBulkDeleteDialogHelper = ({
    visible,
    setVisible,
    count,
    onDelete,
    theme,
}: {
    visible: boolean;
    setVisible: (v: boolean) => void;
    count: number;
    onDelete: () => void;
    theme: any;
}) => (
    <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
        <Dialog.Title>Delete Multiple Tasks</Dialog.Title>
        <Dialog.Content>
            <Text>Are you sure you want to delete these {count} tasks? This action cannot be undone.</Text>
        </Dialog.Content>
        <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={onDelete} textColor="red">Delete All</Button>
        </Dialog.Actions>
    </Dialog>
);

const renderBulkActionsPanelHelper = ({
    selectedCount,
    theme,
    statusMenuVisible,
    setStatusMenuVisible,
    onStatusChange,
    priorityMenuVisible,
    setPriorityMenuVisible,
    onPriorityChange,
    onOpenAssign,
    isAdmin,
    onOpenDelete,
    onCancel,
}: {
    selectedCount: number;
    theme: any;
    statusMenuVisible: boolean;
    setStatusMenuVisible: (v: boolean) => void;
    onStatusChange: (status: TaskStatusType) => void;
    priorityMenuVisible: boolean;
    setPriorityMenuVisible: (v: boolean) => void;
    onPriorityChange: (priority: TaskPriorityType) => void;
    onOpenAssign: () => void;
    isAdmin: boolean;
    onOpenDelete: () => void;
    onCancel: () => void;
}) => (
    <View style={[styles.bulkActionBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
        <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {selectedCount} Selected
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {/* Bulk Status Button */}
            <Menu
                visible={statusMenuVisible}
                onDismiss={() => setStatusMenuVisible(false)}
                anchor={
                    <IconButton
                        icon="check-circle-outline"
                        onPress={() => setStatusMenuVisible(true)}
                        size={20}
                    />
                }
            >
                <Menu.Item onPress={() => onStatusChange('todo')} title="To Do" />
                <Menu.Item onPress={() => onStatusChange('in_progress')} title="In Progress" />
                <Menu.Item onPress={() => onStatusChange('review')} title="In Review" />
                <Menu.Item onPress={() => onStatusChange('done')} title="Done" />
                <Menu.Item onPress={() => onStatusChange('blocked')} title="Blocked" />
            </Menu>

            {/* Bulk Priority Button */}
            <Menu
                visible={priorityMenuVisible}
                onDismiss={() => setPriorityMenuVisible(false)}
                anchor={
                    <IconButton
                        icon="alert-circle-outline"
                        onPress={() => setPriorityMenuVisible(true)}
                        size={20}
                    />
                }
            >
                <Menu.Item onPress={() => onPriorityChange('low')} title="Low" />
                <Menu.Item onPress={() => onPriorityChange('medium')} title="Medium" />
                <Menu.Item onPress={() => onPriorityChange('high')} title="High" />
            </Menu>

            {/* Bulk Reassign Button */}
            <IconButton
                icon="account-outline"
                onPress={onOpenAssign}
                size={20}
            />

            {/* Bulk Delete Button */}
            {isAdmin && (
                <IconButton
                    icon="delete-outline"
                    iconColor={theme.colors.error}
                    onPress={onOpenDelete}
                    size={20}
                />
            )}

            {/* Cancel Button */}
            <IconButton
                icon="close"
                onPress={onCancel}
                size={20}
            />
        </View>
    </View>
);

const renderCreateTaskModalHelper = ({
    visible,
    onDismiss,
    theme,
    editingTask,
    templates,
    handleSelectTemplate,
    taskTitle,
    setTaskTitle,
    taskDesc,
    setTaskDesc,
    dueDate,
    setDueDate,
    showDatePicker,
    setShowDatePicker,
    tagPrefix,
    handlePrefixChange,
    tagNumber,
    handleNumberChange,
    projectTag,
    tasks,
    showModalTagList,
    setShowModalTagList,
    applyExistingTag,
    showAssigneeList,
    setShowAssigneeList,
    assignedTo,
    setAssignedTo,
    members,
    isAdmin,
    priority,
    setPriority,
    onSubmit,
    isCreating,
}: {
    visible: boolean;
    onDismiss: () => void;
    theme: any;
    editingTask: any;
    templates: any[] | undefined;
    handleSelectTemplate: (id: string) => void;
    taskTitle: string;
    setTaskTitle: (v: string) => void;
    taskDesc: string;
    setTaskDesc: (v: string) => void;
    dueDate: string;
    setDueDate: (v: string) => void;
    showDatePicker: boolean;
    setShowDatePicker: (v: boolean) => void;
    tagPrefix: string;
    handlePrefixChange: (v: string) => void;
    tagNumber: string;
    handleNumberChange: (v: string) => void;
    projectTag: string | undefined;
    tasks: any[] | undefined;
    showModalTagList: boolean;
    setShowModalTagList: (v: boolean) => void;
    applyExistingTag: (tag: string) => void;
    showAssigneeList: boolean;
    setShowAssigneeList: (v: boolean) => void;
    assignedTo: string | null;
    setAssignedTo: (id: string | null) => void;
    members: any[] | undefined;
    isAdmin: boolean;
    priority: TaskPriorityType;
    setPriority: (pri: TaskPriorityType) => void;
    onSubmit: () => void;
    isCreating: boolean;
}) => (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleLarge">{editingTask ? 'Edit Task' : 'Create New Task'}</Text>
        {!editingTask && templates && templates.length > 0 && (
            <View style={{ marginBottom: 12, marginTop: 10 }}>
                <Text variant="labelMedium" style={{ marginBottom: 4, color: theme.colors.onSurface }}>Start from Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {templates.map((t: any) => (
                        <Chip
                            key={t.id}
                            icon="file-document-outline"
                            onPress={() => handleSelectTemplate(t.id)}
                            style={{ marginRight: 6, backgroundColor: theme.colors.secondaryContainer }}
                            textStyle={{ fontSize: 11 }}
                        >
                            {t.name}
                        </Chip>
                    ))}
                </ScrollView>
            </View>
        )}
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
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <View pointerEvents="none">
                <TextInput
                    label="Deadline"
                    value={dueDate}
                    editable={false}
                    placeholder="Select a date"
                    right={<TextInput.Icon icon="calendar" />}
                    style={[styles.input, { backgroundColor: theme.colors.surface }]}
                />
            </View>
        </TouchableOpacity>
        {showDatePicker && (
            <DateTimePicker
                value={dueDate ? new Date(dueDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                        setDueDate(selectedDate.toISOString().split('T')[0]);
                    }
                }}
            />
        )}
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
                    onPress={() => setShowModalTagList(!showModalTagList)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                >
                    <IconButton icon={showModalTagList ? 'chevron-up' : 'chevron-down'} size={16} style={{ margin: 0 }} />
                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>
                        {showModalTagList ? 'Hide' : 'Show'} existing tags ({new Set(tasks.map((t: any) => t.projectTag).filter(Boolean)).size})
                    </Text>
                </TouchableOpacity>
                {showModalTagList && (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={{ paddingVertical: 4 }}
                        contentContainerStyle={{ alignItems: 'center' }}
                    >
                        {Array.from(new Set(tasks.map((t: any) => t.projectTag).filter(Boolean))).map((tag: any) => (
                            <TouchableOpacity
                                key={tag}
                                onPress={() => { applyExistingTag(tag); setShowModalTagList(false); }}
                                style={[
                                    styles.filterChip, 
                                    { borderColor: theme.colors.primary },
                                    projectTag === tag && { backgroundColor: theme.colors.primary }
                                ]}
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
        <Button mode="contained" onPress={onSubmit} loading={isCreating} style={styles.createBtn}>
            {editingTask ? 'Update Task' : 'Create Task'}
        </Button>
    </Modal>
);

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
    const [deleteGroup] = useDeleteGroupMutation();

    const { socket, connected } = useSocket(groupId);

    React.useEffect(() => {
        if (!socket) return;

        const handleWebSocketEvent = () => {
            refetchTasks();
        };

        socket.on('task:created', handleWebSocketEvent);
        socket.on('task:updated', handleWebSocketEvent);
        socket.on('task:deleted', handleWebSocketEvent);

        return () => {
            socket.off('task:created', handleWebSocketEvent);
            socket.off('task:updated', handleWebSocketEvent);
            socket.off('task:deleted', handleWebSocketEvent);
        };
    }, [socket, refetchTasks]);

    const isOwner = group?.ownerId === currentUserId;

    const [visible, setVisible] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [priority, setPriority] = useState<TaskPriorityType>('medium');
    const [assignedTo, setAssignedTo] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tagPrefix, setTagPrefix] = useState('');   // e.g. PRO
    const [tagNumber, setTagNumber] = useState('');   // e.g. 1


    const projectTag = tagPrefix.length === 3 && tagNumber ? `${tagPrefix}-${tagNumber}` : undefined;

    const handlePrefixChange = (val: string) => {
        setTagPrefix(val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3));
    };
    const handleNumberChange = (val: string) => {
        setTagNumber(val.replace(/\D/g, ''));
    };
    const applyExistingTag = (tag: string) => {
        const parts = tag.split('-');
        if (parts.length === 2) { setTagPrefix(parts[0]); setTagNumber(parts[1]); }
    };
    const resetTag = () => { setTagPrefix(''); setTagNumber(''); };

    const handleSelectTemplate = (templateId: string) => {
        const selected = templates?.find((t: any) => t.id === templateId);
        if (selected) {
            if (selected.title) setTaskTitle(selected.title);
            if (selected.description) setTaskDesc(selected.description);
            if (selected.priority) setPriority(selected.priority);
            if (selected.projectTag) {
                const parts = selected.projectTag.split('-');
                if (parts.length === 2) {
                    setTagPrefix(parts[0]);
                    setTagNumber(parts[1]);
                } else {
                    setTagPrefix(selected.projectTag);
                    setTagNumber('');
                }
            } else {
                setTagPrefix('');
                setTagNumber('');
            }
        }
    };

    // Edit/Delete state
    const [editingTask, setEditingTask] = useState<any>(null);
    const { data: templates } = useGetTemplatesByGroupQuery(groupId, { skip: !visible || !!editingTask });
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [menuVisible, setMenuVisible] = useState<string | null>(null);
    const [statusMenuVisible, setStatusMenuVisible] = useState<string | null>(null);
    const [headerMenuVisible, setHeaderMenuVisible] = useState(false);

    // Bulk Selection States
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [bulkStatusMenuVisible, setBulkStatusMenuVisible] = useState(false);
    const [bulkPriorityMenuVisible, setBulkPriorityMenuVisible] = useState(false);
    const [bulkAssignVisible, setBulkAssignVisible] = useState(false);
    const [bulkDeleteDialogVisible, setBulkDeleteDialogVisible] = useState(false);

    // Member management state
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [memberEmail, setMemberEmail] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [membersListModalVisible, setMembersListModalVisible] = useState(false);
    const [showAssigneeList, setShowAssigneeList] = useState(false);
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [showModalTagList, setShowModalTagList] = useState(false);
    const [mobileSortBy, setMobileSortBy] = useState<MobileSortByType>('createdAt');
    const [mobileSortDir, setMobileSortDir] = useState<'asc' | 'desc'>('desc');

    // Task Detail Sheet
    const sheetRef = useRef<BottomSheet>(null);
    const [selectedTask, setSelectedTask] = useState<TaskForSheet | null>(null);

    const openTaskSheet = (task: any) => {
        setSelectedTask(task);
        sheetRef.current?.expand();
    };

    const closeTaskSheet = () => {
        setSelectedTask(null);
    };





    // Permission checks
    const currentUserMember = members?.find((m: any) => m.userId === currentUserId);
    const isAdmin = currentUserMember?.role === 'admin';



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

    const navigation = useNavigation();

    const handleDeleteGroup = React.useCallback(async () => {
        setHeaderMenuVisible(false);
        try {
            await deleteGroup(groupId).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Group deleted successfully!' });
            navigation.goBack();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err.data?.message || 'Failed to delete group' });
        }
    }, [groupId, deleteGroup, navigation]);

    const handleLeaveGroup = React.useCallback(async () => {
        setHeaderMenuVisible(false);
        if (!currentUserId) return;
        try {
            await removeMember({ groupId, userId: currentUserId }).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Left group successfully!' });
            navigation.goBack();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err.data?.message || 'Failed to leave group' });
        }
    }, [groupId, currentUserId, removeMember, navigation]);

    const toggleBulkSelectMode = React.useCallback(() => {
        setBulkSelectMode(prev => !prev);
        setSelectedTaskIds(new Set());
    }, []);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            title: group?.name || route.params?.groupName || 'Group Tasks',
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 4 }}>
                    <View style={[
                        styles.liveBadge, 
                        { backgroundColor: connected ? '#E8F5E9' : '#FFF3E0' }
                    ]}>
                        <View style={[
                            styles.liveDot, 
                            { backgroundColor: connected ? '#4CAF50' : '#FF9800' }
                        ]} />
                        <Text style={[
                            styles.liveText, 
                            { color: connected ? '#2E7D32' : '#E65100' }
                        ]}>
                            {connected ? 'LIVE' : 'OFFLINE'}
                        </Text>
                    </View>
                    <Menu
                        visible={headerMenuVisible}
                        onDismiss={() => setHeaderMenuVisible(false)}
                        anchor={
                            <IconButton
                                icon="dots-vertical"
                                onPress={() => setHeaderMenuVisible(true)}
                                size={20}
                                style={{ margin: 0 }}
                            />
                        }
                    >
                        <Menu.Item
                            onPress={() => {
                                setHeaderMenuVisible(false);
                                (navigation as any).navigate('SprintPlanning', { groupId, groupName: group?.name });
                            }}
                            title="Sprint Planning"
                            leadingIcon="calendar-sync"
                        />
                        <Menu.Item
                            onPress={() => {
                                setHeaderMenuVisible(false);
                                (navigation as any).navigate('Analytics', { groupId });
                            }}
                            title="Group Analytics"
                            leadingIcon="chart-bar"
                        />
                        <Menu.Item
                            onPress={() => {
                                setHeaderMenuVisible(false);
                                toggleBulkSelectMode();
                            }}
                            title={bulkSelectMode ? "Disable Bulk Select" : "Bulk Select Mode"}
                            leadingIcon={bulkSelectMode ? "checkbox-marked-outline" : "checkbox-multiple-marked-outline"}
                        />
                        <Menu.Item
                            onPress={() => {
                                setHeaderMenuVisible(false);
                                setMembersListModalVisible(true);
                            }}
                            title="Group Members"
                            leadingIcon="account-group"
                        />
                        {isOwner ? (
                            <Menu.Item onPress={handleDeleteGroup} title="Delete Group" leadingIcon="delete" titleStyle={{ color: theme.colors.error }} />
                        ) : (
                            <Menu.Item onPress={handleLeaveGroup} title="Leave Group" leadingIcon="exit-to-app" titleStyle={{ color: theme.colors.error }} />
                        )}
                    </Menu>
                </View>
            ),
        });
    }, [navigation, headerMenuVisible, isOwner, theme, connected, bulkSelectMode, group?.name, route.params?.groupName, groupId, handleDeleteGroup, handleLeaveGroup, toggleBulkSelectMode]);

    const handleSelectTask = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const handleBulkStatusChange = async (newStatus: TaskStatusType) => {
        setBulkStatusMenuVisible(false);
        let successCount = 0;
        let failCount = 0;
        let blockedTasksCount = 0;

        const tasksToUpdate = getSortedFilteredTasksHelper(tasks, tagFilter, mobileSortBy, mobileSortDir).filter(t => selectedTaskIds.has(t.id));
        
        for (const t of tasksToUpdate) {
            const isBlocked = t.blockedBy?.some((b: any) => b.status !== 'done') || false;
            if (isBlocked && (newStatus === 'in_progress' || newStatus === 'review' || newStatus === 'done')) {
                blockedTasksCount++;
                continue;
            }

            try {
                await updateTask({ id: t.id, data: { status: newStatus } }).unwrap();
                successCount++;
            } catch {
                failCount++;
            }
        }

        let msg = `${successCount} tasks updated.`;
        if (blockedTasksCount > 0) {
            msg += ` ${blockedTasksCount} tasks were locked due to active blockers.`;
        }
        if (failCount > 0) {
            msg += ` ${failCount} tasks failed to update.`;
        }

        Toast.show({
            type: blockedTasksCount > 0 || failCount > 0 ? 'info' : 'success',
            text1: 'Bulk Status Update',
            text2: msg,
        });

        setSelectedTaskIds(new Set());
        setBulkSelectMode(false);
    };

    const handleBulkPriorityChange = async (newPriority: TaskPriorityType) => {
        setBulkPriorityMenuVisible(false);
        let successCount = 0;
        let failCount = 0;
        const tasksToUpdate = getSortedFilteredTasksHelper(tasks, tagFilter, mobileSortBy, mobileSortDir).filter(t => selectedTaskIds.has(t.id));

        for (const t of tasksToUpdate) {
            try {
                await updateTask({ id: t.id, data: { priority: newPriority } }).unwrap();
                successCount++;
            } catch {
                failCount++;
            }
        }

        const failMessage = failCount > 0 ? ` ${failCount} failed.` : '';
        Toast.show({
            type: failCount > 0 ? 'info' : 'success',
            text1: 'Bulk Priority Update',
            text2: `${successCount} tasks updated.${failMessage}`,
        });

        setSelectedTaskIds(new Set());
        setBulkSelectMode(false);
    };

    const handleBulkAssign = async (memberId: string | null) => {
        setBulkAssignVisible(false);
        let successCount = 0;
        let failCount = 0;
        const tasksToUpdate = getSortedFilteredTasksHelper(tasks, tagFilter, mobileSortBy, mobileSortDir).filter(t => selectedTaskIds.has(t.id));

        for (const t of tasksToUpdate) {
            try {
                await updateTask({ id: t.id, data: { assignedToId: memberId } }).unwrap();
                successCount++;
            } catch {
                failCount++;
            }
        }

        const failMessage = failCount > 0 ? ` ${failCount} failed.` : '';
        Toast.show({
            type: failCount > 0 ? 'info' : 'success',
            text1: 'Bulk Reassignment',
            text2: `${successCount} tasks updated.${failMessage}`,
        });

        setSelectedTaskIds(new Set());
        setBulkSelectMode(false);
    };

    const handleBulkDelete = async () => {
        setBulkDeleteDialogVisible(false);
        let successCount = 0;
        let failCount = 0;
        const idsToDelete = Array.from(selectedTaskIds);

        for (const id of idsToDelete) {
            try {
                await deleteTask(id).unwrap();
                successCount++;
            } catch {
                failCount++;
            }
        }

        const failMessage = failCount > 0 ? ` ${failCount} failed.` : '';
        Toast.show({
            type: failCount > 0 ? 'info' : 'success',
            text1: 'Bulk Deletion',
            text2: `${successCount} tasks deleted.${failMessage}`,
        });

        setSelectedTaskIds(new Set());
        setBulkSelectMode(false);
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
                text2: 'Invitation sent successfully!',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.data?.message || 'Failed to send invitation',
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



    const handleStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
        try {
            await updateTask({ id: taskId, data: { status: newStatus } }).unwrap();
            setStatusMenuVisible(null);
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to update status',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {renderTasksListHelper({
                isLoading,
                refreshing,
                error,
                tasks,
                tagFilter,
                setTagFilter,
                theme,
                mobileSortBy,
                mobileSortDir,
                setMobileSortBy,
                setMobileSortDir,
                getSortedFilteredTasks: () => getSortedFilteredTasksHelper(tasks, tagFilter, mobileSortBy, mobileSortDir),
                onRefresh,
                refetchTasks,
                renderTaskItem: (item: any) => renderTaskItemHelper({
                    item,
                    theme,
                    currentUserId,
                    isAdmin,
                    members,
                    bulkSelectMode,
                    selectedTaskIds,
                    handleSelectTask,
                    openTaskSheet,
                    menuVisible,
                    setMenuVisible,
                    openDeleteDialog,
                    statusMenuVisible,
                    setStatusMenuVisible,
                    handleStatusChange,
                    handleEditTask,
                })
            })}

            <Portal>
                {renderCreateTaskModalHelper({
                    visible,
                    onDismiss: hideModal,
                    theme,
                    editingTask,
                    templates,
                    handleSelectTemplate,
                    taskTitle,
                    setTaskTitle,
                    taskDesc,
                    setTaskDesc,
                    dueDate,
                    setDueDate,
                    showDatePicker,
                    setShowDatePicker,
                    tagPrefix,
                    handlePrefixChange,
                    tagNumber,
                    handleNumberChange,
                    projectTag,
                    tasks,
                    showModalTagList,
                    setShowModalTagList,
                    applyExistingTag,
                    showAssigneeList,
                    setShowAssigneeList,
                    assignedTo,
                    setAssignedTo,
                    members,
                    isAdmin,
                    priority,
                    setPriority,
                    onSubmit: handleCreateTask,
                    isCreating,
                })}

                {renderDeleteTaskDialogHelper({
                    visible: deleteDialogVisible,
                    setVisible: setDeleteDialogVisible,
                    onDelete: handleDeleteTask,
                    theme,
                })}

                {renderInviteMemberModalHelper({
                    visible: memberModalVisible,
                    setVisible: setMemberModalVisible,
                    memberEmail,
                    setMemberEmail,
                    onInvite: handleAddMember,
                    theme,
                })}

                {renderMembersListModalHelper({
                    visible: membersListModalVisible,
                    setVisible: setMembersListModalVisible,
                    members,
                    theme,
                    isAdmin,
                    currentUserId,
                    onRemoveMember: handleRemoveMember,
                    onOpenInvite: () => {
                        setMembersListModalVisible(false);
                        setMemberModalVisible(true);
                    },
                })}

                {renderBulkReassignModalHelper({
                    visible: bulkAssignVisible,
                    setVisible: setBulkAssignVisible,
                    members,
                    theme,
                    onAssign: handleBulkAssign,
                })}

                {renderBulkDeleteDialogHelper({
                    visible: bulkDeleteDialogVisible,
                    setVisible: setBulkDeleteDialogVisible,
                    count: selectedTaskIds.size,
                    onDelete: handleBulkDelete,
                    theme,
                })}
            </Portal>

            {!bulkSelectMode && (
                <PaperFAB
                    style={styles.fab}
                    icon="plus"
                    onPress={showModal}
                    label="New Task"
                />
            )}

            {/* Bulk Actions Panel at the Bottom */}
            {bulkSelectMode && selectedTaskIds.size > 0 && renderBulkActionsPanelHelper({
                selectedCount: selectedTaskIds.size,
                theme,
                statusMenuVisible: bulkStatusMenuVisible,
                setStatusMenuVisible: setBulkStatusMenuVisible,
                onStatusChange: handleBulkStatusChange,
                priorityMenuVisible: bulkPriorityMenuVisible,
                setPriorityMenuVisible: setBulkPriorityMenuVisible,
                onPriorityChange: handleBulkPriorityChange,
                onOpenAssign: () => setBulkAssignVisible(true),
                isAdmin,
                onOpenDelete: () => setBulkDeleteDialogVisible(true),
                onCancel: () => {
                    setSelectedTaskIds(new Set());
                    setBulkSelectMode(false);
                },
            })}
        </View>

        <TaskDetailSheet
            task={selectedTask}
            groupId={groupId}
            members={members?.map((m: any) => ({ userId: m.userId, name: m.name, role: m.role }))}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onClose={closeTaskSheet}
            sheetRef={sheetRef}
            allTasks={tasks}
        />
        </GestureHandlerRootView>
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
        rowGap: 6,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#6200ee',
        marginRight: 8,
        flexShrink: 0,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 5,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    liveText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    bulkActionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopWidth: 1,
        elevation: 8,
    },
});

export default GroupDetailsScreen;
