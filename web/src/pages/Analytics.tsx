import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    BarChart3, 
    TrendingDown, 
    User, 
    Layers,
    Zap
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';
import api from '../services/api';

// Harmonious status colors matching the application's visual style
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

const PRIORITY_BADGES: Record<string, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function Analytics() {
    const { groupId } = useParams<{ groupId: string }>();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const [burndown, setBurndown] = useState<any>(null);
    const [burndownMetric, setBurndownMetric] = useState<'tasks' | 'effort'>('tasks');
    const [timeReport, setTimeReport] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const analyticsRes = await api.get(`/groups/${groupId}/analytics`);
            setAnalytics(analyticsRes.data);

            const timeReportRes = await api.get(`/groups/${groupId}/time-report`);
            setTimeReport(timeReportRes.data);

            if (analyticsRes.data.activeSprint) {
                const burndownRes = await api.get(`/sprints/${analyticsRes.data.activeSprint.id}/burndown`);
                setBurndown(burndownRes.data);
            }
            setError(null);
        } catch (err: any) {
            console.error('Failed to load analytics data', err);
            setError('Could not retrieve analytics data. Make sure you are authorized and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupId]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Analyzing project statistics...</p>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 px-4">
                <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                    <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load Analytics</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'An unexpected error occurred.'}</p>
                    <Link
                        to={`/groups/${groupId}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Group Board
                    </Link>
                </div>
            </div>
        );
    }

    // Pie chart mapping
    const pieData = Object.entries(analytics.statusBreakdown || {})
        .filter(([_, value]) => (value as number) > 0)
        .map(([key, value]) => ({
            name: STATUS_LABELS[key] || key,
            value: value as number,
            color: STATUS_COLORS[key] || '#9CA3AF'
        }));

    // Summary calculations
    const statusCounts = analytics.statusBreakdown || {};
    const totalTasks = Object.values(statusCounts).reduce((a: any, b: any) => a + b, 0) as number;
    const completedTasksCount = statusCounts.done || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

    // Aggregations for Time Logs
    const memberTimeMap: Record<string, number> = {};
    const taskTimeMap: Record<string, number> = {};
    let totalTimeLoggedSeconds = 0;

    timeReport.forEach(log => {
        const duration = log.duration || 0;
        totalTimeLoggedSeconds += duration;

        const memberName = log.user?.name || 'Unknown';
        memberTimeMap[memberName] = (memberTimeMap[memberName] || 0) + duration;

        const taskTitle = log.task?.title || 'Unknown Task';
        taskTimeMap[taskTitle] = (taskTimeMap[taskTitle] || 0) + duration;
    });

    const memberTimeData = Object.entries(memberTimeMap).map(([name, seconds]) => ({
        name,
        hours: Math.round((seconds / 3600) * 10) / 10,
    })).sort((a, b) => b.hours - a.hours);

    const taskTimeData = Object.entries(taskTimeMap).map(([title, seconds]) => ({
        title,
        hours: Math.round((seconds / 3600) * 10) / 10,
    })).sort((a, b) => b.hours - a.hours).slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 flex flex-col pb-12">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm py-4 px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
                <div className="flex items-center space-x-4">
                    <Link
                        to={`/groups/${groupId}`}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title="Back to Group Board"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="text-emerald-500 h-6 w-6" />
                            <h1 className="text-xl font-bold tracking-tight">Project Analytics & Insights</h1>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Visual performance charts, velocities, and workload metrics</p>
                    </div>
                </div>
            </header>

            <main className="max-w-[96%] w-full mx-auto px-4 mt-8 flex-1 flex flex-col space-y-8">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tasks</p>
                            <h3 className="text-3xl font-extrabold mt-1 text-blue-600 dark:text-blue-400">{totalTasks}</h3>
                            <p className="text-xs text-gray-500 mt-1">{completedTasksCount} completed / {totalTasks - completedTasksCount} open</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
                            <Layers size={24} />
                        </div>
                    </div>
 
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completion Rate</p>
                            <h3 className="text-3xl font-extrabold mt-1 text-emerald-500">{completionRate}%</h3>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${completionRate}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
 
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Tasks</p>
                            <h3 className="text-3xl font-extrabold mt-1 text-rose-500">{analytics.overdueTasks?.length || 0}</h3>
                            <p className="text-xs text-gray-500 mt-1">Requires immediate attention</p>
                        </div>
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Time Logged</p>
                            <h3 className="text-3xl font-extrabold mt-1 text-indigo-500">
                                {Math.round((totalTimeLoggedSeconds / 3600) * 10) / 10}h
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Across all group tasks</p>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
                            <Clock size={24} />
                        </div>
                    </div>
 
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Sprint</p>
                            <h3 className="text-lg font-bold mt-1 truncate max-w-[180px]">
                                {analytics.activeSprint ? analytics.activeSprint.name : 'None Active'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {analytics.activeSprint 
                                    ? `Ends ${new Date(analytics.activeSprint.endDate).toLocaleDateString()}` 
                                    : 'Start one in Sprint Planner'}
                            </p>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
                            <Calendar size={24} />
                        </div>
                    </div>
                </div>

                {/* Main Row: Burndown & Status Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Burndown Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingDown className="text-indigo-500 h-5 w-5" />
                                    Active Sprint Burndown Chart
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Ideal linear projection vs. actual daily progress remaining
                                </p>
                            </div>
                            {burndown && burndown.burndownData && burndown.burndownData.length > 0 && (
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
                                    <button
                                        onClick={() => setBurndownMetric('tasks')}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${burndownMetric === 'tasks' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'}`}
                                    >
                                        Tasks
                                    </button>
                                    <button
                                        onClick={() => setBurndownMetric('effort')}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${burndownMetric === 'effort' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'}`}
                                    >
                                        Effort Points
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-h-[300px] flex items-center justify-center">
                            {burndown && burndown.burndownData && burndown.burndownData.length > 0 ? (
                                <div className="w-full h-full min-h-[300px]">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart 
                                            data={burndown.burndownData}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                            <XAxis 
                                                dataKey="date" 
                                                tickFormatter={(str) => {
                                                    try {
                                                        const d = new Date(str);
                                                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                    } catch (e) {
                                                        return str;
                                                    }
                                                }}
                                                stroke="#9CA3AF"
                                                fontSize={11}
                                            />
                                            <YAxis stroke="#9CA3AF" fontSize={11} allowDecimals={false} />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                                labelFormatter={(str) => `Date: ${new Date(str).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Area 
                                                name={burndownMetric === 'tasks' ? 'Remaining Tasks (Actual)' : 'Remaining Effort (Actual)'}
                                                type="monotone" 
                                                dataKey={burndownMetric === 'tasks' ? 'actualTasks' : 'actualEffort'} 
                                                stroke="#8B5CF6" 
                                                strokeWidth={2.5}
                                                fillOpacity={1} 
                                                fill="url(#colorActual)" 
                                                connectNulls={false}
                                            />
                                            <Area 
                                                name={burndownMetric === 'tasks' ? 'Ideal Tasks Burndown' : 'Ideal Effort Burndown'}
                                                type="monotone" 
                                                dataKey={burndownMetric === 'tasks' ? 'idealTasks' : 'idealEffort'} 
                                                stroke="#9CA3AF" 
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                fill="none" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 max-w-sm">
                                    <TrendingDown className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No Burndown Data Available</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Make sure there is an active sprint for this group and daily snapshots have been recorded.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Breakdown (Pie Chart) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <Layers className="text-blue-500 h-5 w-5" />
                            Task Status Breakdown
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Proportionate distribution of tasks by status</p>
                        
                        <div className="flex-1 flex flex-col justify-center items-center">
                            {pieData.length > 0 ? (
                                <>
                                    <div className="w-full h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs font-medium w-full">
                                        {pieData.map((entry, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
                                                <span className="truncate text-gray-600 dark:text-gray-300">{entry.name}:</span>
                                                <span className="font-bold">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-8 text-gray-400">
                                    <Layers className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                    <p className="text-sm">No tasks created yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secondary Row: Velocity & Workload */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Velocity Chart */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <Zap className="text-indigo-500 h-5 w-5" />
                            Sprint Velocity
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Completed tasks and total effort points completed per sprint</p>

                        <div className="flex-1 min-h-[250px] flex items-center justify-center">
                            {analytics.sprintVelocity && analytics.sprintVelocity.length > 0 ? (
                                <div className="w-full h-full min-h-[250px]">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart 
                                            data={analytics.sprintVelocity}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
                                            <YAxis stroke="#9CA3AF" fontSize={11} allowDecimals={false} />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="square" />
                                            <Bar name="Tasks Completed" dataKey="completedTasks" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            <Bar name="Effort Points Completed" dataKey="completedEffort" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 max-w-sm">
                                    <Zap className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No Sprint History Found</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Once sprints are activated and marked completed, your team velocity will be aggregated here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Member Workload */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <User className="text-emerald-500 h-5 w-5" />
                            Member Workload Allocation
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Comparison of open tasks vs. completed tasks per member</p>
 
                        <div className="flex-1 min-h-[250px] flex items-center justify-center">
                            {analytics.memberWorkload && analytics.memberWorkload.length > 0 ? (
                                <div className="w-full h-full min-h-[250px]">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart
                                            data={analytics.memberWorkload}
                                            layout="vertical"
                                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                            <XAxis type="number" stroke="#9CA3AF" fontSize={11} allowDecimals={false} />
                                            <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} width={80} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="square" />
                                            <Bar name="Open Tasks" dataKey="openTasks" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                                            <Bar name="Completed Tasks" dataKey="completedTasks" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-gray-400">
                                    <User className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                    <p className="text-sm">No group members configured</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Time Tracking Analysis Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Time Logged per Member */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <User className="text-blue-500 h-5 w-5" />
                            Time Logged per Member
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Total cumulative hours logged by each member</p>
 
                        <div className="flex-1 min-h-[250px] flex items-center justify-center">
                            {memberTimeData.length > 0 ? (
                                <div className="w-full h-full min-h-[250px]">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart
                                            data={memberTimeData}
                                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
                                            <YAxis stroke="#9CA3AF" fontSize={11} unit="h" />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                            />
                                            <Bar name="Hours Logged" dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-gray-400">
                                    <Clock className="mx-auto h-12 w-12 text-gray-300 mb-2 animate-pulse" />
                                    <p className="text-sm">No time has been logged yet</p>
                                </div>
                            )}
                        </div>
                    </div>
 
                    {/* Time Logged per Task */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <Layers className="text-indigo-500 h-5 w-5" />
                            Top Tasks by Time Spent
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Top 5 tasks with the most cumulative hours logged</p>
 
                        <div className="flex-1 min-h-[250px] flex items-center justify-center">
                            {taskTimeData.length > 0 ? (
                                <div className="w-full h-full min-h-[250px]">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart
                                            data={taskTimeData}
                                            layout="vertical"
                                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                            <XAxis type="number" stroke="#9CA3AF" fontSize={11} unit="h" />
                                            <YAxis dataKey="title" type="category" stroke="#9CA3AF" fontSize={10} width={100} tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.95)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                            />
                                            <Bar name="Hours Logged" dataKey="hours" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-gray-400">
                                    <Layers className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                    <p className="text-sm">No task hours logged yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overdue Tasks List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500 h-5 w-5" />
                        Overdue Tasks Requiring Triage
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Open tasks whose deadlines have already elapsed</p>

                    <div className="overflow-x-auto">
                        {analytics.overdueTasks && analytics.overdueTasks.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Task Name</th>
                                        <th className="py-3 px-4">Deadline</th>
                                        <th className="py-3 px-4">Priority</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Assignee</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-sm">
                                    {analytics.overdueTasks.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                                                <Link to={`/groups/${groupId}?taskId=${t.id}`} className="hover:underline hover:text-blue-500">
                                                    {t.title}
                                                </Link>
                                            </td>
                                            <td className="py-3.5 px-4 text-rose-500 font-medium">
                                                {new Date(t.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${PRIORITY_BADGES[t.priority] || 'bg-gray-100 text-gray-800'}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="capitalize text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                                    {STATUS_LABELS[t.status] || t.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 font-medium">
                                                {t.assignedTo ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                            {t.assignedTo.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        {t.assignedTo.name}
                                                    </span>
                                                ) : (
                                                    <span className="italic text-gray-400">Unassigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-1" />
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Excellent Work!</p>
                                <p className="text-xs text-gray-500">There are no overdue tasks in this project.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
