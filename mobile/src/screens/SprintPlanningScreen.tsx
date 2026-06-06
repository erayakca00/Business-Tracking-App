/* eslint-disable react-native/no-inline-styles */
import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Text, Card, FAB as PaperFAB, Portal, Modal, TextInput, Button, ActivityIndicator, Chip, Divider, useTheme, IconButton, Dialog } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import {
    useGetSprintsByGroupQuery,
    useGetBacklogByGroupQuery,
    useCreateSprintMutation,
    useUpdateSprintMutation,
    useDeleteSprintMutation,
    useStartSprintMutation,
    useCompleteSprintMutation,
    useAddTaskToSprintMutation,
    useRemoveTaskFromSprintMutation,
    Sprint
} from '../services/sprintsApi';
import { useGetGroupMembersQuery } from '../services/groupsApi';
import TaskDetailSheet, { TaskForSheet } from '../components/TaskDetailSheet';

type RouteParams = {
    SprintPlanning: {
        groupId: string;
        groupName?: string;
    };
};

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

const SprintPlanningScreen = () => {
    const theme = useTheme();
    const route = useRoute<RouteProp<RouteParams, 'SprintPlanning'>>();
    const { groupId } = route.params;

    const { user } = useSelector((state: RootState) => state.auth);
    const currentUserId = user?.id;

    // Queries
    const { data: sprints = [], isLoading: sprintsLoading, refetch: refetchSprints } = useGetSprintsByGroupQuery(groupId);
    const { data: backlog = [], isLoading: backlogLoading, refetch: refetchBacklog } = useGetBacklogByGroupQuery(groupId);
    const { data: members = [] } = useGetGroupMembersQuery(groupId);

    // Mutations
    const [createSprint, { isLoading: isCreating }] = useCreateSprintMutation();
    const [updateSprint, { isLoading: isUpdating }] = useUpdateSprintMutation();
    const [deleteSprint] = useDeleteSprintMutation();
    const [startSprint] = useStartSprintMutation();
    const [completeSprint] = useCompleteSprintMutation();
    const [addTaskToSprint] = useAddTaskToSprintMutation();
    const [removeTaskFromSprint] = useRemoveTaskFromSprintMutation();

    const isAdmin = useMemo(() => {
        const mem = members.find((m: any) => m.userId === currentUserId);
        return mem?.role === 'admin';
    }, [members, currentUserId]);

    const activeSprint = useMemo(() => sprints.find(s => s.status === 'active'), [sprints]);
    const plannedSprints = useMemo(() => sprints.filter(s => s.status === 'planned'), [sprints]);
    const completedSprints = useMemo(() => sprints.filter(s => s.status === 'completed'), [sprints]);

    // UI state
    const [activeTab, setActiveTab] = useState<'sprints' | 'backlog'>('sprints');
    const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
    const [refreshing, setRefreshing] = useState(false);

    // Form modals
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [formName, setFormName] = useState('');
    const [formGoal, setFormGoal] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Dialog confirmations
    const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Task Details Sheet
    const sheetRef = useRef<BottomSheet>(null);
    const [selectedTask, setSelectedTask] = useState<TaskForSheet | null>(null);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchSprints(), refetchBacklog()]);
        setRefreshing(false);
    };

    const handleOpenCreate = () => {
        setEditingSprint(null);
        setFormName('');
        setFormGoal('');
        setFormStartDate('');
        setFormEndDate('');
        setModalVisible(true);
    };

    const handleOpenEdit = (sprint: Sprint) => {
        setEditingSprint(sprint);
        setFormName(sprint.name);
        setFormGoal(sprint.goal || '');
        setFormStartDate(sprint.startDate ? sprint.startDate.split('T')[0] : '');
        setFormEndDate(sprint.endDate ? sprint.endDate.split('T')[0] : '');
        setModalVisible(true);
    };

    const handleSaveSprint = async () => {
        if (!formName.trim()) {
            Toast.show({ type: 'error', text1: 'Validation', text2: 'Sprint name is required' });
            return;
        }
        try {
            const body = {
                name: formName,
                goal: formGoal || undefined,
                startDate: formStartDate ? new Date(formStartDate).toISOString() : undefined,
                endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
            };
            if (editingSprint) {
                await updateSprint({ sprintId: editingSprint.id, data: body }).unwrap();
                Toast.show({ type: 'success', text1: 'Success', text2: 'Sprint updated!' });
            } else {
                await createSprint({ groupId, data: body }).unwrap();
                Toast.show({ type: 'success', text1: 'Success', text2: 'Sprint created!' });
            }
            setModalVisible(false);
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err.data?.message || 'Failed to save sprint' });
        }
    };

    const handleStartSprint = async (sprintId: string) => {
        try {
            await startSprint(sprintId).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Sprint started!' });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed', text2: err.data?.message || 'Error occurred' });
        }
    };

    const handleCompleteSprint = async () => {
        if (!confirmCompleteId) return;
        try {
            await completeSprint(confirmCompleteId).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Sprint completed! Incomplete tasks returned to backlog.' });
            setConfirmCompleteId(null);
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed', text2: err.data?.message || 'Error occurred' });
        }
    };

    const handleDeleteSprint = async () => {
        if (!confirmDeleteId) return;
        try {
            await deleteSprint(confirmDeleteId).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Sprint deleted!' });
            setConfirmDeleteId(null);
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed', text2: err.data?.message || 'Error occurred' });
        }
    };

    const handleAddTaskToSprint = async (sprintId: string, taskId: string) => {
        try {
            await addTaskToSprint({ sprintId, taskId }).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Task added to sprint' });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed', text2: err.data?.message || 'Error occurred' });
        }
    };

    const handleRemoveTaskFromSprint = async (sprintId: string, taskId: string) => {
        try {
            await removeTaskFromSprint({ sprintId, taskId }).unwrap();
            Toast.show({ type: 'success', text1: 'Success', text2: 'Task moved to backlog' });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed', text2: err.data?.message || 'Error occurred' });
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedSprints(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const openTaskSheet = (task: any) => {
        setSelectedTask(task);
        sheetRef.current?.expand();
    };

    // Calculate days remaining
    const getDaysRemaining = (endDateStr: string) => {
        const diff = new Date(endDateStr).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const allTasksForSheet = useMemo(() => {
        const sprintTasks = sprints.flatMap(s => s.tasks || []);
        return [...backlog, ...sprintTasks];
    }, [backlog, sprints]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Custom Tabs */}
                <View style={[styles.tabBar, { borderBottomColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('sprints')}
                        style={[styles.tabBtn, activeTab === 'sprints' && { borderBottomColor: theme.colors.primary }]}
                    >
                        <Text style={[styles.tabText, activeTab === 'sprints' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                            Sprints ({sprints.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('backlog')}
                        style={[styles.tabBtn, activeTab === 'backlog' && { borderBottomColor: theme.colors.primary }]}
                    >
                        <Text style={[styles.tabText, activeTab === 'backlog' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                            Backlog ({backlog.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                {(sprintsLoading || backlogLoading) && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                        }
                    >
                        {activeTab === 'sprints' ? (
                            <SprintsList
                                sprints={sprints}
                                activeSprint={activeSprint}
                                plannedSprints={plannedSprints}
                                completedSprints={completedSprints}
                                expandedSprints={expandedSprints}
                                toggleExpand={toggleExpand}
                                handleOpenEdit={handleOpenEdit}
                                setConfirmCompleteId={setConfirmCompleteId}
                                handleRemoveTaskFromSprint={handleRemoveTaskFromSprint}
                                openTaskSheet={openTaskSheet}
                                getDaysRemaining={getDaysRemaining}
                                isAdmin={isAdmin}
                                theme={theme}
                                handleStartSprint={handleStartSprint}
                                setConfirmDeleteId={setConfirmDeleteId}
                            />
                        ) : (
                            <BacklogList
                                backlog={backlog}
                                sprints={sprints}
                                isAdmin={isAdmin}
                                theme={theme}
                                openTaskSheet={openTaskSheet}
                                handleAddTaskToSprint={handleAddTaskToSprint}
                            />
                        )}
                    </ScrollView>
                )}

                {/* FAB to create Sprints */}
                {isAdmin && activeTab === 'sprints' && (
                    <PaperFAB
                        style={styles.fab}
                        icon="plus"
                        onPress={handleOpenCreate}
                        label="New Sprint"
                    />
                )}

                {/* Portal items */}
                <SprintPlanningModals
                    theme={theme}
                    modalVisible={modalVisible}
                    setModalVisible={setModalVisible}
                    editingSprint={editingSprint}
                    formName={formName}
                    setFormName={setFormName}
                    formGoal={formGoal}
                    setFormGoal={setFormGoal}
                    formStartDate={formStartDate}
                    setFormStartDate={setFormStartDate}
                    formEndDate={formEndDate}
                    setFormEndDate={setFormEndDate}
                    showStartPicker={showStartPicker}
                    setShowStartPicker={setShowStartPicker}
                    showEndPicker={showEndPicker}
                    setShowEndPicker={setShowEndPicker}
                    isCreating={isCreating}
                    isUpdating={isUpdating}
                    handleSaveSprint={handleSaveSprint}
                    confirmCompleteId={confirmCompleteId}
                    setConfirmCompleteId={setConfirmCompleteId}
                    handleCompleteSprint={handleCompleteSprint}
                    confirmDeleteId={confirmDeleteId}
                    setConfirmDeleteId={setConfirmDeleteId}
                    handleDeleteSprint={handleDeleteSprint}
                />
            </View>

            {/* Task Detail Sheet */}
            <TaskDetailSheet
                task={selectedTask}
                members={members.map((m: any) => ({ userId: m.userId, name: m.name, role: m.role }))}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onClose={() => setSelectedTask(null)}
                sheetRef={sheetRef}
                allTasks={allTasksForSheet}
                onTaskUpdated={() => {
                    refetchSprints();
                    refetchBacklog();
                }}
            />
        </GestureHandlerRootView>
    );
};

// ── BacklogList Helper Component ──────────────────────────────────────────────
interface BacklogListProps {
    backlog: any[];
    sprints: Sprint[];
    isAdmin: boolean;
    theme: any;
    openTaskSheet: (task: any) => void;
    handleAddTaskToSprint: (sprintId: string, taskId: string) => void;
}

const BacklogList = ({
    backlog,
    sprints,
    isAdmin,
    theme,
    openTaskSheet,
    handleAddTaskToSprint,
}: BacklogListProps) => {
    if (backlog.length === 0) {
        return (
            <View style={styles.emptyState}>
                <IconButton icon="check-all" size={48} iconColor={theme.colors.outline} />
                <Text style={{ color: theme.colors.outline }}>Backlog is Empty!</Text>
                <Text style={{ color: theme.colors.outline, fontSize: 12 }}>All tasks have been assigned to sprints.</Text>
            </View>
        );
    }

    const showSprintSelectionAlert = (task: any) => {
        const nonCompleted = sprints.filter(s => s.status !== 'completed');
        Alert.alert(
            'Add to Sprint',
            'Select target sprint:',
            nonCompleted.map(s => ({
                text: s.name,
                onPress: () => handleAddTaskToSprint(s.id, task.id)
            })).concat({ text: 'Cancel', style: 'cancel' } as any)
        );
    };

    return (
        <View style={styles.backlogList}>
            {backlog.map(task => (
                <Card key={task.id} style={styles.taskCard} onPress={() => openTaskSheet(task)}>
                    <Card.Content style={styles.taskCardContent}>
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyLarge" style={{ fontWeight: '600' }} numberOfLines={1}>
                                {task.title}
                            </Text>
                            <View style={styles.taskBadges}>
                                {task.projectTag && (
                                    <Chip compact textStyle={{ fontSize: 9 }} style={{ backgroundColor: theme.colors.tertiaryContainer }}>
                                        📁 {task.projectTag}
                                    </Chip>
                                )}
                                <Chip compact textStyle={{ color: '#fff', fontSize: 9 }} style={{ backgroundColor: getPriorityColor(task.priority) }}>
                                    {task.priority}
                                </Chip>
                                {task.effortScore !== undefined && task.effortScore !== null && (
                                    <Chip compact textStyle={{ fontSize: 9 }} style={{ backgroundColor: theme.colors.primaryContainer }}>
                                        {task.effortScore} pts
                                    </Chip>
                                )}
                            </View>
                        </View>

                        {/* Assign Task to Sprint Menu Dropdown */}
                        {isAdmin && sprints.some(s => s.status !== 'completed') && (
                            <Button
                                mode="text"
                                compact
                                onPress={() => showSprintSelectionAlert(task)}
                            >
                                + Sprint
                            </Button>
                        )}
                    </Card.Content>
                </Card>
            ))}
        </View>
    );
};

// ── SprintsList Helper Component ──────────────────────────────────────────────
interface SprintsListProps {
    sprints: Sprint[];
    activeSprint?: Sprint;
    plannedSprints: Sprint[];
    completedSprints: Sprint[];
    expandedSprints: Set<string>;
    toggleExpand: (id: string) => void;
    handleOpenEdit: (sprint: Sprint) => void;
    setConfirmCompleteId: (id: string) => void;
    handleRemoveTaskFromSprint: (sprintId: string, taskId: string) => void;
    openTaskSheet: (task: any) => void;
    getDaysRemaining: (endDateStr: string) => number | null;
    isAdmin: boolean;
    theme: any;
    handleStartSprint: (sprintId: string) => void;
    setConfirmDeleteId: (id: string) => void;
}

const SprintsList = ({
    sprints,
    activeSprint,
    plannedSprints,
    completedSprints,
    expandedSprints,
    toggleExpand,
    handleOpenEdit,
    setConfirmCompleteId,
    handleRemoveTaskFromSprint,
    openTaskSheet,
    getDaysRemaining,
    isAdmin,
    theme,
    handleStartSprint,
    setConfirmDeleteId,
}: SprintsListProps) => {
    if (sprints.length === 0) {
        return (
            <View style={styles.emptyState}>
                <IconButton icon="calendar-sync-outline" size={48} iconColor={theme.colors.outline} />
                <Text style={{ color: theme.colors.outline }}>No Sprints Created Yet</Text>
            </View>
        );
    }

    return (
        <View style={styles.sprintsList}>
            {/* Active Sprint Section */}
            {activeSprint && (
                <SprintCard
                    sprint={activeSprint}
                    expanded={expandedSprints.has(activeSprint.id)}
                    onToggle={() => toggleExpand(activeSprint.id)}
                    onEdit={() => handleOpenEdit(activeSprint)}
                    onComplete={() => setConfirmCompleteId(activeSprint.id)}
                    onRemoveTask={(taskId) => handleRemoveTaskFromSprint(activeSprint.id, taskId)}
                    onTaskPress={openTaskSheet}
                    daysRemaining={activeSprint.endDate ? getDaysRemaining(activeSprint.endDate) : null}
                    isAdmin={isAdmin}
                    theme={theme}
                />
            )}

            {/* Planned Sprints */}
            {plannedSprints.length > 0 && (
                <View style={styles.sectionContainer}>
                    <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.outline }]}>PLANNED SPRINTS</Text>
                    {plannedSprints.map(sprint => (
                        <SprintCard
                            key={sprint.id}
                            sprint={sprint}
                            expanded={expandedSprints.has(sprint.id)}
                            onToggle={() => toggleExpand(sprint.id)}
                            onEdit={() => handleOpenEdit(sprint)}
                            onStart={() => handleStartSprint(sprint.id)}
                            onDelete={() => setConfirmDeleteId(sprint.id)}
                            onRemoveTask={(taskId) => handleRemoveTaskFromSprint(sprint.id, taskId)}
                            onTaskPress={openTaskSheet}
                            daysRemaining={null}
                            isAdmin={isAdmin}
                            theme={theme}
                        />
                    ))}
                </View>
            )}

            {/* Completed Sprints */}
            {completedSprints.length > 0 && (
                <View style={styles.sectionContainer}>
                    <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.outline }]}>COMPLETED SPRINTS</Text>
                    {completedSprints.map(sprint => (
                        <SprintCard
                            key={sprint.id}
                            sprint={sprint}
                            expanded={expandedSprints.has(sprint.id)}
                            onToggle={() => toggleExpand(sprint.id)}
                            onDelete={() => setConfirmDeleteId(sprint.id)}
                            onRemoveTask={() => {}}
                            onTaskPress={openTaskSheet}
                            daysRemaining={null}
                            isAdmin={isAdmin}
                            theme={theme}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

// ── SprintPlanningModals Helper Component ─────────────────────────────────────
interface SprintPlanningModalsProps {
    theme: any;
    modalVisible: boolean;
    setModalVisible: (v: boolean) => void;
    editingSprint: Sprint | null;
    formName: string;
    setFormName: (n: string) => void;
    formGoal: string;
    setFormGoal: (g: string) => void;
    formStartDate: string;
    setFormStartDate: (d: string) => void;
    formEndDate: string;
    setFormEndDate: (d: string) => void;
    showStartPicker: boolean;
    setShowStartPicker: (b: boolean) => void;
    showEndPicker: boolean;
    setShowEndPicker: (b: boolean) => void;
    isCreating: boolean;
    isUpdating: boolean;
    handleSaveSprint: () => void;
    confirmCompleteId: string | null;
    setConfirmCompleteId: (id: string | null) => void;
    handleCompleteSprint: () => void;
    confirmDeleteId: string | null;
    setConfirmDeleteId: (id: string | null) => void;
    handleDeleteSprint: () => void;
}

const SprintPlanningModals = ({
    theme,
    modalVisible,
    setModalVisible,
    editingSprint,
    formName,
    setFormName,
    formGoal,
    setFormGoal,
    formStartDate,
    setFormStartDate,
    formEndDate,
    setFormEndDate,
    showStartPicker,
    setShowStartPicker,
    showEndPicker,
    setShowEndPicker,
    isCreating,
    isUpdating,
    handleSaveSprint,
    confirmCompleteId,
    setConfirmCompleteId,
    handleCompleteSprint,
    confirmDeleteId,
    setConfirmDeleteId,
    handleDeleteSprint,
}: SprintPlanningModalsProps) => {
    return (
        <Portal>
            {/* Create/Edit Sprint Modal */}
            <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
                <Text variant="titleLarge" style={{ marginBottom: 15 }}>
                    {editingSprint ? 'Edit Sprint' : 'Create New Sprint'}
                </Text>
                <TextInput
                    label="Sprint Name *"
                    value={formName}
                    onChangeText={setFormName}
                    style={[styles.input, { backgroundColor: theme.colors.surface }]}
                />
                <TextInput
                    label="Sprint Goal"
                    value={formGoal}
                    onChangeText={setFormGoal}
                    multiline
                    numberOfLines={3}
                    style={[styles.input, { minHeight: 60, backgroundColor: theme.colors.surface }]}
                />
                <TouchableOpacity onPress={() => setShowStartPicker(true)}>
                    <View pointerEvents="none">
                        <TextInput
                            label="Start Date"
                            value={formStartDate}
                            editable={false}
                            placeholder="YYYY-MM-DD"
                            right={<TextInput.Icon icon="calendar" />}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        />
                    </View>
                </TouchableOpacity>
                {showStartPicker && (
                    <DateTimePicker
                        value={formStartDate ? new Date(formStartDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            setShowStartPicker(false);
                            if (date) {
                                setFormStartDate(date.toISOString().split('T')[0]);
                            }
                        }}
                    />
                )}

                <TouchableOpacity onPress={() => setShowEndPicker(true)}>
                    <View pointerEvents="none">
                        <TextInput
                            label="End Date"
                            value={formEndDate}
                            editable={false}
                            placeholder="YYYY-MM-DD"
                            right={<TextInput.Icon icon="calendar" />}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        />
                    </View>
                </TouchableOpacity>
                {showEndPicker && (
                    <DateTimePicker
                        value={formEndDate ? new Date(formEndDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            setShowEndPicker(false);
                            if (date) {
                                setFormEndDate(date.toISOString().split('T')[0]);
                            }
                        }}
                    />
                )}

                <Button mode="contained" onPress={handleSaveSprint} loading={isCreating || isUpdating} style={styles.saveBtn}>
                    {editingSprint ? 'Save Changes' : 'Create Sprint'}
                </Button>
            </Modal>

            {/* Sprint Completion Confirmation Dialog */}
            <Dialog visible={confirmCompleteId !== null} onDismiss={() => setConfirmCompleteId(null)} style={{ backgroundColor: theme.colors.surface }}>
                <Dialog.Title>Complete Sprint?</Dialog.Title>
                <Dialog.Content>
                    <Text>Are you sure you want to complete this sprint? All unfinished tasks will be returned to the product backlog.</Text>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setConfirmCompleteId(null)}>Cancel</Button>
                    <Button onPress={handleCompleteSprint} textColor="green">Complete</Button>
                </Dialog.Actions>
            </Dialog>

            {/* Sprint Deletion Confirmation Dialog */}
            <Dialog visible={confirmDeleteId !== null} onDismiss={() => setConfirmDeleteId(null)} style={{ backgroundColor: theme.colors.surface }}>
                <Dialog.Title>Delete Sprint?</Dialog.Title>
                <Dialog.Content>
                    <Text>Are you sure you want to delete this sprint? All tasks inside will be returned to the backlog.</Text>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setConfirmDeleteId(null)}>Cancel</Button>
                    <Button onPress={handleDeleteSprint} textColor="red">Delete</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

// ── SprintCard Helper Component ──────────────────────────────────────────────
interface SprintCardProps {
    sprint: Sprint;
    expanded: boolean;
    onToggle: () => void;
    onEdit?: () => void;
    onStart?: () => void;
    onComplete?: () => void;
    onDelete?: () => void;
    onRemoveTask: (taskId: string) => void;
    onTaskPress: (task: any) => void;
    daysRemaining: number | null;
    isAdmin: boolean;
    theme: any;
}

const SprintCard = ({
    sprint, expanded, onToggle, onEdit, onStart, onComplete, onDelete, onRemoveTask, onTaskPress, daysRemaining, isAdmin, theme
}: SprintCardProps) => {
    const total = sprint.tasks?.length || 0;
    const done = sprint.tasks?.filter((t: any) => t.status === 'done').length || 0;
    const progress = total > 0 ? done / total : 0;

    const getStatusColorLabel = () => {
        switch (sprint.status) {
            case 'active': return '#4CAF50';
            case 'completed': return '#9E9E9E';
            default: return '#2196F3';
        }
    };

    return (
        <Card style={[styles.sprintCard, sprint.status === 'active' && { borderColor: '#4CAF50', borderWidth: 1 }]}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Chip compact textStyle={{ fontSize: 9, color: '#fff' }} style={{ backgroundColor: getStatusColorLabel() }}>
                                {sprint.status.toUpperCase()}
                            </Chip>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{sprint.name}</Text>
                        </View>
                        {sprint.goal ? <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>{sprint.goal}</Text> : null}
                    </View>

                    {/* Expand/Collapse Chevron */}
                    <IconButton
                        icon={expanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        onPress={onToggle}
                        style={{ margin: 0 }}
                    />
                </View>

                {/* Dates & Days Remaining */}
                <View style={styles.cardMeta}>
                    {sprint.startDate && sprint.endDate && (
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                            📅 {new Date(sprint.startDate).toLocaleDateString()} — {new Date(sprint.endDate).toLocaleDateString()}
                        </Text>
                    )}
                    {sprint.status === 'active' && daysRemaining !== null && (
                        <Text variant="bodySmall" style={{ fontWeight: 'bold', color: daysRemaining < 0 ? '#F44336' : '#4CAF50' }}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                        </Text>
                    )}
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        Progress: {done}/{total} tasks ({Math.round(progress * 100)}%)
                    </Text>
                    {total > 0 && (
                        <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: '#4CAF50' }]} />
                        </View>
                    )}
                </View>

                {/* Controls */}
                {isAdmin && (
                    <View style={styles.cardControls}>
                        {sprint.status === 'planned' && onStart && (
                            <Button icon="play" mode="text" compact onPress={onStart}>Start</Button>
                        )}
                        {sprint.status === 'active' && onComplete && (
                            <Button icon="check-all" mode="text" compact onPress={onComplete}>Complete</Button>
                        )}
                        {sprint.status !== 'completed' && onEdit && (
                            <Button icon="pencil" mode="text" compact onPress={onEdit}>Edit</Button>
                        )}
                        {sprint.status !== 'active' && onDelete && (
                            <Button icon="delete-outline" mode="text" compact textColor={theme.colors.error} onPress={onDelete}>Delete</Button>
                        )}
                    </View>
                )}

                {/* Tasks inside sprint list (Collapsible) */}
                {expanded && (
                    <View style={styles.tasksListCollapsible}>
                        <Divider style={{ marginVertical: 10 }} />
                        {total === 0 ? (
                            <Text style={styles.noTasksText}>No tasks in this sprint</Text>
                        ) : (
                            sprint.tasks?.map((task: any) => (
                                <TouchableOpacity key={task.id} onPress={() => onTaskPress(task)} style={styles.collapsedTaskRow}>
                                    <View style={[styles.taskStatusDot, { backgroundColor: getStatusColor(task.status) }]} />
                                    <Text style={[styles.collapsedTaskTitle, task.status === 'done' && { textDecorationLine: 'line-through', color: '#888' }]}>
                                        {task.title}
                                    </Text>
                                    {isAdmin && sprint.status !== 'completed' && (
                                        <IconButton
                                            icon="close"
                                            size={14}
                                            iconColor={theme.colors.error}
                                            onPress={() => onRemoveTask(task.id)}
                                            style={{ margin: 0 }}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </Card.Content>
        </Card>
    );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        height: 48,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    scrollContainer: {
        padding: 15,
        paddingBottom: 80,
    },
    sprintsList: {
        gap: 12,
    },
    sectionContainer: {
        marginTop: 15,
        gap: 10,
    },
    sectionHeader: {
        fontWeight: 'bold',
        fontSize: 11,
        letterSpacing: 1,
    },
    sprintCard: {
        marginBottom: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    progressContainer: {
        marginTop: 10,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        marginTop: 4,
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    cardControls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 10,
    },
    tasksListCollapsible: {
        marginTop: 5,
    },
    collapsedTaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    taskStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    collapsedTaskTitle: {
        flex: 1,
        fontSize: 13,
    },
    noTasksText: {
        fontStyle: 'italic',
        color: '#999',
        fontSize: 12,
        textAlign: 'center',
        paddingVertical: 5,
    },
    backlogList: {
        gap: 10,
    },
    taskCard: {
        elevation: 1,
    },
    taskCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    taskBadges: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
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
    saveBtn: {
        marginTop: 20,
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
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
});

export default SprintPlanningScreen;
