import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Play, CheckCircle, Trash2, Pencil, X, Zap, Clock, Target, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import TaskDetailPanel from '../components/TaskDetailPanel';
import CreateTaskModal from '../components/CreateTaskModal';

const statusColors: Record<string, string> = {
    planned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    completed: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
};

const priorityColors: Record<string, string> = {
    high: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800',
    medium: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800',
    low: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800',
};


export default function SprintPlanning() {
    const { groupId } = useParams<{ groupId: string }>();
    const { user } = useAuth();

    const [group, setGroup] = useState<any>(null);
    const [sprints, setSprints] = useState<any[]>([]);
    const [backlog, setBacklog] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingSprint, setEditingSprint] = useState<any>(null);
    const [formName, setFormName] = useState('');
    const [formGoal, setFormGoal] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // UI state
    const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
    const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Task Modal state
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [groupRes, sprintsRes, backlogRes, membersRes] = await Promise.all([
                api.get(`/groups/${groupId}`),
                api.get(`/groups/${groupId}/sprints`),
                api.get(`/groups/${groupId}/backlog`),
                api.get(`/groups/${groupId}/users`),
            ]);
            setGroup(groupRes.data);
            setSprints(sprintsRes.data);
            setBacklog(backlogRes.data);
            setMembers(membersRes.data);

            const membership = membersRes.data.find((m: any) => m.userId === user?.id);
            setIsAdmin(membership?.role === 'admin');
        } catch (err) {
            console.error('Failed to load sprint data', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupId]);

    const toggleExpand = (id: string) => {
        setExpandedSprints(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const openCreateForm = () => {
        setEditingSprint(null);
        setFormName('');
        setFormGoal('');
        setFormStartDate('');
        setFormEndDate('');
        setShowCreateForm(true);
    };

    const openEditForm = (sprint: any) => {
        setEditingSprint(sprint);
        setFormName(sprint.name);
        setFormGoal(sprint.goal || '');
        setFormStartDate(sprint.startDate ? sprint.startDate.slice(0, 10) : '');
        setFormEndDate(sprint.endDate ? sprint.endDate.slice(0, 10) : '');
        setShowCreateForm(true);
    };

    const handleSaveSprint = async () => {
        if (!formName.trim()) return;
        setFormLoading(true);
        try {
            const body = {
                name: formName,
                goal: formGoal || undefined,
                startDate: formStartDate || undefined,
                endDate: formEndDate || undefined,
            };
            if (editingSprint) {
                await api.patch(`/sprints/${editingSprint.id}`, body);
            } else {
                await api.post(`/groups/${groupId}/sprints`, body);
            }
            setShowCreateForm(false);
            await fetchData();
        } catch (err) {
            console.error('Failed to save sprint', err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleStart = async (sprintId: string) => {
        try {
            await api.post(`/sprints/${sprintId}/start`);
            await fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to start sprint');
        }
    };

    const handleComplete = async (sprintId: string) => {
        try {
            await api.post(`/sprints/${sprintId}/complete`);
            setConfirmComplete(null);
            await fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to complete sprint');
        }
    };

    const handleDelete = async (sprintId: string) => {
        try {
            await api.delete(`/sprints/${sprintId}`);
            setConfirmDelete(null);
            await fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to delete sprint');
        }
    };

    const handleAddToSprint = async (sprintId: string, taskId: string) => {
        try {
            await api.post(`/sprints/${sprintId}/tasks/${taskId}`);
            await fetchData();
        } catch (err) {
            console.error('Failed to add task to sprint', err);
        }
    };

    const handleRemoveFromSprint = async (sprintId: string, taskId: string) => {
        try {
            await api.delete(`/sprints/${sprintId}/tasks/${taskId}`);
            await fetchData();
        } catch (err) {
            console.error('Failed to remove task from sprint', err);
        }
    };

    const handleEditTask = (task: any) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete task', error);
        }
    };

    const daysRemaining = (endDate: string) => {
        const diff = new Date(endDate).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const activeSprint = sprints.find((s: any) => s.status === 'active');
    const plannedSprints = sprints.filter((s: any) => s.status === 'planned');
    const completedSprints = sprints.filter((s: any) => s.status === 'completed');

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link
                            to={`/groups/${groupId}`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Zap size={18} className="text-indigo-500" />
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sprint Planning</h1>
                                <span className="text-sm text-gray-400 dark:text-gray-500">— {group?.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">Manage sprints and plan your backlog</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <button
                                onClick={openCreateForm}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                New Sprint
                            </button>
                        )}
                        <NotificationBell />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Sprints */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Create / Edit Form */}
                    {showCreateForm && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-700 shadow-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {editingSprint ? 'Edit Sprint' : 'Create New Sprint'}
                                </h3>
                                <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sprint Name *</label>
                                    <input
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="e.g. Sprint 1"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sprint Goal</label>
                                    <textarea
                                        value={formGoal}
                                        onChange={e => setFormGoal(e.target.value)}
                                        placeholder="What does this sprint aim to achieve?"
                                        rows={2}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formStartDate}
                                            onChange={e => setFormStartDate(e.target.value)}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={formEndDate}
                                            onChange={e => setFormEndDate(e.target.value)}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveSprint}
                                        disabled={!formName.trim() || formLoading}
                                        className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        {formLoading ? 'Saving...' : (editingSprint ? 'Save Changes' : 'Create Sprint')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Sprint */}
                    {activeSprint && (
                        <SprintCard
                            sprint={activeSprint}
                            isAdmin={isAdmin}
                            expanded={expandedSprints.has(activeSprint.id)}
                            onToggle={() => toggleExpand(activeSprint.id)}
                            onEdit={() => openEditForm(activeSprint)}
                            onComplete={() => setConfirmComplete(activeSprint.id)}
                            onDelete={() => setConfirmDelete(activeSprint.id)}
                            onRemoveTask={(taskId: string) => handleRemoveFromSprint(activeSprint.id, taskId)}
                            onViewTask={(task: any) => setSelectedTask(task)}
                            daysRemaining={activeSprint.endDate ? daysRemaining(activeSprint.endDate) : null}
                        />
                    )}

                    {/* Planned Sprints */}
                    {plannedSprints.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Planned</h2>
                            <div className="space-y-4">
                                {plannedSprints.map(sprint => (
                                    <SprintCard
                                        key={sprint.id}
                                        sprint={sprint}
                                        isAdmin={isAdmin}
                                        expanded={expandedSprints.has(sprint.id)}
                                        onToggle={() => toggleExpand(sprint.id)}
                                        onEdit={() => openEditForm(sprint)}
                                        onStart={() => handleStart(sprint.id)}
                                        onDelete={() => setConfirmDelete(sprint.id)}
                                        onRemoveTask={(taskId: string) => handleRemoveFromSprint(sprint.id, taskId)}
                                        onViewTask={(task: any) => setSelectedTask(task)}
                                        daysRemaining={null}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Sprints */}
                    {completedSprints.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Completed</h2>
                            <div className="space-y-4">
                                {completedSprints.map(sprint => (
                                    <SprintCard
                                        key={sprint.id}
                                        sprint={sprint}
                                        isAdmin={isAdmin}
                                        expanded={expandedSprints.has(sprint.id)}
                                        onToggle={() => toggleExpand(sprint.id)}
                                        onDelete={() => setConfirmDelete(sprint.id)}
                                        onRemoveTask={() => {}}
                                        onViewTask={(task: any) => setSelectedTask(task)}
                                        daysRemaining={null}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {sprints.length === 0 && !showCreateForm && (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                            <Zap size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No sprints yet</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first sprint to start planning</p>
                            {isAdmin && (
                                <button onClick={openCreateForm} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors">
                                    + New Sprint
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Backlog */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-6">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Target size={16} className="text-gray-400" />
                                Backlog
                                <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-mono">
                                    {backlog.length}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">Tasks not in any sprint</p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[calc(100vh-200px)] overflow-y-auto">
                            {backlog.length === 0 && (
                                <div className="p-6 text-center text-sm text-gray-400">
                                    🎉 All tasks are in sprints!
                                </div>
                            )}
                            {backlog.map(task => (
                                <div key={task.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {task.projectTag && (
                                                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                        {task.projectTag}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColors[task.priority] || ''}`}>
                                                    {task.priority}
                                                </span>
                                                {task.effort && (
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                        E{task.effort}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isAdmin && sprints.filter(s => s.status !== 'completed').length > 0 && (
                                            <select
                                                defaultValue=""
                                                onChange={e => { if (e.target.value) handleAddToSprint(e.target.value, task.id); }}
                                                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0"
                                            >
                                                <option value="" disabled>+ Sprint</option>
                                                {sprints.filter(s => s.status !== 'completed').map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Complete Modal */}
            {confirmComplete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Complete Sprint?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            All <strong>unfinished tasks</strong> will be moved back to the Backlog as technical debt and can be planned into the next sprint.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmComplete(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleComplete(confirmComplete)} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                                Complete Sprint
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Sprint?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            All tasks in this sprint will be moved back to the Backlog. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                groupId={groupId!}
                onTaskCreated={fetchData}
                taskToEdit={editingTask}
                members={members}
                isAdmin={isAdmin}
                currentUserId={user?.id}
                allTasks={[...backlog, ...sprints.flatMap(s => s.tasks || [])]}
                sprints={sprints.filter(s => s.status !== 'completed')}
                activeSprint={activeSprint}
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
            />
        </div>
    );
}

// ── Sprint Card Sub-component ────────────────────────────────────────────────
function SprintCard({
    sprint, isAdmin, expanded, onToggle,
    onEdit, onStart, onComplete, onDelete, onRemoveTask, onViewTask, daysRemaining,
}: any) {
    const totalTasks = sprint.tasks?.length || 0;
    const doneTasks = sprint.tasks?.filter((t: any) => t.status === 'done').length || 0;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${
            sprint.status === 'active' ? 'border-green-300 dark:border-green-700' :
            sprint.status === 'completed' ? 'border-gray-200 dark:border-gray-700 opacity-75' :
            'border-gray-200 dark:border-gray-700'
        }`}>
            {/* Sprint Header */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[sprint.status]}`}>
                                {sprint.status === 'active' ? '⚡ Active' : sprint.status === 'completed' ? '✓ Completed' : '◦ Planned'}
                            </span>
                            <h3 className="font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
                        </div>
                        {sprint.goal && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{sprint.goal}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                            {sprint.startDate && (
                                <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    {new Date(sprint.startDate).toLocaleDateString()} — {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : '?'}
                                </span>
                            )}
                            {sprint.status === 'active' && daysRemaining !== null && (
                                <span className={`font-semibold ${daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                                </span>
                            )}
                            <span>{totalTasks} tasks · {doneTasks} done</span>
                        </div>
                        {totalTasks > 0 && (
                            <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                    className="bg-green-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {isAdmin && sprint.status === 'planned' && (
                            <>
                                <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Edit">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={onStart} className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Start Sprint">
                                    <Play size={14} />
                                </button>
                            </>
                        )}
                        {isAdmin && sprint.status === 'active' && (
                            <>
                                <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Edit">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={onComplete} className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Complete Sprint">
                                    <CheckCircle size={14} />
                                </button>
                            </>
                        )}
                        {isAdmin && sprint.status !== 'active' && (
                            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Task List */}
            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
                    {sprint.tasks?.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-4">No tasks in this sprint yet</p>
                    )}
                    {sprint.tasks?.map((task: any) => (
                        <div key={task.id} onClick={() => onViewTask && onViewTask(task)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                                task.status === 'done' ? 'bg-green-500' :
                                task.status === 'in_progress' ? 'bg-blue-500' :
                                task.status === 'review' ? 'bg-yellow-500' :
                                task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'
                            }`} />
                            <div className="flex-1 min-w-0">
                                <span className={`text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {task.title}
                                </span>
                                {task.projectTag && (
                                    <span className="ml-2 text-[10px] text-indigo-500 dark:text-indigo-400">📁 {task.projectTag}</span>
                                )}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                task.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                                task.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                                'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            }`}>
                                {task.priority}
                            </span>
                            {isAdmin && sprint.status !== 'completed' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveTask(task.id); }}
                                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                                    title="Remove from sprint"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
