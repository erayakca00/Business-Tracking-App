/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text, TextInput, IconButton, Chip, Divider, useTheme, Button, Menu, Portal, Modal } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import {
    useGetCommentsQuery,
    useAddCommentMutation,
    useDeleteCommentMutation,
    useGetTaskActivityQuery,
} from '../services/commentsApi';
import {
    useUpdateTaskMutation,
    useAddDependencyMutation,
    useRemoveDependencyMutation,
    useStartTimeLogMutation,
    useStopTimeLogMutation,
    useAddManualTimeLogMutation,
    useGetTimeLogsQuery,
    useSummarizeTaskMutation,
    Task,
    TimeLog,
} from '../services/tasksApi';
import Toast from 'react-native-toast-message';
import AttachmentsSection from './AttachmentsSection';
import { useCreateTemplateMutation } from '../services/templatesApi';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatusType = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriorityType = 'low' | 'medium' | 'high';

export interface TaskForSheet {
    id: string;
    title: string;
    description?: string;
    status: TaskStatusType;
    priority: TaskPriorityType;
    dueDate?: string;
    projectTag?: string;
    effort?: number;
    assignedToId?: string;
    createdAt: string;
    updatedAt: string;
    blockedBy?: Task[];
    blocking?: Task[];
    aiSummary?: string;
    aiSummaryUpdatedAt?: string;
}

interface TaskDetailSheetProps {
    task: TaskForSheet | null;
    groupId?: string;
    members?: Array<{ userId: string; name: string; role: string }>;
    currentUserId?: string;
    isAdmin?: boolean;
    onClose: () => void;
    sheetRef: React.RefObject<BottomSheet | null>;
    allTasks?: Task[];
    onTaskUpdated?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { key: TaskStatusType; label: string; icon: string }[] = [
    { key: 'todo', label: 'To Do', icon: 'circle-outline' },
    { key: 'in_progress', label: 'In Progress', icon: 'progress-clock' },
    { key: 'review', label: 'In Review', icon: 'eye-outline' },
    { key: 'done', label: 'Done', icon: 'check-circle-outline' },
    { key: 'blocked', label: 'Blocked', icon: 'alert-octagon-outline' },
];

const PRIORITY_OPTIONS: { key: TaskPriorityType; label: string }[] = [
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
];

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

const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

const getActivityLabel = (type: string, data?: { from?: string; to?: string }): string => {
    switch (type) {
        case 'created': return 'created this task';
        case 'status_changed': return `changed status: ${data?.from?.replaceAll('_', ' ')} → ${data?.to?.replaceAll('_', ' ')}`;
        case 'priority_changed': return `changed priority: ${data?.from} → ${data?.to}`;
        case 'title_changed': return `renamed: "${data?.from}" → "${data?.to}"`;
        case 'description_changed': return 'updated the description';
        case 'due_date_changed': return `set deadline to ${data?.to ? formatDate(data.to) : 'none'}`;
        case 'tag_changed': return `changed tag: ${data?.from || '—'} → ${data?.to || '—'}`;
        case 'effort_changed': return `changed effort: ${data?.from} → ${data?.to}`;
        default: return type.replaceAll('_', ' ');
    }
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ name, size = 32, color }: { name: string; size?: number; color?: string }) => {
    const theme = useTheme();
    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || theme.colors.primaryContainer }]}>
            <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: size * 0.38, fontWeight: 'bold' }}>
                {getInitials(name)}
            </Text>
        </View>
    );
};

// ─── Tab selector ─────────────────────────────────────────────────────────────

const TAB_LABELS = ['Details', 'Comments', 'Activity', 'Files'] as const;
type Tab = typeof TAB_LABELS[number];

// ─── Main Component ───────────────────────────────────────────────────────────

const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
    task,
    groupId,
    members = [],
    currentUserId,
    isAdmin = false,
    onClose,
    sheetRef,
    allTasks = [],
    onTaskUpdated,
}) => {
    const theme = useTheme();
    const snapPoints = useMemo(() => ['60%', '92%'], []);
    const [activeTab, setActiveTab] = useState<Tab>('Details');
    const [commentText, setCommentText] = useState('');
    const [statusMenuVisible, setStatusMenuVisible] = useState(false);
    const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);

    const { user } = useSelector((state: RootState) => state.auth);

    const { data: comments = [], isLoading: commentsLoading } = useGetCommentsQuery(task?.id ?? '', {
        skip: !task,
    });
    const { data: activity = [], isLoading: activityLoading } = useGetTaskActivityQuery(task?.id ?? '', {
        skip: !task || activeTab !== 'Activity',
    });

    // Time Logs Query & Mutations
    const { data: timeLogs = [], isLoading: logsLoading } = useGetTimeLogsQuery(task?.id ?? '', {
        skip: !task,
    });

    const [addComment, { isLoading: isPosting }] = useAddCommentMutation();
    const [deleteComment] = useDeleteCommentMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [addDependency] = useAddDependencyMutation();
    const [removeDependency] = useRemoveDependencyMutation();
    const [startTimeLog, { isLoading: isStartingTimer }] = useStartTimeLogMutation();
    const [stopTimeLog, { isLoading: isStoppingTimer }] = useStopTimeLogMutation();
    const [addManualTimeLog, { isLoading: isLoggingManual }] = useAddManualTimeLogMutation();
    const [createTemplate, { isLoading: isCreatingTemplate }] = useCreateTemplateMutation();
    const [summarizeTask, { isLoading: isSummarizing }] = useSummarizeTaskMutation();

    const handleSummarize = async () => {
        if (!task) return;
        try {
            await summarizeTask(task.id).unwrap();
            Toast.show({ type: 'success', text1: 'Summary generated!' });
            onTaskUpdated?.();
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to generate summary',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Local form state
    const [timerNote, setTimerNote] = useState('');
    const [manualHours, setManualHours] = useState('');
    const [manualMinutes, setManualMinutes] = useState('');
    const [manualNote, setManualNote] = useState('');

    const [blockerModalVisible, setBlockerModalVisible] = useState(false);
    const [blockerSearchQuery, setBlockerSearchQuery] = useState('');

    const activeTimer = useMemo(
        () => timeLogs.find((log: TimeLog) => log.userId === currentUserId && !log.endedAt),
        [timeLogs, currentUserId]
    );

    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (activeTimer) {
            const start = new Date(activeTimer.startedAt).getTime();
            const updateElapsed = () => {
                const now = Date.now();
                setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
            };
            updateElapsed();
            interval = setInterval(updateElapsed, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTimer]);

    const formatDuration = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return [
            hrs.toString().padStart(2, '0'),
            mins.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0'),
        ].join(':');
    };

    const assigneeName = useMemo(
        () => members.find(m => m.userId === task?.assignedToId)?.name,
        [members, task?.assignedToId]
    );

    const canEdit = useMemo(
        () => isAdmin || task?.assignedToId === currentUserId,
        [isAdmin, task?.assignedToId, currentUserId]
    );

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) onClose();
    }, [onClose]);

    const handlePostComment = async () => {
        if (!commentText.trim() || !task) return;
        try {
            await addComment({ taskId: task.id, content: commentText.trim() }).unwrap();
            setCommentText('');
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to post comment' });
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await deleteComment(commentId).unwrap();
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete comment' });
        }
    };

    const handleStatusChange = async (status: TaskStatusType) => {
        if (!task || !canEdit) return;
        setStatusMenuVisible(false);
        try {
            await updateTask({ id: task.id, data: { status } }).unwrap();
            onTaskUpdated?.();
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to update status',
                text2: err.data?.message || '',
            });
        }
    };

    const handlePriorityChange = async (priority: TaskPriorityType) => {
        if (!task || !canEdit) return;
        setPriorityMenuVisible(false);
        try {
            await updateTask({ id: task.id, data: { priority } }).unwrap();
            onTaskUpdated?.();
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to update priority' });
        }
    };

    const handleAddBlocker = async (blockingTaskId: string) => {
        if (!task) return;
        setBlockerModalVisible(false);
        setBlockerSearchQuery('');
        try {
            await addDependency({ id: task.id, blockingTaskId }).unwrap();
            Toast.show({ type: 'success', text1: 'Blocker added successfully!' });
            onTaskUpdated?.();
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to add blocker',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const handleRemoveBlocker = async (blockingId: string) => {
        if (!task) return;
        try {
            await removeDependency({ id: task.id, blockingId }).unwrap();
            Toast.show({ type: 'success', text1: 'Blocker removed successfully!' });
            onTaskUpdated?.();
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to remove blocker',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const handleStartTimer = async () => {
        if (!task) return;
        try {
            await startTimeLog({ id: task.id, note: timerNote.trim() || undefined }).unwrap();
            setTimerNote('');
            Toast.show({ type: 'success', text1: 'Timer started!' });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to start timer',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const handleStopTimer = async () => {
        if (!task) return;
        try {
            await stopTimeLog(task.id).unwrap();
            Toast.show({ type: 'success', text1: 'Timer stopped!' });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to stop timer',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const handleLogManualTime = async () => {
        if (!task) return;
        const hours = Number.parseInt(manualHours || '0', 10);
        const minutes = Number.parseInt(manualMinutes || '0', 10);
        const durationSeconds = (hours * 3600) + (minutes * 60);

        if (Number.isNaN(durationSeconds) || durationSeconds <= 0) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please log a valid duration greater than 0 minutes',
            });
            return;
        }

        try {
            await addManualTimeLog({
                id: task.id,
                durationSeconds,
                note: manualNote.trim() || undefined,
            }).unwrap();
            setManualHours('');
            setManualMinutes('');
            setManualNote('');
            Toast.show({ type: 'success', text1: 'Time logged successfully!' });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to log time',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!templateName.trim() || !task || !groupId) return;
        try {
            await createTemplate({
                groupId,
                data: {
                    name: templateName.trim(),
                    taskId: task.id,
                },
            }).unwrap();
            setTemplateModalVisible(false);
            setTemplateName('');
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Template saved successfully!',
            });
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Failed to save template',
                text2: err.data?.message || 'Error occurred',
            });
        }
    };

    const eligibleTasks = useMemo(() => {
        if (!allTasks || !task) return [];
        return allTasks.filter(
            (t: Task) =>
                t.id !== task.id &&
                !task.blockedBy?.some((b: Task) => b.id === t.id) &&
                (blockerSearchQuery.trim() === '' ||
                    t.title.toLowerCase().includes(blockerSearchQuery.toLowerCase()))
        );
    }, [allTasks, task, blockerSearchQuery]);

    const activeBlockers = useMemo(
        () => task?.blockedBy?.filter((b: Task) => b.status !== 'done') || [],
        [task?.blockedBy]
    );

    const isBlocked = activeBlockers.length > 0;

    if (!task) return null;

    // ─── Details Tab ─────────────────────────────────────────────────────────

    // ─── Details Tab ─────────────────────────────────────────────────────────

    const renderBlockedWarningBanner = () => {
        if (!isBlocked) return null;
        return (
            <View style={[styles.blockedBanner, { backgroundColor: '#FFEBEE' }]}>
                <IconButton icon="alert-octagon" iconColor="#D32F2F" size={24} style={{ margin: 0 }} />
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#C62828', fontWeight: 'bold' }}>
                        This task is currently blocked
                    </Text>
                    <Text style={{ color: '#C62828', fontSize: 12 }}>
                        Active blockers: {activeBlockers.map((b: Task) => b.title).join(', ')}
                    </Text>
                </View>
            </View>
        );
    };

    const renderStatusAndPriorityRow = () => {
        return (
            <View style={styles.badgeRow}>
                <Menu
                    visible={statusMenuVisible}
                    onDismiss={() => setStatusMenuVisible(false)}
                    anchor={
                        <TouchableOpacity onPress={() => canEdit && setStatusMenuVisible(true)} activeOpacity={canEdit ? 0.7 : 1}>
                            <Chip
                                style={[styles.statusChip, { backgroundColor: getStatusColor(task.status) }]}
                                textStyle={styles.chipText}
                                icon="circle-outline"
                            >
                                {task.status.replaceAll('_', ' ')}
                            </Chip>
                        </TouchableOpacity>
                    }
                >
                    {STATUS_OPTIONS.map(opt => {
                        const isOptionDisabled = isBlocked && opt.key !== 'todo' && opt.key !== 'blocked';
                        return (
                            <Menu.Item
                                key={opt.key}
                                leadingIcon={opt.icon}
                                onPress={() => handleStatusChange(opt.key)}
                                title={opt.label}
                                disabled={isOptionDisabled}
                            />
                        );
                    })}
                </Menu>

                <Menu
                    visible={priorityMenuVisible}
                    onDismiss={() => setPriorityMenuVisible(false)}
                    anchor={
                        <TouchableOpacity onPress={() => canEdit && setPriorityMenuVisible(true)} activeOpacity={canEdit ? 0.7 : 1} style={{ marginLeft: 8 }}>
                            <Chip
                                style={[styles.statusChip, { backgroundColor: getPriorityColor(task.priority) }]}
                                textStyle={styles.chipText}
                                icon="flag-outline"
                            >
                                {task.priority}
                            </Chip>
                        </TouchableOpacity>
                    }
                >
                    {PRIORITY_OPTIONS.map(opt => (
                        <Menu.Item
                            key={opt.key}
                            onPress={() => handlePriorityChange(opt.key)}
                            title={opt.label}
                        />
                    ))}
                </Menu>

                {task.projectTag && (
                    <Chip style={[styles.statusChip, { backgroundColor: theme.colors.tertiaryContainer, marginLeft: 8 }]} textStyle={{ fontSize: 11 }} icon="folder">
                        {task.projectTag}
                    </Chip>
                )}
            </View>
        );
    };

    const renderDescriptionSection = () => {
        if (task.description) {
            return (
                <View style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>DESCRIPTION</Text>
                    <Text style={[styles.descriptionText, { color: theme.colors.onSurface }]}>{task.description}</Text>
                </View>
            );
        }
        return (
            <View style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>DESCRIPTION</Text>
                <Text style={{ color: theme.colors.outline, fontStyle: 'italic' }}>No description provided.</Text>
            </View>
        );
    };

    const renderAISummaryContent = () => {
        const primaryColor = theme.dark ? '#D1C4E9' : '#5E35B1';
        const outlineColor = theme.dark ? '#B39DDB' : theme.colors.outline;
        const textColor = theme.dark ? '#FFFFFF' : theme.colors.onSurface;
        const buttonBorderColor = theme.dark ? '#7E57C2' : '#5E35B1';

        if (isSummarizing) {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                    <ActivityIndicator size="small" color={primaryColor} style={{ marginRight: 8 }} />
                    <Text style={{ color: primaryColor, fontSize: 12 }}>Generating summary...</Text>
                </View>
            );
        }
        if (task.aiSummary) {
            return (
                <View>
                    <Text style={[styles.descriptionText, { color: textColor, fontSize: 13, lineHeight: 19 }]}>{task.aiSummary}</Text>
                    {task.aiSummaryUpdatedAt ? (
                        <Text style={{ fontSize: 9, color: outlineColor, marginTop: 6 }}>
                            Generated {formatDate(task.aiSummaryUpdatedAt)} at {formatTime(task.aiSummaryUpdatedAt)}
                        </Text>
                    ) : null}
                </View>
            );
        }
        return (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ color: outlineColor, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
                    Generate a quick 3-sentence summary of the task's progress, activities, and comments.
                </Text>
                <Button
                    mode="outlined"
                    compact
                    onPress={handleSummarize}
                    icon="creation"
                    textColor={primaryColor}
                    style={{ borderColor: buttonBorderColor, borderRadius: 8 }}
                    labelStyle={{ fontSize: 12 }}
                >
                    Summarize with AI
                </Button>
            </View>
        );
    };

    const renderAISummarySection = () => {
        const bg = theme.dark ? '#311B92' : '#EDE7F6';
        const border = theme.dark ? '#7E57C2' : '#D1C4E9';
        const textCol = theme.dark ? '#D1C4E9' : '#5E35B1';
        const linkCol = theme.dark ? '#B39DDB' : theme.colors.primary;

        return (
            <View style={[styles.section, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.sectionLabel, { color: textCol, marginBottom: 0 }]}>✨ AI TASK SUMMARY</Text>
                    {task.aiSummary && !isSummarizing ? (
                        <TouchableOpacity onPress={handleSummarize}>
                            <Text style={{ color: linkCol, fontSize: 11, fontWeight: 'bold' }}>Regenerate</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                {renderAISummaryContent()}
            </View>
        );
    };

    const renderMetaInfoGrid = () => {
        return (
            <View style={styles.metaGrid}>
                <View style={[styles.metaItem, { backgroundColor: theme.colors.surface }]}>
                    <IconButton icon="account-outline" size={18} iconColor={theme.colors.primary} style={styles.metaIcon} />
                    <View>
                        <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Assignee</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                            {assigneeName || 'Unassigned'}
                        </Text>
                    </View>
                </View>

                {task.dueDate && (
                    <View style={[styles.metaItem, { backgroundColor: theme.colors.surface }]}>
                        <IconButton icon="calendar-outline" size={18} iconColor={theme.colors.primary} style={styles.metaIcon} />
                        <View>
                            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Deadline</Text>
                            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                                {formatDate(task.dueDate)}
                            </Text>
                        </View>
                    </View>
                )}

                {task.effort !== undefined && task.effort !== null && (
                    <View style={[styles.metaItem, { backgroundColor: theme.colors.surface }]}>
                        <IconButton icon="speedometer" size={18} iconColor={theme.colors.primary} style={styles.metaIcon} />
                        <View>
                            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Effort</Text>
                            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                                {task.effort} / 10
                            </Text>
                        </View>
                    </View>
                )}

                <View style={[styles.metaItem, { backgroundColor: theme.colors.surface }]}>
                    <IconButton icon="clock-outline" size={18} iconColor={theme.colors.primary} style={styles.metaIcon} />
                    <View>
                        <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Created</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                            {formatDate(task.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderDependenciesSection = () => {
        return (
            <>
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitleLabel, { color: theme.colors.onSurface }]}>Dependencies</Text>
                    {canEdit && allTasks && allTasks.length > 0 && (
                        <Button
                            compact
                            mode="text"
                            onPress={() => setBlockerModalVisible(true)}
                            icon="plus"
                        >
                            Add Blocker
                        </Button>
                    )}
                </View>

                <View style={styles.dependencyContainer}>
                    {/* Blocked By List */}
                    <Text style={styles.subSectionLabel}>Blocked By</Text>
                    {(!task.blockedBy || task.blockedBy.length === 0) ? (
                        <Text style={styles.emptyText}>No blockers. This task is free to start!</Text>
                    ) : (
                        task.blockedBy.map(b => (
                            <View key={b.id} style={styles.dependencyItem}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    <Chip
                                        compact
                                        style={{ backgroundColor: getStatusColor(b.status), marginRight: 6 }}
                                        textStyle={{ fontSize: 9, color: '#fff', textTransform: 'capitalize' }}
                                    >
                                        {b.status}
                                    </Chip>
                                    <Text style={styles.dependencyTitle} numberOfLines={1}>{b.title}</Text>
                                </View>
                                {canEdit && (
                                    <IconButton
                                        icon="close-circle-outline"
                                        size={20}
                                        iconColor={theme.colors.error}
                                        onPress={() => handleRemoveBlocker(b.id)}
                                        style={{ margin: 0 }}
                                    />
                                )}
                            </View>
                        ))
                    )}

                    {/* Blocking List */}
                    <Text style={[styles.subSectionLabel, { marginTop: 12 }]}>Blocking</Text>
                    {(!task.blocking || task.blocking.length === 0) ? (
                        <Text style={styles.emptyText}>Not blocking any other tasks.</Text>
                    ) : (
                        task.blocking.map(b => (
                            <View key={b.id} style={styles.dependencyItem}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    <Chip
                                        compact
                                        style={{ backgroundColor: getStatusColor(b.status), marginRight: 6 }}
                                        textStyle={{ fontSize: 9, color: '#fff', textTransform: 'capitalize' }}
                                    >
                                        {b.status}
                                    </Chip>
                                    <Text style={styles.dependencyTitle} numberOfLines={1}>{b.title}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </>
        );
    };

    const renderLogHistory = () => {
        if (logsLoading) {
            return <ActivityIndicator style={{ marginVertical: 10 }} />;
        }
        if (timeLogs.length === 0) {
            return <Text style={styles.emptyText}>No time logged yet.</Text>;
        }
        return timeLogs.map((log: TimeLog) => (
            <View key={log.id} style={[styles.logRow, { borderBottomColor: theme.colors.outlineVariant }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.colors.onSurface }}>
                        {log.user?.name || 'Someone'}
                    </Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                        {log.duration ? formatDuration(log.duration) : 'Active'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.outline }}>
                        {formatDate(log.startedAt)} · {formatTime(log.startedAt)}
                    </Text>
                    {log.endedAt ? (
                        <Text style={{ fontSize: 11, color: theme.colors.outline }}>
                            to {formatTime(log.endedAt)}
                        </Text>
                    ) : (
                        <Text style={{ fontSize: 11, color: '#D32F2F', fontWeight: 'bold' }}>
                            Running...
                        </Text>
                    )}
                </View>
                {log.note ? (
                    <Text style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                        "{log.note}"
                    </Text>
                ) : null}
            </View>
        ));
    };

    const renderTimeTrackingSection = () => {
        return (
            <>
                <Text style={[styles.sectionTitleLabel, { color: theme.colors.onSurface, marginBottom: 12 }]}>Time Tracking</Text>

                {/* Active Timer Banner / Live Stopwatch */}
                {activeTimer ? (
                    <View style={[styles.activeTimerBanner, { backgroundColor: '#E8F5E9' }]}>
                        <IconButton icon="play-circle" iconColor="#4CAF50" size={28} style={{ margin: 0 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                                Timer Running
                            </Text>
                            {activeTimer.note ? (
                                <Text style={{ color: '#2E7D32', fontSize: 11 }} numberOfLines={1}>
                                    "{activeTimer.note}"
                                </Text>
                            ) : null}
                        </View>
                        <Text style={[styles.stopwatchText, { color: '#2E7D32' }]}>
                            {formatDuration(elapsedSeconds)}
                        </Text>
                        <Button
                            mode="contained"
                            onPress={handleStopTimer}
                            loading={isStoppingTimer}
                            style={{ marginLeft: 10, backgroundColor: '#D32F2F' }}
                            textColor="#fff"
                        >
                            Stop
                        </Button>
                    </View>
                ) : (
                    <View style={styles.startTimerRow}>
                        <TextInput
                            mode="outlined"
                            dense
                            label="Timer note (optional)"
                            placeholder="What are you working on?"
                            value={timerNote}
                            onChangeText={setTimerNote}
                            style={{ flex: 1, height: 40, backgroundColor: theme.colors.surface }}
                        />
                        <Button
                            mode="contained"
                            onPress={handleStartTimer}
                            loading={isStartingTimer}
                            icon="play"
                            style={{ marginLeft: 8, height: 40, justifyContent: 'center' }}
                        >
                            Start
                        </Button>
                    </View>
                )}

                {/* Manual Logging Form */}
                <View style={[styles.manualLogCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                        Log Time Manually
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <TextInput
                            mode="outlined"
                            dense
                            label="Hours"
                            keyboardType="numeric"
                            value={manualHours}
                            onChangeText={setManualHours}
                            style={{ flex: 1, backgroundColor: theme.colors.surface }}
                        />
                        <TextInput
                            mode="outlined"
                            dense
                            label="Minutes"
                            keyboardType="numeric"
                            value={manualMinutes}
                            onChangeText={setManualMinutes}
                            style={{ flex: 1, backgroundColor: theme.colors.surface }}
                        />
                    </View>
                    <TextInput
                        mode="outlined"
                        dense
                        label="Log note (optional)"
                        value={manualNote}
                        onChangeText={setManualNote}
                        style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
                    />
                    <Button
                        mode="outlined"
                        onPress={handleLogManualTime}
                        loading={isLoggingManual}
                        icon="clock-plus"
                    >
                        Log Time
                    </Button>
                </View>

                {/* Historical Logs List */}
                <Text style={[styles.subSectionLabel, { marginTop: 16, marginBottom: 8 }]}>Log History</Text>
                {renderLogHistory()}
            </>
        );
    };

    const renderDetails = () => (
        <BottomSheetScrollView contentContainerStyle={styles.tabContent}>
            {renderBlockedWarningBanner()}
            {renderStatusAndPriorityRow()}
            {renderDescriptionSection()}
            {renderAISummarySection()}
            {renderMetaInfoGrid()}

            <Divider style={{ marginVertical: 16 }} />

            {renderDependenciesSection()}

            <Divider style={{ marginVertical: 16 }} />

            {renderTimeTrackingSection()}
            {isAdmin && (
                <>
                    <Divider style={{ marginVertical: 16 }} />
                    <Button
                        mode="contained-tonal"
                        onPress={() => setTemplateModalVisible(true)}
                        icon="file-document-outline"
                        style={{ marginBottom: 16 }}
                    >
                        Save as Template
                    </Button>
                </>
            )}
        </BottomSheetScrollView>
    );

    // ─── Comments Tab ─────────────────────────────────────────────────────────

    const renderCommentsList = () => {
        if (commentsLoading) {
            return <ActivityIndicator style={{ marginTop: 30 }} />;
        }
        if (comments.length === 0) {
            return (
                <View style={styles.emptyTab}>
                    <IconButton icon="chat-outline" size={42} iconColor={theme.colors.outline} />
                    <Text style={{ color: theme.colors.outline }}>No comments yet. Be the first!</Text>
                </View>
            );
        }
        return (
            <BottomSheetScrollView contentContainerStyle={styles.tabContent}>
                {comments.map(c => (
                    <View key={c.id} style={[styles.commentRow, { borderColor: theme.colors.outlineVariant }]}>
                        <Avatar name={c.author?.name || '?'} size={34} />
                        <View style={styles.commentBody}>
                            <View style={styles.commentHeader}>
                                <Text style={[styles.commentAuthor, { color: theme.colors.onSurface }]}>
                                    {c.author?.name}
                                </Text>
                                <Text style={[styles.commentTime, { color: theme.colors.outline }]}>
                                    {formatDate(c.createdAt)} · {formatTime(c.createdAt)}
                                </Text>
                            </View>
                            <Text style={[styles.commentContent, { color: theme.colors.onSurfaceVariant }]}>
                                {c.content}
                            </Text>
                        </View>
                        {c.userId === user?.id && (
                            <IconButton
                                icon="delete-outline"
                                size={18}
                                iconColor={theme.colors.error}
                                onPress={() => handleDeleteComment(c.id)}
                                style={{ margin: 0, alignSelf: 'flex-start' }}
                            />
                        )}
                    </View>
                ))}
            </BottomSheetScrollView>
        );
    };

    const renderComments = () => (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={120}
        >
            {renderCommentsList()}

            {/* Comment Input */}
            <View style={[styles.commentInputRow, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
                <Avatar name={user?.name || '?'} size={30} />
                <TextInput
                    style={[styles.commentInput, { backgroundColor: theme.colors.surfaceVariant }]}
                    placeholder="Write a comment…"
                    placeholderTextColor={theme.colors.outline}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    dense
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    outlineColor="transparent"
                    mode="flat"
                />
                <IconButton
                    icon="send"
                    size={22}
                    iconColor={commentText.trim() ? theme.colors.primary : theme.colors.outline}
                    onPress={handlePostComment}
                    disabled={!commentText.trim() || isPosting}
                    style={{ margin: 0 }}
                />
            </View>
        </KeyboardAvoidingView>
    );

    // ─── Activity Tab ─────────────────────────────────────────────────────────

    const renderActivity = () => {
        if (activityLoading) {
            return <ActivityIndicator style={{ marginTop: 30 }} />;
        }
        if (activity.length === 0) {
            return (
                <View style={styles.emptyTab}>
                    <IconButton icon="history" size={42} iconColor={theme.colors.outline} />
                    <Text style={{ color: theme.colors.outline }}>No activity yet.</Text>
                </View>
            );
        }
        return (
            <BottomSheetScrollView contentContainerStyle={styles.tabContent}>
                {activity.map((entry, idx) => (
                    <View key={entry.id} style={styles.activityRow}>
                        {/* Timeline line */}
                        <View style={styles.activityTimeline}>
                            <View style={[styles.activityDot, { backgroundColor: theme.colors.primary }]} />
                            {idx < activity.length - 1 && (
                                <View style={[styles.activityLine, { backgroundColor: theme.colors.outlineVariant }]} />
                            )}
                        </View>
                        <View style={styles.activityContent}>
                            <Text style={[styles.activityActor, { color: theme.colors.onSurface }]}>
                                {entry.actor?.name || 'Someone'}
                                <Text style={{ fontWeight: 'normal', color: theme.colors.onSurfaceVariant }}>
                                    {' '}{getActivityLabel(entry.type, entry.data)}
                                </Text>
                            </Text>
                            <Text style={[styles.activityTime, { color: theme.colors.outline }]}>
                                {formatDate(entry.createdAt)} · {formatTime(entry.createdAt)}
                            </Text>
                        </View>
                    </View>
                ))}
            </BottomSheetScrollView>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <BottomSheet
                ref={sheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                onChange={handleSheetChange}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
            >
                <View style={styles.sheetContainer}>
                    {/* ── Header ── */}
                    <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                        <View style={{ flex: 1 }}>
                            <Text
                                numberOfLines={2}
                                style={[styles.sheetTitle, { color: theme.colors.onSurface }]}
                            >
                                {task.title}
                            </Text>
                        </View>
                        <IconButton
                            icon="close"
                            size={22}
                            onPress={() => {
                                sheetRef.current?.close();
                                onClose();
                            }}
                            style={{ margin: 0 }}
                        />
                    </View>

                    {/* ── Tab Bar ── */}
                    <View style={[styles.tabBar, { borderBottomColor: theme.colors.outlineVariant }]}>
                        {TAB_LABELS.map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabItem, activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabLabel, {
                                    color: activeTab === tab ? theme.colors.primary : theme.colors.onSurfaceVariant,
                                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                                }]}>
                                    {tab}
                                    {tab === 'Comments' && comments.length > 0 ? ` (${comments.length})` : ''}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Tab Content ── */}
                    <View style={{ flex: 1 }}>
                        {activeTab === 'Details' && renderDetails()}
                        {activeTab === 'Comments' && renderComments()}
                        {activeTab === 'Activity' && renderActivity()}
                        {activeTab === 'Files' && (
                            <BottomSheetScrollView contentContainerStyle={styles.tabContent}>
                                <AttachmentsSection
                                    taskId={task.id}
                                    currentUserId={currentUserId}
                                />
                            </BottomSheetScrollView>
                        )}
                    </View>
                </View>
            </BottomSheet>

            {/* Blocker Search/Add Modal */}
            <Portal>
                <Modal
                    visible={blockerModalVisible}
                    onDismiss={() => { setBlockerModalVisible(false); setBlockerSearchQuery(''); }}
                    contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
                >
                    <Text variant="titleLarge" style={{ marginBottom: 12 }}>Add Blocker Task</Text>
                    <TextInput
                        label="Search tasks..."
                        mode="outlined"
                        value={blockerSearchQuery}
                        onChangeText={setBlockerSearchQuery}
                        style={styles.searchInput}
                    />
                    <ScrollView style={{ maxHeight: 300 }}>
                        {eligibleTasks.length === 0 ? (
                            <Text style={styles.emptyText}>No eligible blocker tasks found.</Text>
                        ) : (
                            eligibleTasks.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={styles.taskSelectItem}
                                    onPress={() => handleAddBlocker(t.id)}
                                >
                                    <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{t.title}</Text>
                                    {t.projectTag && (
                                        <Text style={{ fontSize: 11, color: theme.colors.outline }}>
                                            Tag: {t.projectTag}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                    <Button
                        mode="outlined"
                        style={{ marginTop: 16 }}
                        onPress={() => { setBlockerModalVisible(false); setBlockerSearchQuery(''); }}
                    >
                        Cancel
                    </Button>
                </Modal>

                {/* Save as Template Modal */}
                <Modal
                    visible={templateModalVisible}
                    onDismiss={() => { setTemplateModalVisible(false); setTemplateName(''); }}
                    contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
                >
                    <Text variant="titleLarge" style={{ marginBottom: 12 }}>Save as Template</Text>
                    <TextInput
                        label="Template Name"
                        mode="outlined"
                        value={templateName}
                        onChangeText={setTemplateName}
                        style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <Button
                            mode="outlined"
                            onPress={() => { setTemplateModalVisible(false); setTemplateName(''); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            loading={isCreatingTemplate}
                            onPress={handleSaveAsTemplate}
                        >
                            Save
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    sheetContainer: {
        flex: 1,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabLabel: {
        fontSize: 13,
    },
    tabContent: {
        padding: 16,
        paddingBottom: 32,
    },
    // Details
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 14,
    },
    statusChip: {
        height: 30,
        borderRadius: 15,
    },
    chipText: {
        fontSize: 11,
        color: '#fff',
        textTransform: 'capitalize',
    },
    section: {
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 6,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 21,
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingRight: 14,
        paddingVertical: 6,
        width: '47%',
        elevation: 1,
    },
    metaIcon: {
        margin: 0,
    },
    metaLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 1,
    },
    // Comments
    commentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    commentBody: {
        flex: 1,
        marginLeft: 10,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    commentAuthor: {
        fontWeight: 'bold',
        fontSize: 13,
    },
    commentTime: {
        fontSize: 11,
    },
    commentContent: {
        fontSize: 13,
        lineHeight: 19,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        gap: 8,
    },
    commentInput: {
        flex: 1,
        maxHeight: 80,
        borderRadius: 20,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    // Activity
    activityRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    activityTimeline: {
        width: 20,
        alignItems: 'center',
        marginRight: 12,
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 4,
    },
    activityLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    activityContent: {
        flex: 1,
        paddingBottom: 8,
    },
    activityActor: {
        fontSize: 13,
        fontWeight: 'bold',
        lineHeight: 18,
    },
    activityTime: {
        fontSize: 11,
        marginTop: 2,
    },
    // Shared
    avatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    // Phase 7 Styling
    blockedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitleLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    dependencyContainer: {
        paddingLeft: 4,
    },
    subSectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
    },
    dependencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    dependencyTitle: {
        fontSize: 13,
        flex: 1,
    },
    emptyText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        paddingVertical: 4,
    },
    activeTimerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    stopwatchText: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    startTimerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    manualLogCard: {
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    logRow: {
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 10,
        maxHeight: '80%',
    },
    searchInput: {
        marginBottom: 12,
    },
    taskSelectItem: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
});

export default TaskDetailSheet;
