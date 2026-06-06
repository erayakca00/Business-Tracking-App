import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Edit, Calendar, User, Tag, Clock, MessageCircle, ChevronDown, Trash2, Check, GitBranch, AlertCircle, ArrowRight, Paperclip, Download, Copy, Sparkles } from 'lucide-react';
import api, { BACKEND_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Comment {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    author: { id: string; name: string; email: string };
}

interface Attachment {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    url: string;
    createdAt: string;
    userId: string;
}

interface Activity {
    id: string;
    type: string;
    data: { from?: string; to?: string } | null;
    createdAt: string;
    actor: { id: string; name: string };
}

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    assignedToId?: string;
    dueDate?: string;
    createdAt?: string;
    updatedAt?: string;
    projectTag?: string;
    createdById?: string;
    blockedBy?: Task[];
    blocking?: Task[];
    groupId?: string;
    group?: { id: string; name: string };
    aiSummary?: string;
    aiSummaryUpdatedAt?: string;
}

interface Member {
    userId: string;
    name: string;
    email: string;
    role: string;
}

interface TaskDetailPanelProps {
    task: Task | null;
    members: Member[];
    isAdmin: boolean;
    currentUserId?: string;
    onClose: () => void;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => Promise<void>;
    onTaskUpdated: () => void;
    socket?: any;
}

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    { value: 'review', label: 'In Review', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
    { value: 'done', label: 'Done', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
    { value: 'blocked', label: 'Blocked', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
];

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'text-green-600 dark:text-green-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-red-600 dark:text-red-400' },
];

function relativeTime(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

function AvatarCircle({ name, size = 'md' }: Readonly<{ name: string; size?: 'sm' | 'md' }>) {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    const color = colors[(name.codePointAt(0) || 0) % colors.length];
    const sz = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm';
    return (
        <span className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

// Sub-components to reduce cognitive complexity

interface AISummarySectionProps {
    loadingSummary: boolean;
    localTask: Task;
    handleSummarize: () => void;
}

const AISummarySection: React.FC<AISummarySectionProps> = ({
    loadingSummary,
    localTask,
    handleSummarize,
}) => {
    if (loadingSummary) {
        return (
            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500 animate-spin" />
                    <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">Generating summary...</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className="bg-indigo-650 h-full rounded-full animate-pulse" 
                        style={{ width: '40%' }} 
                    />
                </div>
            </div>
        );
    }

    if (localTask.aiSummary) {
        return (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-900/40 rounded-xl p-4.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-indigo-200 dark:text-indigo-900/20 pointer-events-none">
                    <Sparkles size={40} />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                    {localTask.aiSummary}
                </p>
                {localTask.aiSummaryUpdatedAt && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2.5 flex items-center gap-1 font-mono">
                        <Clock size={10} />
                        Generated {relativeTime(localTask.aiSummaryUpdatedAt)}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-full text-indigo-500 dark:text-indigo-400">
                <Sparkles size={20} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-300 font-sans">Summarize task with AI</p>
                <p className="text-xs text-gray-450 dark:text-gray-500 max-w-sm mt-0.5">
                    Generate a quick 3-sentence summary of the task's progress, activity history, and comments.
                </p>
            </div>
            <button
                type="button"
                onClick={handleSummarize}
                className="mt-1 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
                <Sparkles size={14} />
                Generate Summary
            </button>
        </div>
    );
};

interface BlockerSectionProps {
    localTask: Task;
    groupTasks: Task[];
    handleAddDependency: (blockingTaskId: string) => Promise<void>;
    handleRemoveDependency: (blockingId: string) => void;
}

const BlockerSection: React.FC<BlockerSectionProps> = ({
    localTask,
    groupTasks,
    handleAddDependency,
    handleRemoveDependency,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showBlockerSearch, setShowBlockerSearch] = useState(false);
    const [blockingError, setBlockingError] = useState<string | null>(null);

    const handleAdd = async (blockingTaskId: string) => {
        setBlockingError(null);
        try {
            await handleAddDependency(blockingTaskId);
            setShowBlockerSearch(false);
            setSearchQuery('');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to add dependency';
            setBlockingError(msg);
        }
    };

    return (
        <section className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                🔒 Task Dependencies
            </h3>

            {/* Blocked By List */}
            <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Blocked By (Blockers)</h4>
                {(!localTask.blockedBy || localTask.blockedBy.length === 0) ? (
                    <p className="text-sm text-gray-400 dark:text-gray-650 italic">No tasks are blocking this task.</p>
                ) : (
                    <div className="space-y-2">
                        {localTask.blockedBy.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${b.status === 'done' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
                                        {b.status === 'done' ? 'Done' : 'Blocking'}
                                    </span>
                                    <span className="text-sm text-gray-900 dark:text-gray-200 truncate font-medium">{b.title}</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveDependency(b.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Remove Blocker"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Blocking List */}
            <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Blocking</h4>
                {(!localTask.blocking || localTask.blocking.length === 0) ? (
                    <p className="text-sm text-gray-400 dark:text-gray-650 italic">This task is not blocking any other tasks.</p>
                ) : (
                    <div className="space-y-2">
                        {localTask.blocking.map(b => (
                            <div key={b.id} className="flex items-center p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-transparent">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mr-2 ${b.status === 'done' ? 'bg-green-100 dark:bg-green-900/40 text-green-700' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700'}`}>
                                    {b.status}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-gray-200 truncate font-medium">{b.title}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Blocker Picker */}
            <div className="mt-3 relative">
                {showBlockerSearch ? (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search task to add as blocker..."
                                className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                            />
                            <button
                                onClick={() => { setShowBlockerSearch(false); setSearchQuery(''); setBlockingError(null); }}
                                className="text-xs px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                        {blockingError && (
                            <p className="text-xs text-red-500 font-medium">{blockingError}</p>
                        )}
                        {searchQuery && (
                            <div className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                                {(() => {
                                    const availableBlockerTasks = groupTasks.filter(t => {
                                        if (t.id === localTask.id) return false;
                                        if (localTask.blockedBy?.some(b => b.id === t.id)) return false;
                                        return t.title.toLowerCase().includes(searchQuery.toLowerCase());
                                    });
                                    return availableBlockerTasks.length === 0 ? (
                                        <p className="text-xs text-gray-400 dark:text-gray-650 italic p-3 text-center">No tasks match search query.</p>
                                    ) : (
                                        availableBlockerTasks.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => handleAdd(t.id)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-900 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 last:border-0 flex justify-between items-center"
                                            >
                                                <span className="truncate mr-2">{t.title}</span>
                                                <span className="text-[10px] text-gray-400 px-1 rounded bg-gray-100 dark:bg-gray-700">{t.status}</span>
                                            </button>
                                        ))
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => { setShowBlockerSearch(true); setBlockingError(null); }}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                        + Add Blocker
                    </button>
                )}
            </div>
        </section>
    );
};

interface TimeTrackingSectionProps {
    timeLogs: any[];
    activeTimer: any;
    timerSeconds: number;
    onStartTimer: (note: string) => Promise<void>;
    onStopTimer: () => Promise<void>;
    onLogTimeManually: (durationSeconds: number, note: string) => Promise<void>;
}

const TimeTrackingSection: React.FC<TimeTrackingSectionProps> = ({
    timeLogs,
    activeTimer,
    timerSeconds,
    onStartTimer,
    onStopTimer,
    onLogTimeManually,
}) => {
    const [timerNote, setTimerNote] = useState('');
    const [showTimerNoteInput, setShowTimerNoteInput] = useState(false);
    
    const [manualHours, setManualHours] = useState('0');
    const [manualMinutes, setManualMinutes] = useState('0');
    const [manualNote, setManualNote] = useState('');

    const handleStart = async () => {
        try {
            await onStartTimer(timerNote);
            setTimerNote('');
            setShowTimerNoteInput(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hours = Number.parseInt(manualHours, 10) || 0;
        const minutes = Number.parseInt(manualMinutes, 10) || 0;
        const durationSeconds = (hours * 3600) + (minutes * 60);

        if (durationSeconds <= 0) return;

        try {
            await onLogTimeManually(durationSeconds, manualNote);
            setManualHours('0');
            setManualMinutes('0');
            setManualNote('');
        } catch (err) {
            console.error(err);
        }
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}h ${m}m`;
        }
        if (m > 0) {
            return `${m}m ${s}s`;
        }
        return `${s}s`;
    };

    return (
        <section className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock size={14} /> Time Tracking
            </h3>

            {/* Active Timer Controls */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl p-4 mb-4 border border-indigo-100/30 dark:border-indigo-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {activeTimer ? (
                    <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Active Timer Running</p>
                            {activeTimer.note && (
                                <p className="text-xs text-indigo-700 dark:text-indigo-400 italic">"{activeTimer.note}"</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No active timer</p>
                        <p className="text-[11px] text-gray-400">Track your progress live or log hours manually below.</p>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {activeTimer ? (
                        <>
                            <span className="text-sm font-mono font-bold text-indigo-900 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 rounded-md">
                                {(() => {
                                    const hrs = Math.floor(timerSeconds / 3600);
                                    const mins = Math.floor((timerSeconds % 3600) / 60);
                                    const secs = timerSeconds % 60;
                                    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                })()}
                            </span>
                            <button
                                onClick={onStopTimer}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-red-650 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1"
                            >
                                Stop Timer
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {showTimerNoteInput ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={timerNote}
                                        onChange={e => setTimerNote(e.target.value)}
                                        placeholder="What are you working on?"
                                        className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                                    />
                                    <button
                                        onClick={handleStart}
                                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                                    >
                                        Start
                                    </button>
                                    <button
                                        onClick={() => { setShowTimerNoteInput(false); setTimerNote(''); }}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowTimerNoteInput(true)}
                                    className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                                >
                                    Start Timer
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Time Logger Form */}
            <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Log Time Manually</h4>
                <form onSubmit={handleManualSubmit} className="flex items-center gap-3">
                    <div className="flex-1">
                        <label htmlFor="manualHoursInput" className="block text-[10px] text-gray-400 font-medium mb-1">Hours</label>
                        <input
                            id="manualHoursInput"
                            type="number"
                            min="0"
                            value={manualHours}
                            onChange={e => setManualHours(e.target.value)}
                            className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="manualMinutesInput" className="block text-[10px] text-gray-400 font-medium mb-1">Minutes</label>
                        <input
                            id="manualMinutesInput"
                            type="number"
                            min="0"
                            max="59"
                            value={manualMinutes}
                            onChange={e => setManualMinutes(e.target.value)}
                            className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex-[3]">
                        <label htmlFor="manualNoteInput" className="block text-[10px] text-gray-400 font-medium mb-1">Note / Description</label>
                        <input
                            id="manualNoteInput"
                            type="text"
                            value={manualNote}
                            onChange={e => setManualNote(e.target.value)}
                            placeholder="What did you do?"
                            className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex-shrink-0 pt-4">
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold rounded-lg hover:bg-black dark:hover:bg-gray-600 transition-colors"
                        >
                            Log Time
                        </button>
                    </div>
                </form>
            </div>

            {/* Time Logs History */}
            <div>
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Logged History</h4>
                {timeLogs.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-655 italic">No time logged for this task yet.</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {timeLogs.map(log => (
                            <div key={log.id} className="flex items-start justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="font-semibold text-gray-900 dark:text-white">{log.user?.name || 'Unknown User'}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            {new Date(log.startedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {log.note ? (
                                        <p className="text-gray-605 dark:text-gray-400 italic font-medium">"{log.note}"</p>
                                    ) : (
                                        <p className="text-gray-400 italic">No description</p>
                                    )}
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white bg-gray-105 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                                    {formatDuration(log.duration || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

interface MetadataSidebarProps {
    localTask: Task;
    members: Member[];
    onStatusChange: (status: string) => Promise<void>;
    onPriorityChange: (priority: string) => Promise<void>;
}

const MetadataSidebar: React.FC<MetadataSidebarProps> = ({
    localTask,
    members,
    onStatusChange,
    onPriorityChange,
}) => {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);

    const activeBlockers = localTask.blockedBy?.filter(b => b.status !== 'done') || [];
    const isBlocked = activeBlockers.length > 0;

    const statusObj = STATUS_OPTIONS.find(s => s.value === localTask.status) || STATUS_OPTIONS[0];
    const priorityObj = PRIORITY_OPTIONS.find(p => p.value === localTask.priority) || PRIORITY_OPTIONS[1];
    const assignee = members.find(m => m.userId === localTask.assignedToId);
    const reporter = members.find(m => m.userId === localTask.createdById);
    const isDuePast = localTask.dueDate && new Date(localTask.dueDate) < new Date();

    return (
        <div className="w-64 flex-shrink-0 overflow-y-auto p-5 space-y-5 bg-gray-50 dark:bg-gray-800/50">
            {/* Status */}
            <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Status</p>
                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold w-full ${statusObj.color} transition-colors`}
                    >
                        <span className="flex-1 text-left">{statusObj.label}</span>
                        <ChevronDown size={14} />
                    </button>
                    {showStatusMenu && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                            {STATUS_OPTIONS.map(s => {
                                const isOptionDisabled = isBlocked && s.value !== 'todo' && s.value !== 'blocked';
                                return (
                                    <button
                                        key={s.value}
                                        onClick={() => {
                                            if (isOptionDisabled) return;
                                            onStatusChange(s.value);
                                            setShowStatusMenu(false);
                                        }}
                                        disabled={isOptionDisabled}
                                        className={`block w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${s.value === localTask.status ? 'bg-gray-50 dark:bg-gray-700' : ''} ${isOptionDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.label}</span>
                                        {isOptionDisabled && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">Locked 🔒</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Priority */}
            <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Priority</p>
                <div className="relative">
                    <button
                        onClick={() => setShowPriorityMenu(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className={`flex-1 text-left capitalize ${priorityObj.color}`}>{priorityObj.label}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    {showPriorityMenu && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
                            {PRIORITY_OPTIONS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => {
                                        onPriorityChange(p.value);
                                        setShowPriorityMenu(false);
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm font-medium capitalize hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${p.color} ${p.value === localTask.priority ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Assignee */}
            <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Assignee</p>
                {assignee ? (
                    <div className="flex items-center gap-2">
                        <AvatarCircle name={assignee.name} size="sm" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{assignee.name}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
                        <User size={16} />
                        <span className="text-sm italic">Unassigned</span>
                    </div>
                )}
            </div>

            {/* Reporter */}
            {reporter && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Reporter</p>
                    <div className="flex items-center gap-2">
                        <AvatarCircle name={reporter.name} size="sm" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{reporter.name}</span>
                    </div>
                </div>
            )}

            {/* Project Tag */}
            {localTask.projectTag && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Tag</p>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                        <Tag size={10} />
                        {localTask.projectTag}
                    </span>
                </div>
            )}

            {/* Due Date */}
            <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Due Date</p>
                {localTask.dueDate ? (
                    <div className={`flex items-center gap-1.5 text-sm ${isDuePast ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        <Calendar size={14} />
                        {isDuePast && <span className="text-xs font-semibold">⚠</span>}
                        {new Date(localTask.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-600 italic">None</span>
                )}
            </div>

            {/* Timestamps */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {localTask.createdAt && (
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Created {new Date(localTask.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
                {localTask.updatedAt && localTask.updatedAt !== localTask.createdAt && (
                    <div className="flex items-center gap-1.5">
                        <MessageCircle size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Updated {relativeTime(localTask.updatedAt)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
    task,
    members,
    isAdmin,
    currentUserId,
    onClose,
    onEdit,
    onDelete,
    onTaskUpdated,
    socket,
}) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [activity, setActivity] = useState<Activity[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentFocused, setCommentFocused] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [activeTab, setActiveTab] = useState<'comments' | 'all'>('comments');
    const [localTask, setLocalTask] = useState<Task | null>(task);
    const [submitting, setSubmitting] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    // Blocker state
    const [groupTasks, setGroupTasks] = useState<Task[]>([]);

    // Time tracking state
    const [timeLogs, setTimeLogs] = useState<any[]>([]);
    const [activeTimer, setActiveTimer] = useState<any>(null);
    const [timerSeconds, setTimerSeconds] = useState(0);

    // Mention state
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentionPopup, setShowMentionPopup] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);

    // Attachment state
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTaskDetails = async (taskId: string) => {
        try {
            const res = await api.get(`/tasks/${taskId}`);
            setLocalTask(res.data);
        } catch (e) {
            console.error('Failed to fetch task details:', e);
        }
    };

    const handleSummarize = async () => {
        if (!localTask) return;
        setLoadingSummary(true);
        try {
            const res = await api.post(`/tasks/${localTask.id}/summarize`);
            setLocalTask(res.data);
        } catch (e) {
            console.error('Failed to generate summary:', e);
            alert('Failed to generate AI summary. Make sure GEMINI_API_KEY is configured.');
        } finally {
            setLoadingSummary(false);
        }
    };

    const fetchGroupTasks = async (groupId: string) => {
        try {
            const res = await api.get(`/groups/${groupId}/tasks`);
            const tasksArray = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setGroupTasks(tasksArray);
        } catch (e) {
            console.error('Failed to fetch group tasks:', e);
        }
    };

    const fetchTimeLogs = async (taskId: string) => {
        try {
            const res = await api.get(`/tasks/${taskId}/time`);
            setTimeLogs(res.data);
            const active = res.data.find((log: any) => log.endedAt === null && log.userId === currentUserId);
            setActiveTimer(active || null);
        } catch (e) {
            console.error('Failed to fetch time logs:', e);
        }
    };

    useEffect(() => {
        if (task?.id && task.id !== 'undefined') {
            fetchTaskDetails(task.id);
            fetchComments(task.id);
            fetchActivity(task.id);
            fetchAttachments(task.id);
        } else {
            setLocalTask(null);
        }
    }, [task]);

    useEffect(() => {
        if (localTask?.id && localTask.id !== 'undefined') {
            const gId = localTask.groupId || (localTask.group as any)?.id;
            if (gId) {
                fetchGroupTasks(gId);
            }
            fetchTimeLogs(localTask.id);
        }
    }, [localTask?.id]);

    useEffect(() => {
        let interval: any = null;
        if (activeTimer) {
            const start = new Date(activeTimer.startedAt).getTime();
            setTimerSeconds(Math.floor((Date.now() - start) / 1000));

            interval = setInterval(() => {
                setTimerSeconds(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            setTimerSeconds(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTimer]);

    const handleSocketCommentCreated = useCallback((comment: any) => {
        if (comment.taskId !== localTask?.id) return;
        setComments(prev => prev.some(c => c.id === comment.id) ? prev : [...prev, comment]);
    }, [localTask?.id]);

    const handleSocketCommentDeleted = useCallback((data: { commentId: string, taskId: string }) => {
        if (data.taskId !== localTask?.id) return;
        setComments(prev => prev.filter(c => c.id !== data.commentId));
    }, [localTask?.id]);

    const handleSocketTaskUpdated = useCallback((updatedTask: any) => {
        if (updatedTask.id !== localTask?.id) return;
        setLocalTask(updatedTask);
        fetchActivity(updatedTask.id);
    }, [localTask?.id]);

    useEffect(() => {
        if (!socket || !localTask) return;

        socket.on('comment:created', handleSocketCommentCreated);
        socket.on('comment:deleted', handleSocketCommentDeleted);
        socket.on('task:updated', handleSocketTaskUpdated);

        return () => {
            socket.off('comment:created', handleSocketCommentCreated);
            socket.off('comment:deleted', handleSocketCommentDeleted);
            socket.off('task:updated', handleSocketTaskUpdated);
        };
    }, [socket, localTask?.id, handleSocketCommentCreated, handleSocketCommentDeleted, handleSocketTaskUpdated]);

    const fetchAttachments = async (taskId: string) => {
        try {
            const res = await api.get(`/tasks/${taskId}/attachments`);
            setAttachments(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchComments = async (taskId: string) => {
        try {
            const res = await api.get(`/tasks/${taskId}/comments`);
            setComments(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchActivity = async (taskId: string) => {
        try {
            const res = await api.get(`/tasks/${taskId}/activity`);
            setActivity(res.data);
        } catch (e) { console.error(e); }
    };

    const handleFileUpload = async (files: FileList | File[]) => {
        if (!localTask || files.length === 0) return;
        setUploading(true);
        let hasNew = false;
        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await api.post(`/tasks/${localTask.id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setAttachments(prev => [res.data, ...prev]);
                hasNew = true;
            } catch (e) { console.error(e); }
        }
        setUploading(false);
        if (hasNew) refreshActivity(localTask.id);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            handleFileUpload(e.clipboardData.files);
        }
    };

    const handleDeleteAttachment = async (id: string) => {
        if (!localTask) return;
        try {
            await api.delete(`/tasks/${localTask.id}/attachments/${id}`);
            setAttachments(prev => prev.filter(a => a.id !== id));
            refreshActivity(localTask.id);
        } catch (e) { console.error(e); }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !localTask) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/tasks/${localTask.id}/comments`, { content: newComment.trim() });
            setComments(prev => [...prev, res.data]);
            setNewComment('');
            setCommentFocused(false);
        } catch (e) { console.error(e); }
        setSubmitting(false);
    };

    const refreshActivity = (taskId: string) => fetchActivity(taskId);

    const handleEditComment = async (id: string) => {
        if (!editingContent.trim()) return;
        try {
            const res = await api.patch(`/comments/${id}`, { content: editingContent.trim() });
            setComments(prev => prev.map(c => c.id === id ? res.data : c));
            setEditingCommentId(null);
        } catch (e) { console.error(e); }
    };

    const handleDeleteComment = async (id: string) => {
        try {
            await api.delete(`/comments/${id}`);
            setComments(prev => prev.filter(c => c.id !== id));
        } catch (e) { console.error(e); }
    };

    const handleSaveAsTemplate = async () => {
        if (!localTask) return;
        const name = globalThis.prompt('Enter a name for this template:');
        if (!name?.trim()) return;

        try {
            const gId = localTask.groupId || (localTask.group as any)?.id;
            await api.post(`/groups/${gId}/templates`, {
                name: name.trim(),
                taskId: localTask.id,
            });
            alert('Template saved successfully!');
        } catch (err: any) {
            console.error('Failed to save template:', err);
            alert(err.response?.data?.message || 'Failed to save template');
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!localTask) return;
        try {
            await api.patch(`/tasks/${localTask.id}`, { status });
            setLocalTask(prev => prev ? { ...prev, status } : prev);
            onTaskUpdated();
            refreshActivity(localTask.id);
        } catch (e) { console.error(e); }
    };

    const handlePriorityChange = async (priority: string) => {
        if (!localTask) return;
        try {
            await api.patch(`/tasks/${localTask.id}`, { priority });
            setLocalTask(prev => prev ? { ...prev, priority } : prev);
            onTaskUpdated();
            refreshActivity(localTask.id);
        } catch (e) { console.error(e); }
    };

    const handleAddDependency = async (blockingTaskId: string) => {
        if (!localTask) return;
        try {
            await api.post(`/tasks/${localTask.id}/dependencies`, { blockingTaskId });
            await fetchTaskDetails(localTask.id);
            onTaskUpdated();
        } catch (err: any) {
            throw err;
        }
    };

    const handleRemoveDependency = async (blockingId: string) => {
        if (!localTask) return;
        try {
            await api.delete(`/tasks/${localTask.id}/dependencies/${blockingId}`);
            await fetchTaskDetails(localTask.id);
            onTaskUpdated();
        } catch (err: any) {
            console.error('Failed to remove dependency:', err);
        }
    };

    const handleStartTimer = async (note: string) => {
        if (!localTask) return;
        try {
            await api.post(`/tasks/${localTask.id}/time/start`, { note });
            await fetchTimeLogs(localTask.id);
        } catch (err: any) {
            console.error('Failed to start timer:', err);
        }
    };

    const handleStopTimer = async () => {
        if (!localTask) return;
        try {
            await api.post(`/tasks/${localTask.id}/time/stop`);
            await fetchTimeLogs(localTask.id);
            refreshActivity(localTask.id);
        } catch (err: any) {
            console.error('Failed to stop timer:', err);
        }
    };

    const handleLogTimeManually = async (durationSeconds: number, note: string) => {
        if (!localTask) return;
        try {
            await api.post(`/tasks/${localTask.id}/time/manual`, {
                durationSeconds,
                note
            });
            await fetchTimeLogs(localTask.id);
            refreshActivity(localTask.id);
        } catch (err: any) {
            console.error('Failed to log manual time:', err);
        }
    };

    if (!task || !localTask) return null;

    const activeBlockers = localTask.blockedBy?.filter(b => b.status !== 'done') || [];
    const isBlocked = activeBlockers.length > 0;
    const canEdit = isAdmin;

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 cursor-default focus:outline-none"
                onClick={onClose}
                aria-label="Close panel"
            />

            {/* Panel */}
            <div 
                className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden transition-colors duration-200"
                onPaste={handlePaste}
            >
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 flex-shrink-0">TASK</span>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{localTask.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {canEdit && (
                            <button
                                onClick={() => { onClose(); onEdit(localTask); }}
                                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                <Edit size={14} />
                                Edit
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                onClick={handleSaveAsTemplate}
                                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                title="Save as Template"
                            >
                                <Copy size={14} />
                                Save Template
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                onClick={() => { onDelete(localTask.id); onClose(); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 min-h-0">
                    {/* ── Left: description + activity ── */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 border-r border-gray-100 dark:border-gray-800 font-sans">
                        {/* Blocker warning banner */}
                        {isBlocked && (
                            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg flex items-start gap-3 flex-shrink-0">
                                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">This task is currently blocked</p>
                                    <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                                        Resolve the following blocker tasks to change status:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {activeBlockers.map(b => (
                                            <span key={b.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                                                {b.title}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <section className="mb-6">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                            {localTask.description ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{localTask.description}</p>
                            ) : (
                                <p className="text-sm text-gray-450 dark:text-gray-600 italic">No description provided.</p>
                            )}
                        </section>

                        {/* AI Task Summarizer */}
                        <section className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-indigo-500" />
                                    AI Task Summary
                                </h3>
                                {localTask.aiSummary && !loadingSummary && (
                                    <button
                                        onClick={handleSummarize}
                                        className="text-xs font-medium text-indigo-650 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                    >
                                        Regenerate
                                    </button>
                                )}
                            </div>

                            <AISummarySection
                                loadingSummary={loadingSummary}
                                localTask={localTask}
                                handleSummarize={handleSummarize}
                            />
                        </section>

                        {/* Blocker Management Section */}
                        <BlockerSection
                            localTask={localTask}
                            groupTasks={groupTasks}
                            handleAddDependency={handleAddDependency}
                            handleRemoveDependency={handleRemoveDependency}
                        />

                        {/* Time Tracking Section */}
                        <TimeTrackingSection
                            timeLogs={timeLogs}
                            activeTimer={activeTimer}
                            timerSeconds={timerSeconds}
                            onStartTimer={handleStartTimer}
                            onStopTimer={handleStopTimer}
                            onLogTimeManually={handleLogTimeManually}
                        />

                        {/* Attachments Section */}
                        <section className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Paperclip size={14} /> Attachments ({attachments.length})
                                </h3>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                                    Add File
                                </button>
                                <input type="file" id="fileUploadInput" ref={fileInputRef} className="hidden" multiple onChange={e => { if (e.target.files) { handleFileUpload(e.target.files); } e.target.value = ''; }} />
                            </div>

                            <section
                                aria-label="File upload dropzone"
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={e => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files) { handleFileUpload(e.dataTransfer.files); }
                                }}
                                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} ${attachments.length > 0 ? '' : 'flex flex-col items-center justify-center'}`}
                            >
                                {attachments.length === 0 ? (
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Drag and drop files here, paste (Ctrl+V), or <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 dark:text-indigo-400 hover:underline">browse</button></p>
                                        {uploading && <p className="text-xs text-indigo-500 mt-2 font-medium">Uploading...</p>}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {attachments.map(att => (
                                            <div key={att.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-lg group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded">
                                                        <Paperclip size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{att.originalName}</p>
                                                        <p className="text-xs text-gray-450">{(att.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a href={`${BACKEND_URL}${att.url}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Download">
                                                        <Download size={14} />
                                                    </a>
                                                    {(isAdmin || att.userId === currentUserId) && (
                                                        <button onClick={() => handleDeleteAttachment(att.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {uploading && (
                                            <div className="flex items-center justify-center p-3">
                                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">Uploading file(s)...</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        </section>

                        {/* Activity tabs */}
                        <section className="flex-1">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Activity</h3>
                            <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-800">
                                {(['all', 'comments'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {tab === 'all' ? `History (${activity.length})` : `Comments (${comments.length})`}
                                    </button>
                                ))}
                            </div>

                            {/* ── COMMENTS TAB ── */}
                            {activeTab === 'comments' && (
                                <>
                                    {/* Comment input */}
                                    <div className="flex gap-3 mb-5">
                                        <AvatarCircle name={user?.name || 'U'} />
                                        <div className="flex-1 relative">
                                            <textarea
                                                ref={commentInputRef}
                                                value={newComment}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setNewComment(val);
                                                    const cursor = e.target.selectionStart;
                                                    setCursorPosition(cursor);

                                                    // Detect @ mention
                                                    const textBeforeCursor = val.slice(0, cursor);
                                                    const match = /@(\w*)$/.exec(textBeforeCursor);

                                                    if (match) {
                                                        setShowMentionPopup(true);
                                                        setMentionQuery(match[1].toLowerCase());
                                                        setMentionIndex(0);
                                                    } else {
                                                        setShowMentionPopup(false);
                                                    }
                                                }}
                                                onFocus={() => setCommentFocused(true)}
                                                onClick={e => {
                                                    setCursorPosition(e.currentTarget.selectionStart);
                                                }}
                                                placeholder="Add a comment... (Type @ to mention someone)"
                                                rows={commentFocused ? 3 : 1}
                                                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                                                onKeyDown={e => {
                                                    if (showMentionPopup) {
                                                        const filteredMembers = members.filter(m => m.name.toLowerCase().includes(mentionQuery));
                                                        if (e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
                                                        } else if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
                                                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                                                            e.preventDefault();
                                                            if (filteredMembers[mentionIndex]) {
                                                                const selectedUser = filteredMembers[mentionIndex];
                                                                const textBeforeCursor = newComment.slice(0, cursorPosition);
                                                                const match = /@(\w*)$/.exec(textBeforeCursor);
                                                                if (match) {
                                                                    const newText = newComment.slice(0, cursorPosition - match[0].length) + `@${selectedUser.name} ` + newComment.slice(cursorPosition);
                                                                    setNewComment(newText);
                                                                    setShowMentionPopup(false);
                                                                }
                                                            }
                                                        } else if (e.key === 'Escape') {
                                                            setShowMentionPopup(false);
                                                        }
                                                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                        handleAddComment();
                                                    }
                                                }}
                                            />

                                            {showMentionPopup && members.some(m => m.name.toLowerCase().includes(mentionQuery)) && (
                                                <div className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 w-64 max-h-48 overflow-y-auto top-full">
                                                    {members.filter(m => m.name.toLowerCase().includes(mentionQuery)).map((m, idx) => (
                                                        <button
                                                            key={m.userId}
                                                            type="button"
                                                            className={`w-full text-left px-3 py-2 cursor-pointer flex items-center gap-2 ${idx === mentionIndex ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200'}`}
                                                            onMouseEnter={() => setMentionIndex(idx)}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const textBeforeCursor = newComment.slice(0, cursorPosition);
                                                                const match = /@(\w*)$/.exec(textBeforeCursor);
                                                                if (match) {
                                                                    const newText = newComment.slice(0, cursorPosition - match[0].length) + `@${m.name} ` + newComment.slice(cursorPosition);
                                                                    setNewComment(newText);
                                                                    setShowMentionPopup(false);
                                                                    commentInputRef.current?.focus();
                                                                }
                                                            }}
                                                        >
                                                            <AvatarCircle name={m.name} size="sm" />
                                                            <span className="text-sm font-medium truncate">{m.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {commentFocused && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={handleAddComment}
                                                        disabled={!newComment.trim() || submitting}
                                                        className="px-3 py-1.5 text-sm font-medium bg-indigo-650 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => { setCommentFocused(false); setNewComment(''); }}
                                                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comments list */}
                                    <div className="space-y-4">
                                        {comments.length === 0 && (
                                            <p className="text-sm text-gray-400 dark:text-gray-650 italic text-center py-4">No comments yet. Be the first!</p>
                                        )}
                                        {comments.map(comment => (
                                            <div key={comment.id} className="flex gap-3 group">
                                                <AvatarCircle name={comment.author?.name || 'U'} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{comment.author?.name}</span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500" title={new Date(comment.createdAt).toLocaleString()}>
                                                            {relativeTime(comment.createdAt)}
                                                            {comment.updatedAt !== comment.createdAt && ' (edited)'}
                                                        </span>
                                                    </div>
                                                    {editingCommentId === comment.id ? (
                                                        <div>
                                                            <textarea
                                                                value={editingContent}
                                                                onChange={e => setEditingContent(e.target.value)}
                                                                rows={2}
                                                                autoFocus
                                                                className="w-full text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                                            />
                                                            <div className="flex gap-2 mt-1.5">
                                                                <button onClick={() => handleEditComment(comment.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                                                    <Check size={12} /> Save
                                                                </button>
                                                                <button onClick={() => setEditingCommentId(null)} className="px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                                    )}
                                                    {editingCommentId !== comment.id && (
                                                        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {comment.userId === currentUserId && (
                                                                <button
                                                                    onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); }}
                                                                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                            {(comment.userId === currentUserId || isAdmin) && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* ── ALL / HISTORY TAB ── */}
                            {activeTab === 'all' && (
                                <div className="space-y-3">
                                    {activity.length === 0 && (
                                        <p className="text-sm text-gray-400 dark:text-gray-650 italic text-center py-4">No activity yet.</p>
                                    )}
                                    {activity.map(entry => {
                                        const actorName = entry.actor?.name || 'Someone';
                                        let icon = <GitBranch size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />;
                                        let text: React.ReactNode = '';

                                        switch (entry.type) {
                                            case 'created':
                                                icon = <AlertCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> created this task</>;
                                                break;
                                            case 'status_changed':
                                                icon = <ArrowRight size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> changed status from <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.data?.from}</span> → <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.data?.to}</span></>;
                                                break;
                                            case 'priority_changed':
                                                icon = <AlertCircle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> changed priority from <span className="capitalize font-medium">{entry.data?.from}</span> → <span className="capitalize font-medium">{entry.data?.to}</span></>;
                                                break;
                                            case 'assignee_changed':
                                                icon = <User size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> changed assignee</>;
                                                break;
                                            case 'due_date_changed':
                                                icon = <Calendar size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> set due date to <span className="font-medium">{entry.data?.to ? new Date(entry.data.to).toLocaleDateString() : 'none'}</span></>;
                                                break;
                                            case 'tag_changed':
                                                icon = <Tag size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> changed tag from <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.data?.from || 'none'}</span> → <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.data?.to || 'none'}</span></>;
                                                break;
                                            case 'title_changed':
                                                icon = <Edit size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> renamed task</>;
                                                break;
                                            case 'description_changed':
                                                icon = <Edit size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> updated description</>;
                                                break;
                                            case 'attachment_added':
                                                icon = <Paperclip size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> attached a file <span className="font-medium text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.data?.to}</span></>;
                                                break;
                                            case 'attachment_deleted':
                                                icon = <Trash2 size={14} className="text-red-500 flex-shrink-0 mt-0.5" />;
                                                text = <><span className="font-semibold">{actorName}</span> deleted an attachment <span className="font-medium text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{entry.data?.from}</span></>;
                                                break;
                                            default:
                                                text = <><span className="font-semibold">{actorName}</span> made a change</>;
                                        }

                                        return (
                                            <div key={entry.id} className="flex gap-2.5 items-start">
                                                <div className="mt-0.5">{icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" title={new Date(entry.createdAt).toLocaleString()}>{relativeTime(entry.createdAt)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ── Right: metadata sidebar ── */}
                    <MetadataSidebar
                        localTask={localTask}
                        members={members}
                        onStatusChange={handleStatusChange}
                        onPriorityChange={handlePriorityChange}
                    />
                </div>
            </div>
        </>
    );
};

export default TaskDetailPanel;
