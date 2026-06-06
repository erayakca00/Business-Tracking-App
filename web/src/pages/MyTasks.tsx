import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    effortScore?: number;
    groupId: string;
    group?: {
        id: string;
        name: string;
    };
}

const statusColors: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-300',
    medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    high: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
};

const MyTasks: React.FC = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('active');

    useEffect(() => {
        const fetchMyTasks = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/tasks/my');
                setTasks(response.data);
            } catch (error) {
                console.error('Failed to fetch user tasks', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyTasks();
    }, []);

    const uniqueGroups = useMemo(() => {
        const groupMap = new Map<string, string>();
        tasks.forEach((t) => {
            if (t.group) {
                groupMap.set(t.group.id, t.group.name);
            }
        });
        return Array.from(groupMap.entries()).map(([id, name]) => ({ id, name }));
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (selectedGroup !== 'all' && t.group?.id !== selectedGroup) {
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
    }, [tasks, selectedGroup, statusFilter]);

    const handleTaskClick = (task: Task) => {
        navigate(`/groups/${task.groupId}?taskId=${task.id}`);
    };

    const isOverdue = (dateString?: string) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date() && !dateString.startsWith(new Date().toISOString().split('T')[0]);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 z-10 shadow-sm transition-colors duration-200">
                <div className="flex justify-between items-center max-w-[98%] mx-auto w-full">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex flex-wrap items-center gap-4 flex-shrink-0">
                {/* Group Filter */}
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Group:</span>
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Groups</option>
                        {uniqueGroups.map((g) => (
                            <option key={g.id} value={g.id}>📁 {g.name}</option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="active">Active Tasks</option>
                        <option value="all">All Statuses</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">In Review</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                    </select>
                </div>

                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                    Showing {filteredTasks.length} of {tasks.length} tasks
                </div>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-6 max-w-[98%] mx-auto w-full">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                        <CheckCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks found matching your filter selection.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTasks.map((task) => {
                            const isTaskOverdue = isOverdue(task.dueDate) && task.status !== 'done';
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className="text-left w-full bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-all duration-200 p-5 border border-transparent hover:border-blue-500 dark:border-gray-700 dark:hover:border-blue-500 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                                📁 {task.group?.name}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusColors[task.status]}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityColors[task.priority]}`}>
                                                {task.priority}
                                            </span>
                                            {task.effortScore !== undefined && task.effortScore !== null && (
                                                <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full">
                                                    {task.effortScore} pts
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                            {task.title}
                                        </h3>
                                        {task.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 flex-shrink-0 self-start md:self-center">
                                        {task.dueDate && (
                                            <div className={`flex items-center text-xs font-medium ${isTaskOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {isTaskOverdue ? <AlertTriangle size={14} className="mr-1.5" /> : <Calendar size={14} className="mr-1.5" />}
                                                <span>
                                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                {isTaskOverdue && <span className="ml-1.5 uppercase text-[9px] px-1 bg-red-100 dark:bg-red-950/30 rounded">Overdue</span>}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTasks;
