import React, { useState, useEffect, useRef } from 'react';
import { X, Edit, Calendar, User, Tag, Clock, MessageCircle, ChevronDown, Trash2, Check, GitBranch, AlertCircle, ArrowRight, Paperclip, Download } from 'lucide-react';
import api from '../services/api';
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

function AvatarCircle({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
    const color = colors[name.charCodeAt(0) % colors.length];
    const sz = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm';
    return (
        <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
    task,
    members,
    isAdmin,
    currentUserId,
    onClose,
    onEdit,
    onDelete,
    onTaskUpdated,
}) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [activity, setActivity] = useState<Activity[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentFocused, setCommentFocused] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [activeTab, setActiveTab] = useState<'comments' | 'all'>('comments');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [localTask, setLocalTask] = useState<Task | null>(task);
    const [submitting, setSubmitting] = useState(false);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

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

    useEffect(() => {
        setLocalTask(task);
        if (task) {
            fetchComments(task.id);
            fetchActivity(task.id);
            fetchAttachments(task.id);
        }
    }, [task]);

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
        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('file', files[i]);
            try {
                const res = await api.post(`/tasks/${localTask.id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setAttachments(prev => [res.data, ...prev]);
            } catch (e) { console.error(e); }
        }
        setUploading(false);
    };

    const handleDeleteAttachment = async (id: string) => {
        if (!localTask) return;
        try {
            await api.delete(`/tasks/${localTask.id}/attachments/${id}`);
            setAttachments(prev => prev.filter(a => a.id !== id));
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

    // Refresh activity after status/priority changes
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

    const handleStatusChange = async (status: string) => {
        if (!localTask) return;
        try {
            await api.patch(`/tasks/${localTask.id}`, { status });
            setLocalTask(prev => prev ? { ...prev, status } : prev);
            setShowStatusMenu(false);
            onTaskUpdated();
            refreshActivity(localTask.id);
        } catch (e) { console.error(e); }
    };

    const handlePriorityChange = async (priority: string) => {
        if (!localTask) return;
        try {
            await api.patch(`/tasks/${localTask.id}`, { priority });
            setLocalTask(prev => prev ? { ...prev, priority } : prev);
            setShowPriorityMenu(false);
            onTaskUpdated();
            refreshActivity(localTask.id);
        } catch (e) { console.error(e); }
    };

    if (!task || !localTask) return null;

    const statusObj = STATUS_OPTIONS.find(s => s.value === localTask.status) || STATUS_OPTIONS[0];
    const priorityObj = PRIORITY_OPTIONS.find(p => p.value === localTask.priority) || PRIORITY_OPTIONS[1];
    const assignee = members.find(m => m.userId === localTask.assignedToId);
    const reporter = members.find(m => m.userId === localTask.createdById);
    const canEdit = isAdmin;
    const isDuePast = localTask.dueDate && new Date(localTask.dueDate) < new Date();

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden transition-colors duration-200">
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
                    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 border-r border-gray-100 dark:border-gray-800">
                        {/* Description */}
                        <section className="mb-6">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                            {localTask.description ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{localTask.description}</p>
                            ) : (
                                <p className="text-sm text-gray-400 dark:text-gray-600 italic">No description provided.</p>
                            )}
                        </section>

                        {/* Attachments Section */}
                        <section className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Paperclip size={14} /> Attachments ({attachments.length})
                                </h3>
                                <button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                                    Add File
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ''; }} />
                            </div>

                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={e => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                                }}
                                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} ${attachments.length > 0 ? '' : 'flex flex-col items-center justify-center'}`}
                            >
                                {attachments.length === 0 ? (
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Drag and drop files here, or <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 dark:text-indigo-400 hover:underline">browse</button></p>
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
                                                        <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a href={`http://localhost:3000${att.url}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Download">
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
                            </div>
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
                                                    const match = textBeforeCursor.match(/@(\w*)$/);

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
                                                                const match = textBeforeCursor.match(/@(\w*)$/);
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

                                            {showMentionPopup && members.filter(m => m.name.toLowerCase().includes(mentionQuery)).length > 0 && (
                                                <div className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 w-64 max-h-48 overflow-y-auto top-full">
                                                    {members.filter(m => m.name.toLowerCase().includes(mentionQuery)).map((m, idx) => (
                                                        <div
                                                            key={m.userId}
                                                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${idx === mentionIndex ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200'}`}
                                                            onMouseEnter={() => setMentionIndex(idx)}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const textBeforeCursor = newComment.slice(0, cursorPosition);
                                                                const match = textBeforeCursor.match(/@(\w*)$/);
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
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {commentFocused && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={handleAddComment}
                                                        disabled={!newComment.trim() || submitting}
                                                        className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                            <p className="text-sm text-gray-400 dark:text-gray-600 italic text-center py-4">No comments yet. Be the first!</p>
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
                                        <p className="text-sm text-gray-400 dark:text-gray-600 italic text-center py-4">No activity yet.</p>
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
                                        {STATUS_OPTIONS.map(s => (
                                            <button
                                                key={s.value}
                                                onClick={() => handleStatusChange(s.value)}
                                                className={`block w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${s.value === localTask.status ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                                            >
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.label}</span>
                                            </button>
                                        ))}
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
                                                onClick={() => handlePriorityChange(p.value)}
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
                </div>
            </div>
        </>
    );
};

export default TaskDetailPanel;
