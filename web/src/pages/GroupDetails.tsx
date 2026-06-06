import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List as ListIcon, ArrowLeft, Settings, Zap, BarChart3 } from 'lucide-react';
import api from '../services/api';
import CreateTaskModal from '../components/CreateTaskModal';
import GroupSettingsModal from '../components/GroupSettingsModal';
import TaskDetailPanel from '../components/TaskDetailPanel';
import SprintBanner from '../components/SprintBanner';
import { useAuth } from '../context/AuthContext';
import TaskBoard from '../components/TaskBoard';
import TaskList from '../components/TaskList';
import { useSocket } from '../hooks/useSocket';

/**
 * GroupDetails Component
 * 
 * The primary dashboard view for an individual project/group.
 * Orchestrates fetching all related contexts including Tasks, Sprints, and Members exactly once on mount.
 * 
 * - Handles filtering logic (by Sprint, Tags, Search).
 * - Manages view toggle between 'TaskBoard' (Kanban) and 'TaskList' (Data Grid).
 * - Centralizes CRUD operations for tasks safely, passing them down as props to the presentational components.
 */
const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, review: 2, done: 3, blocked: 4 };

function getFilteredAndSortedTasks(
    tasks: any[],
    sprintFilter: 'active' | 'backlog' | 'all',
    activeSprint: any,
    tagFilter: string | null,
    searchQuery: string,
    sortBy: string,
    sortDir: 'asc' | 'desc'
) {
    let base = [...tasks];

    if (sprintFilter === 'active') {
        if (activeSprint) {
            base = base.filter((t: any) => t.sprintId === activeSprint.id);
        } else {
            base = [];
        }
    } else if (sprintFilter === 'backlog') {
        base = base.filter((t: any) => t.sprintId === null);
    }

    if (tagFilter) {
        base = base.filter((t: any) => t.projectTag === tagFilter);
    }

    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        base = base.filter((t: any) =>
            t.title.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
        );
    }

    return [...base].sort((a: any, b: any) => {
        let cmp = 0;
        if (sortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
        else if (sortBy === 'tag') cmp = (a.projectTag || '').localeCompare(b.projectTag || '');
        else if (sortBy === 'priority') cmp = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        else if (sortBy === 'status') cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        else {
            const da = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
            const db = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;
            cmp = da - db;
        }
        return sortDir === 'asc' ? cmp : -cmp;
    });
}

const GroupDetails = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();

    const { user } = useAuth();

    const [group, setGroup] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [sprints, setSprints] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { socket, connected } = useSocket(groupId);

    const handleTaskCreatedSocket = (newTask: any) => {
        setTasks((prev: any[]) => {
            if (prev.some(t => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
        });
    };

    const handleTaskUpdatedSocket = (updatedTask: any) => {
        setTasks((prev: any[]) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTask((prev: any) => prev?.id === updatedTask.id ? updatedTask : prev);
    };

    const handleTaskDeletedSocket = (data: { taskId: string }) => {
        setTasks((prev: any[]) => prev.filter(t => t.id !== data.taskId));
        setSelectedTask((prev: any) => prev?.id === data.taskId ? null : prev);
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('task:created', handleTaskCreatedSocket);
        socket.on('task:updated', handleTaskUpdatedSocket);
        socket.on('task:deleted', handleTaskDeletedSocket);

        return () => {
            socket.off('task:created', handleTaskCreatedSocket);
            socket.off('task:updated', handleTaskUpdatedSocket);
            socket.off('task:deleted', handleTaskDeletedSocket);
        };
    }, [socket]);

    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [sprintFilter, setSprintFilter] = useState<'active' | 'backlog' | 'all'>('active');

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'title' | 'tag' | 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status'>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchData = async () => {
        try {
            const [groupRes, tasksRes, membersRes, sprintsRes] = await Promise.all([
                api.get(`/groups/${groupId}`),
                api.get(`/groups/${groupId}/tasks`),
                api.get(`/groups/${groupId}/users`),
                api.get(`/groups/${groupId}/sprints`),
            ]);

            setGroup(groupRes.data);
            setTasks(tasksRes.data);
            setMembers(membersRes.data);
            setSprints(sprintsRes.data);

            // Default to 'all' if no active sprint
            const hasActive = sprintsRes.data.some((s: any) => s.status === 'active');
            if (!hasActive && sprintFilter === 'active') {
                setSprintFilter('all');
            }
        } catch (error: any) {
            console.error('Failed to fetch group details', error);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupId]);

    const [searchParams, setSearchParams] = useSearchParams();
    const queryTaskId = searchParams.get('taskId');

    useEffect(() => {
        if (queryTaskId && tasks.length > 0) {
            const t = tasks.find((task: any) => task.id === queryTaskId);
            if (t && (!selectedTask || t.id !== selectedTask.id)) {
                setSelectedTask(t);

                // Clear the parameter so closing the modal doesn't immediately reopen it
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('taskId');
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [queryTaskId, tasks, searchParams, setSearchParams, selectedTask]);

    const handleCreateTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task: any) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!globalThis.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete task', error);
        }
    };

    const handleDeleteGroup = async () => {
        if (!globalThis.confirm('Are you absolutely sure you want to close and permanently delete this group? All tasks, attachments, and comments will be lost. This cannot be undone.')) return;
        try {
            await api.delete(`/groups/${groupId}`);
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to delete group', error);
            alert('An error occurred while closing the group.');
        }
    };

    const handleStatusChange = async (taskId: string, status: string) => {
        try {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
            await api.patch(`/tasks/${taskId}`, { status });
            fetchData();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleBulkStatusChange = async (taskIds: string[], status: string) => {
        try {
            await api.patch(`/tasks/bulk/status`, { taskIds, status });
            fetchData();
        } catch (error) {
            console.error('Failed to bulk update status', error);
        }
    };

    const handleBulkDelete = async (taskIds: string[]) => {
        try {
            await api.post(`/tasks/bulk/delete`, { taskIds });
            fetchData();
        } catch (error) {
            console.error('Failed to bulk delete tasks', error);
        }
    };

    const isOwner = group?.owner?.id === user?.id;
    const currentUserRole = members.find((m: any) => m.userId === user?.id)?.role;
    const isAdmin = currentUserRole === 'admin' || isOwner;

    const activeSprint = useMemo(() => sprints.find(s => s.status === 'active'), [sprints]);
    const completedSprintIds = useMemo(() => new Set(sprints.filter(s => s.status === 'completed').map(s => s.id)), [sprints]);

    const filteredTasks = useMemo(() => {
        return getFilteredAndSortedTasks(tasks, sprintFilter, activeSprint, tagFilter, searchQuery, sortBy, sortDir);
    }, [tasks, tagFilter, searchQuery, sortBy, sortDir, sprintFilter, activeSprint]);

    // Tags scoped to the current sprint/backlog context (sprint-aware but not tag/search filtered)
    const uniqueTags = useMemo(() => {
        const baseTasks = getFilteredAndSortedTasks(tasks, sprintFilter, activeSprint, null, '', 'createdAt', 'desc');
        return Array.from(new Set(baseTasks.map((t: any) => t.projectTag).filter(Boolean))).sort((a, b) => a.localeCompare(b)) as string[];
    }, [tasks, sprintFilter, activeSprint]);

    const handleSortChange = (column: string) => {
        if (sortBy === column as any) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column as any);
            setSortDir('asc');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!group) {
        return <div className="text-center py-10">Group not found</div>;
    }

    const renderMainContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
            );
        }

        if (tasks.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-full mb-4">
                        <LayoutGrid size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No tasks yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                        {isAdmin
                            ? 'Get started by creating your first task for this group.'
                            : 'No tasks have been created in this group yet. Only admins can create tasks.'}
                    </p>
                    {isAdmin && (
                        <button
                            onClick={handleCreateTask}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={18} className="mr-2" />
                            Create Task
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="h-full overflow-hidden">
                {viewMode === 'board' ? (
                    <div className="h-full p-6 overflow-x-auto">
                        <TaskBoard
                            tasks={filteredTasks}
                            members={members}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onViewDetail={setSelectedTask}
                            isAdmin={isAdmin}
                            currentUserId={user?.id}
                            onStatusChange={handleStatusChange}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <TaskList
                            tasks={filteredTasks}
                            members={members}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onViewDetail={setSelectedTask}
                            onBulkStatusChange={handleBulkStatusChange}
                            onBulkDelete={handleBulkDelete}
                            isAdmin={isAdmin}
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSortChange={handleSortChange}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 z-10 shadow-sm transition-colors duration-200">
                <div className="flex justify-between items-center max-w-[98%] mx-auto w-full">
                    <div className="flex items-center">
                        <Link to="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors mr-3 flex-shrink-0 self-center">
                            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                        </Link>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group?.name}</h1>
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                                    {tasks.length} Tasks
                                </span>
                                {isAdmin && (
                                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded uppercase">
                                        Admin
                                    </span>
                                )}
                                {connected ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Live Sync</span>
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                        <span>Offline</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group?.description}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {isAdmin && (
                            <button
                                onClick={() => setIsSettingsModalOpen(true)}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Group Settings"
                            >
                                <Settings size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Sprint Banner */}
            <SprintBanner groupId={groupId!} />

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                <main className="h-full w-full max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
                    {/* Toolbar */}
                    <div className="mb-6 flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'board' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <LayoutGrid size={16} />
                                <span>Board</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <ListIcon size={16} />
                                <span>List</span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-3">
                            <Link
                                to={`/groups/${groupId}/analytics`}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                                <BarChart3 size={15} />
                                Analytics
                            </Link>
                            {isAdmin && (
                                <Link
                                    to={`/groups/${groupId}/sprints`}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                                >
                                    <Zap size={15} />
                                    Sprints
                                </Link>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={handleCreateTask}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <Plus size={18} className="mr-2" />
                                    New Task
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                            />
                        </div>

                        {/* Sprint Filters */}
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button
                                onClick={() => setSprintFilter('active')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sprintFilter === 'active'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Active Sprint
                            </button>
                            <button
                                onClick={() => setSprintFilter('backlog')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sprintFilter === 'backlog'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Backlog
                            </button>
                            <button
                                onClick={() => setSprintFilter('all')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sprintFilter === 'all'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                All Tasks
                            </button>
                        </div>

                        {/* Tag Filters */}
                        {(uniqueTags.length > 0) && (
                            <div className="flex items-center gap-2">
                                <label htmlFor="tag-filter" className="text-xs font-medium text-gray-500 dark:text-gray-400">Tag:</label>
                                <select
                                    id="tag-filter"
                                    value={tagFilter || ''}
                                    onChange={(e) => setTagFilter(e.target.value || null)}
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 transition-colors"
                                >
                                    <option value="">All Tags</option>
                                    {uniqueTags.map((tag: any) => (
                                        <option key={tag} value={tag}>📁 {tag}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 sm:mt-0 sm:ml-auto self-center">
                            {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {/* View Area */}
                    <div className="flex-1 min-h-0 relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden transition-colors duration-200">
                        {renderMainContent()}
                    </div>
                </main>
            </div>

            {/* Modals */}
            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                groupId={groupId!}
                onTaskCreated={fetchData}
                taskToEdit={editingTask}
                members={members}
                isAdmin={isAdmin}
                currentUserId={user?.id}
                allTasks={tasks.filter((t: any) => !t.sprintId || !completedSprintIds.has(t.sprintId))}
                sprints={sprints.filter(s => s.status !== 'completed')}
                activeSprint={activeSprint}
            />

            <GroupSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                groupId={groupId!}
                members={members}
                isAdmin={isAdmin}
                isOwner={isOwner}
                onSettingsChanged={fetchData}
                onDeleteGroup={handleDeleteGroup}
                currentUserId={user?.id}
            />

            <TaskDetailPanel
                task={selectedTask}
                members={members}
                isAdmin={isAdmin}
                currentUserId={user?.id}
                onClose={() => setSelectedTask(null)}
                onEdit={(task) => { setSelectedTask(null); handleEditTask(task); }}
                onDelete={async (taskId) => { await handleDeleteTask(taskId); setSelectedTask(null); }}
                onTaskUpdated={fetchData}
                socket={socket}
            />
        </div>
    );
};

export default GroupDetails;
