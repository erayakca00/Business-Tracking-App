/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, IconButton, Divider } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
    useGetGroupAnalyticsQuery,
    useGetGroupTimeReportQuery,
    useGetSprintBurndownQuery
} from '../services/sprintsApi';

type RouteParams = {
    Analytics: {
        groupId: string;
    };
};

const STATUS_COLORS: Record<string, string> = {
    todo: '#3B82F6',        // Blue
    in_progress: '#F59E0B', // Amber
    review: '#8B5CF6',      // Purple
    done: '#10B981',        // Emerald
    blocked: '#EF4444',     // Rose
};

const STATUS_LABELS: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'In Review',
    done: 'Done',
    blocked: 'Blocked'
};

const AnalyticsScreen = () => {
    const theme = useTheme();
    const route = useRoute<RouteProp<RouteParams, 'Analytics'>>();
    const { groupId } = route.params;

    // Fetch queries
    const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useGetGroupAnalyticsQuery(groupId);
    const { data: timeReport = [], isLoading: timeLoading, refetch: refetchTime } = useGetGroupTimeReportQuery(groupId);

    const activeSprintId = analytics?.activeSprint?.id;
    const { data: burndown = [], isLoading: burndownLoading, refetch: refetchBurndown } = useGetSprintBurndownQuery(activeSprintId ?? '', {
        skip: !activeSprintId,
    });

    const isRefreshing = false;

    const onRefresh = async () => {
        await Promise.all([
            refetchAnalytics(),
            refetchTime(),
            activeSprintId ? refetchBurndown() : Promise.resolve(),
        ]);
    };

    // Calculate aggregated metrics
    const totalTasks = useMemo(() => {
        if (!analytics?.statusBreakdown) return 0;
        return Object.values(analytics.statusBreakdown).reduce((a: any, b: any) => a + b, 0) as number;
    }, [analytics]);

    const completedTasks = analytics?.statusBreakdown?.done || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Time Log totals & groupings
    const timeTotals = useMemo(() => {
        let totalSec = 0;
        const memberSec: Record<string, number> = {};
        const taskSec: Record<string, number> = {};

        timeReport.forEach(log => {
            const duration = log.duration || 0;
            totalSec += duration;

            const name = log.user?.name || 'Unknown';
            memberSec[name] = (memberSec[name] || 0) + duration;

            const title = log.task?.title || 'Unknown Task';
            taskSec[title] = (taskSec[title] || 0) + duration;
        });

        const sortedTasks = Object.entries(taskSec)
            .map(([title, sec]) => ({ title, hours: Math.round((sec / 3600) * 10) / 10 }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);

        return {
            totalHours: Math.round((totalSec / 3600) * 10) / 10,
            members: Object.entries(memberSec).map(([name, sec]) => ({ name, hours: Math.round((sec / 3600) * 10) / 10 })),
            topTasks: sortedTasks,
        };
    }, [timeReport]);

    // Member Workloads
    const memberWorkloads = useMemo(() => {
        if (!analytics?.memberWorkload) return [];
        return Object.entries(analytics.memberWorkload).map(([name, count]) => ({
            name,
            count: count as number,
        })).sort((a, b) => b.count - a.count);
    }, [analytics]);

    if (analyticsLoading || timeLoading || (activeSprintId && burndownLoading)) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 15, color: theme.colors.outline }}>Analyzing project statistics...</Text>
            </View>
        );
    }

    const maxWorkload = memberWorkloads.length > 0 ? Math.max(...memberWorkloads.map(m => m.count)) : 0;
    const maxMemberHours = timeTotals.members.length > 0 ? Math.max(...timeTotals.members.map(m => m.hours)) : 0;
    const maxTaskHours = timeTotals.topTasks.length > 0 ? Math.max(...timeTotals.topTasks.map(t => t.hours)) : 0;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
        >
            {/* KPI Cards Row */}
            <View style={styles.kpiRow}>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <IconButton icon="clipboard-text-outline" size={24} iconColor={theme.colors.primary} style={styles.kpiIcon} />
                        <Text variant="headlineMedium" style={styles.kpiValue}>{totalTasks}</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Total Tasks</Text>
                    </Card.Content>
                </Card>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <IconButton icon="check-circle-outline" size={24} iconColor="#10B981" style={styles.kpiIcon} />
                        <Text variant="headlineMedium" style={styles.kpiValue}>{completedTasks}</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Completed</Text>
                    </Card.Content>
                </Card>
            </View>

            <View style={styles.kpiRow}>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <IconButton icon="percent" size={24} iconColor="#8B5CF6" style={styles.kpiIcon} />
                        <Text variant="headlineMedium" style={styles.kpiValue}>{completionRate}%</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Completion Rate</Text>
                    </Card.Content>
                </Card>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <IconButton icon="clock-outline" size={24} iconColor="#F59E0B" style={styles.kpiIcon} />
                        <Text variant="headlineMedium" style={styles.kpiValue}>{timeTotals.totalHours}h</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Logged Hours</Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Active Sprint Banner */}
            <Card style={styles.chartCard}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.chartTitle}>Active Sprint Status</Text>
                    <Divider style={{ marginVertical: 8 }} />
                    {analytics?.activeSprint ? (
                        <View style={{ gap: 4 }}>
                            <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{analytics.activeSprint.name}</Text>
                            {analytics.activeSprint.goal && <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Goal: {analytics.activeSprint.goal}</Text>}
                            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                                Ends {new Date(analytics.activeSprint.endDate).toLocaleDateString()}
                            </Text>
                        </View>
                    ) : (
                        <Text style={{ fontStyle: 'italic', color: theme.colors.outline }}>No Active Sprint</Text>
                    )}
                </Card.Content>
            </Card>

            {/* Status Breakdown Bar chart */}
            <Card style={styles.chartCard}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.chartTitle}>Task Status Breakdown</Text>
                    <Divider style={{ marginVertical: 8 }} />
                    {totalTasks === 0 ? (
                        <Text style={styles.noData}>No tasks logged in this group</Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {Object.entries(analytics?.statusBreakdown || {}).map(([status, count]) => {
                                const cnt = count as number;
                                return (
                                    <ProgressBarRow
                                        key={status}
                                        label={STATUS_LABELS[status] || status}
                                        value={cnt}
                                        max={totalTasks}
                                        color={STATUS_COLORS[status] || '#9CA3AF'}
                                        subtitle={`${cnt} tasks (${Math.round((cnt / totalTasks) * 100)}%)`}
                                        theme={theme}
                                    />
                                );
                            })}
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Member Workload Bar chart */}
            <Card style={styles.chartCard}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.chartTitle}>Member Workload</Text>
                    <Divider style={{ marginVertical: 8 }} />
                    {memberWorkloads.length === 0 ? (
                        <Text style={styles.noData}>No workloads registered</Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {memberWorkloads.map(m => (
                                <ProgressBarRow
                                    key={m.name}
                                    label={m.name}
                                    value={m.count}
                                    max={maxWorkload}
                                    color={theme.colors.primary}
                                    subtitle={`${m.count} open tasks`}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Time Logged per Member */}
            <Card style={styles.chartCard}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.chartTitle}>Logged Hours per Member</Text>
                    <Divider style={{ marginVertical: 8 }} />
                    {timeTotals.members.length === 0 ? (
                        <Text style={styles.noData}>No logged hours tracked yet</Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {timeTotals.members.map(m => (
                                <ProgressBarRow
                                    key={m.name}
                                    label={m.name}
                                    value={m.hours}
                                    max={maxMemberHours}
                                    color="#10B981"
                                    subtitle={`${m.hours} hours`}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Top Tasks by Time Spent */}
            <Card style={styles.chartCard}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.chartTitle}>Top Tasks by Time Spent</Text>
                    <Divider style={{ marginVertical: 8 }} />
                    {timeTotals.topTasks.length === 0 ? (
                        <Text style={styles.noData}>No time logged on tasks</Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {timeTotals.topTasks.map(t => (
                                <ProgressBarRow
                                    key={t.title}
                                    label={t.title}
                                    value={t.hours}
                                    max={maxTaskHours}
                                    color="#F59E0B"
                                    subtitle={`${t.hours} hours`}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Active Sprint Burndown Table */}
            {activeSprintId && (
                <Card style={styles.chartCard}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.chartTitle}>Burndown Snapshot</Text>
                        <Divider style={{ marginVertical: 8 }} />
                        {burndown.length === 0 ? (
                            <Text style={styles.noData}>No burndown snapshots recorded yet. Snapshots trigger daily.</Text>
                        ) : (
                            <View style={styles.burndownTable}>
                                <View style={styles.tableHeaderRow}>
                                    <Text style={styles.tableHeadCell}>Day</Text>
                                    <Text style={styles.tableHeadCell}>Ideal</Text>
                                    <Text style={styles.tableHeadCell}>Actual</Text>
                                </View>
                                {burndown.map((snap: any, index: number) => (
                                    <View key={snap.id || index} style={styles.tableBodyRow}>
                                        <Text style={styles.tableBodyCell}>
                                            {snap.date ? new Date(snap.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : `Day ${index + 1}`}
                                        </Text>
                                        <Text style={styles.tableBodyCell}>{snap.idealRemainingTasks ?? snap.idealTasks}</Text>
                                        <Text style={styles.tableBodyCell}>{snap.actualRemainingTasks ?? snap.remainingTasks}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Card.Content>
                </Card>
            )}
        </ScrollView>
    );
};

// ── ProgressBarRow Helper Chart Component ─────────────────────────────────────
interface ProgressBarRowProps {
    label: string;
    value: number;
    max: number;
    color: string;
    subtitle: string;
    theme: any;
}

const ProgressBarRow = ({ label, value, max, color, subtitle, theme }: ProgressBarRowProps) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <View style={styles.barRow}>
            <View style={styles.barLabels}>
                <Text style={{ fontWeight: '600', fontSize: 13 }}>{label}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.outline }}>{subtitle}</Text>
            </View>
            <View style={[styles.barBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 15,
        paddingBottom: 40,
        gap: 12,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    kpiRow: {
        flexDirection: 'row',
        gap: 12,
    },
    kpiCard: {
        flex: 1,
        elevation: 1,
    },
    kpiContent: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    kpiIcon: {
        margin: 0,
    },
    kpiValue: {
        fontWeight: 'bold',
        marginVertical: 2,
    },
    chartCard: {
        elevation: 1,
    },
    chartTitle: {
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    barRow: {
        marginVertical: 4,
    },
    barLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        alignItems: 'center',
    },
    barBg: {
        height: 8,
        borderRadius: 4,
        width: '100%',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    noData: {
        textAlign: 'center',
        color: '#888',
        fontStyle: 'italic',
        paddingVertical: 20,
        fontSize: 13,
    },
    burndownTable: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f1f1f1',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    tableHeadCell: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 12,
        color: '#333',
    },
    tableBodyRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    tableBodyCell: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
    },
});

export default AnalyticsScreen;
