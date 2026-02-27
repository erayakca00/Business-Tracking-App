import React, { useState, useEffect } from 'react';

import api from '../services/api';
import { X } from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    onTaskCreated: () => void;
    taskToEdit?: any;
    members: any[];
    isAdmin: boolean;
    currentUserId?: string;
    existingTags?: string[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    groupId,
    onTaskCreated,
    taskToEdit,
    members,
    isAdmin,
    currentUserId,
    existingTags = [],
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('todo');
    const [priority, setPriority] = useState('medium');
    const [assignedTo, setAssignedTo] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [tagPrefix, setTagPrefix] = useState('');  // 3 uppercase letters e.g. PRO
    const [tagNumber, setTagNumber] = useState('');  // numeric part e.g. 1
    const [showTagList, setShowTagList] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Derived combined tag value, e.g. "PRO-1"
    const projectTag = tagPrefix.length === 3 && tagNumber ? `${tagPrefix}-${tagNumber}` : undefined;

    const handlePrefixChange = (val: string) => {
        const upper = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        setTagPrefix(upper);
    };

    const handleNumberChange = (val: string) => {
        setTagNumber(val.replace(/[^0-9]/g, ''));
    };

    const applyExistingTag = (tag: string) => {
        const parts = tag.split('-');
        if (parts.length === 2) { setTagPrefix(parts[0]); setTagNumber(parts[1]); }
    };

    const resetTag = () => { setTagPrefix(''); setTagNumber(''); };

    // Check if user has permission to edit
    // If creating (taskToEdit is null), generally allowed (but assignment restricted)
    // If editing, only admin or assignee can edit
    const canEdit = !taskToEdit || isAdmin || (currentUserId && taskToEdit.assignedToId === currentUserId);

    useEffect(() => {
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setStatus(taskToEdit.status);
            setPriority(taskToEdit.priority);
            setAssignedTo(taskToEdit.assignedToId || '');
            // Format date for input
            setDueDate(taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().slice(0, 16) : '');
            if (taskToEdit.projectTag) {
                const parts = taskToEdit.projectTag.split('-');
                setTagPrefix(parts[0] || '');
                setTagNumber(parts[1] || '');
            } else { resetTag(); }
        } else {
            setTitle('');
            setDescription('');
            setStatus('todo');
            setPriority('medium');
            setAssignedTo('');
            setDueDate('');
            resetTag();
        }
    }, [taskToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;

        setIsLoading(true);
        try {
            if (taskToEdit) {
                // Update: all fields including status are allowed
                const updateData: any = {
                    title,
                    description: description || undefined,
                    status,
                    priority,
                    assignedToId: assignedTo || null,
                    dueDate: dueDate || undefined,
                    projectTag: projectTag || undefined,
                };
                await api.patch(`/tasks/${taskToEdit.id}`, updateData);
            } else {
                // Create: status is NOT in CreateTaskDto, assignedToId cannot be null
                const createData: any = {
                    title,
                    description: description || undefined,
                    priority,
                    groupId,
                    assignedToId: assignedTo || undefined,
                    dueDate: dueDate || undefined,
                    projectTag: projectTag || undefined,
                };
                await api.post('/tasks', createData);
            }
            onTaskCreated();
            onClose();
        } catch (error) {
            console.error('Failed to save task', error);
            alert('Failed to save task. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto transition-colors duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{taskToEdit ? 'Edit Task' : 'Create Task'}</h2>
                    {!canEdit && <span className="text-xs text-red-500 font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">Read Only</span>}
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            required
                            disabled={!canEdit}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            rows={3}
                            disabled={!canEdit}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                disabled={!canEdit}
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                disabled={!canEdit}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
                        <input
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            disabled={!canEdit}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Tag</label>

                        {/* Existing tags toggle */}
                        {existingTags.length > 0 && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowTagList(v => !v)}
                                    className="mt-1 mb-1 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                >
                                    <span>{showTagList ? '▲' : '▼'}</span>
                                    {showTagList ? 'Hide' : 'Show'} existing tags ({existingTags.length})
                                </button>
                                {showTagList && (
                                    <div className="mb-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                        {existingTags.map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => { applyExistingTag(tag); setShowTagList(false); }}
                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${projectTag === tag
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                                                    }`}
                                            >
                                                📁 {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Split structured input: [ABC] - [1] */}
                        <div className="mt-1 flex items-center gap-2">
                            <div className="flex flex-col items-center">
                                <input
                                    type="text"
                                    value={tagPrefix}
                                    onChange={(e) => handlePrefixChange(e.target.value)}
                                    placeholder="PRO"
                                    maxLength={3}
                                    disabled={!canEdit}
                                    className="w-16 text-center rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm uppercase tracking-widest transition-colors"
                                />
                                <span className="text-[10px] text-gray-400 mt-0.5">letters</span>
                            </div>
                            <span className="text-xl font-bold text-gray-400 dark:text-gray-500 pb-4">-</span>
                            <div className="flex flex-col items-center">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={tagNumber}
                                    onChange={(e) => handleNumberChange(e.target.value)}
                                    placeholder="1"
                                    disabled={!canEdit}
                                    className="w-16 text-center rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm transition-colors"
                                />
                                <span className="text-[10px] text-gray-400 mt-0.5">number</span>
                            </div>
                            {/* Live preview */}
                            <div className="ml-2 pb-4">
                                {projectTag ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white">
                                        📁 {projectTag} ✓
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">preview</span>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">e.g. <strong>PRO-1</strong>, <strong>DEV-12</strong>, <strong>MKT-3</strong></p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            disabled={!canEdit || !isAdmin} // Only admin can assign
                        >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                                <option key={member.userId} value={member.userId}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                        {!isAdmin && canEdit && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only admins can change assignment.</p>}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        {canEdit && (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
