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
    allTasks?: any[];
    sprints?: any[];
    activeSprint?: any;
}

const validatePastDueDate = (selectedDate: Date, taskToEdit: any, dueDate: string): boolean => {
    const now = new Date();
    if (selectedDate >= now) {
        return false;
    }
    if (taskToEdit?.dueDate) {
        const originalTzDate = new Date(
            new Date(taskToEdit.dueDate).getTime() -
            new Date(taskToEdit.dueDate).getTimezoneOffset() * 60000
        ).toISOString().slice(0, 16);
        
        if (new Date(taskToEdit.dueDate) >= selectedDate || dueDate === originalTzDate) {
            return false;
        }
    }
    return true;
};

const validateSprintDates = (selectedDate: Date, sprintId: string, sprints: any[]): string => {
    if (!sprintId) return '';
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) return '';

    if (sprint.startDate) {
        const sStart = new Date(sprint.startDate);
        sStart.setHours(0, 0, 0, 0);
        if (selectedDate < sStart) {
            return `Tarih ve saat sprint başlangıcından (${sStart.toLocaleDateString()}) önce olamaz.`;
        }
    }
    if (sprint.endDate) {
        const sEnd = new Date(sprint.endDate);
        sEnd.setHours(23, 59, 59, 999);
        if (selectedDate > sEnd) {
            return `Tarih ve saat sprint bitişinden (${sEnd.toLocaleDateString()}) sonra olamaz.`;
        }
    }
    return '';
};

const validateDueDateHelper = (
    dueDate: string,
    taskToEdit: any,
    sprintId: string,
    sprints: any[]
): string => {
    if (!dueDate) return '';

    const selectedDate = new Date(dueDate);
    
    if (validatePastDueDate(selectedDate, taskToEdit, dueDate)) {
        return 'Tarih ve saat şu anki zamanın gerisinde olamaz.';
    }

    return validateSprintDates(selectedDate, sprintId, sprints);
};

const parseTemplateTagHelper = (projectTag: string | undefined): { prefix: string; number: string } => {
    if (!projectTag) {
        return { prefix: '', number: '' };
    }
    const parts = projectTag.split('-');
    if (parts.length === 2) {
        return { prefix: parts[0], number: parts[1] };
    }
    return { prefix: projectTag, number: '' };
};

const computeDueDate = (timeVal: string, dateVal: string) => {
    if (timeVal) return `${dateVal}T${timeVal}`;
    if (dateVal) return `${dateVal}T00:00`;
    return '';
};

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    groupId,
    onTaskCreated,
    taskToEdit,
    members,
    isAdmin,
    currentUserId,
    allTasks = [],
    sprints = [],
    activeSprint,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('todo');
    const [priority, setPriority] = useState('medium');
    const [effort, setEffort] = useState<number | null>(null);
    const [assignedTo, setAssignedTo] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [tagPrefix, setTagPrefix] = useState('');  // 3 uppercase letters e.g. PRO
    const [tagNumber, setTagNumber] = useState('');  // numeric part e.g. 1
    const [showTagList, setShowTagList] = useState(false);
    const [dependsOnId, setDependsOnId] = useState<string | null>(null);
    const [sprintId, setSprintId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [dateError, setDateError] = useState<string>('');
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && !taskToEdit) {
            const fetchTemplates = async () => {
                try {
                    const res = await api.get(`/groups/${groupId}/templates`);
                    setTemplates(res.data);
                } catch (err) {
                    console.error('Failed to fetch templates', err);
                }
            };
            fetchTemplates();
        } else {
            setTemplates([]);
        }
    }, [isOpen, groupId, taskToEdit]);

    // Derived combined tag value, e.g. "PRO-1"
    const projectTag = tagPrefix.length === 3 && tagNumber ? `${tagPrefix}-${tagNumber}` : undefined;

    // Tags scoped to the selected sprint
    const sprintFilteredTags = Array.from(new Set(
        allTasks
            .filter(t => sprintId ? t.sprintId === sprintId : !t.sprintId)
            .map(t => t.projectTag)
            .filter(Boolean)
    )) as string[];

    const handlePrefixChange = (val: string) => {
        const upper = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        setTagPrefix(upper);
    };

    const handleNumberChange = (val: string) => {
        setTagNumber(val.replace(/\D/g, ''));
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
            setEffort(taskToEdit.effort || null);
            setAssignedTo(taskToEdit.assignedToId || '');
            // Format date for input (YYYY-MM-DDTHH:mm)
            if (taskToEdit.dueDate) {
                const dateObj = new Date(taskToEdit.dueDate);
                // Adjust for local timezone to show correct local time
                const tzOffset = dateObj.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                setDueDate(localISOTime);
            } else {
                setDueDate('');
            }
            setDependsOnId(taskToEdit.dependsOnId || null);
            setSprintId(taskToEdit.sprintId || '');
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
            setEffort(null);
            setAssignedTo('');
            setDueDate('');
            setDependsOnId(null);
            setSprintId(activeSprint?.id || '');
            resetTag();
        }
    }, [taskToEdit, isOpen]);

    useEffect(() => {
        setDateError(validateDueDateHelper(dueDate, taskToEdit, sprintId, sprints));
    }, [dueDate, sprintId, sprints, taskToEdit]);

    const handleSelectTemplate = (templateId: string) => {
        if (!templateId) return;
        const selected = templates.find(t => t.id === templateId);
        if (selected) {
            if (selected.title) setTitle(selected.title);
            if (selected.description) setDescription(selected.description);
            if (selected.priority) setPriority(selected.priority);
            if (selected.effort !== undefined && selected.effort !== null) setEffort(selected.effort);
            
            const { prefix, number } = parseTemplateTagHelper(selected.projectTag);
            setTagPrefix(prefix);
            setTagNumber(number);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;
        if (dateError) {
            alert(dateError);
            return;
        }

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
                    effort: effort || undefined,
                    dependsOnId: dependsOnId || null,
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
                    effort: effort || undefined,
                    dependsOnId: dependsOnId || undefined,
                    sprintId: sprintId || undefined,
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

    let submitButtonText = 'Create Task';
    if (isLoading) {
        submitButtonText = 'Saving...';
    } else if (taskToEdit) {
        submitButtonText = 'Save Changes';
    }

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
                    {!taskToEdit && templates.length > 0 && (
                        <div>
                            <label htmlFor="template-select" className="block text-sm font-medium text-indigo-600 dark:text-indigo-400">Start from Template</label>
                            <select
                                id="template-select"
                                onChange={(e) => handleSelectTemplate(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 bg-indigo-50 dark:bg-gray-900 text-indigo-900 dark:text-indigo-200 transition-colors text-sm"
                            >
                                <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="">Select a template...</option>
                                {templates.map((t: any) => (
                                    <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            required
                            disabled={!canEdit}
                        />
                    </div>
                    <div>
                        <label htmlFor="task-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            id="task-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            rows={3}
                            disabled={!canEdit}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                            <select
                                id="task-status"
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
                            <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                            <select
                                id="task-priority"
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

                    {/* Sprint Selector */}
                    {sprints.length > 0 && (
                        <div>
                            <label htmlFor="task-sprint" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sprint</label>
                            <select
                                id="task-sprint"
                                value={sprintId}
                                onChange={(e) => { setSprintId(e.target.value); setDependsOnId(null); }}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                disabled={!canEdit}
                            >
                                <option value="">Backlog (no sprint)</option>
                                {sprints.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.status === 'active' ? '⚡' : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Assign this task directly to a sprint</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="task-blocked-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blocked By</label>
                        <select
                            id="task-blocked-by"
                            value={dependsOnId || ''}
                            onChange={(e) => setDependsOnId(e.target.value || null)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">None</option>
                            {allTasks
                                .filter(t => (!taskToEdit || t.id !== taskToEdit.id) && (sprintId ? t.sprintId === sprintId : !t.sprintId))
                                .map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            {sprintId ? 'Showing tasks from the selected sprint' : 'Showing backlog tasks'}
                        </p>
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</span>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label htmlFor="task-due-date" className="block text-xs text-gray-500 mb-1">Tarih (Klavye ile girilebilir)</label>
                                <input
                                    id="task-due-date"
                                    type="date"
                                    value={dueDate ? dueDate.substring(0, 10) : ''}
                                    onChange={(e) => {
                                        const dateVal = e.target.value;
                                        const timeVal = dueDate?.includes('T') ? dueDate.substring(11, 16) : '23:59';
                                        setDueDate(dateVal ? `${dateVal}T${timeVal}` : '');
                                    }}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                    disabled={!canEdit}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="task-due-time" className="block text-xs text-gray-500 mb-1">Saat (Klavye ile girilebilir)</label>
                                <input
                                    id="task-due-time"
                                    type="time"
                                    value={dueDate?.includes('T') ? dueDate.substring(11, 16) : ''}
                                    onChange={(e) => {
                                        const timeVal = e.target.value;
                                        const dateVal = dueDate ? dueDate.substring(0, 10) : new Date().toISOString().substring(0, 10);
                                        setDueDate(computeDueDate(timeVal, dateVal));
                                    }}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                        {dateError && (
                            <p className="text-xs text-red-500 mt-1">{dateError}</p>
                        )}
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Effort</span>
                        <div className="flex gap-2">
                            {([1, 2, 3, 4, 5] as const).map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setEffort(effort === val ? null : val)}
                                    disabled={!canEdit}
                                    title={['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Very Hard'][val]}
                                    className={`flex-1 py-1.5 rounded-md text-sm font-bold border transition-colors disabled:opacity-50 ${(() => {
                                        if (effort !== val) {
                                            return 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700';
                                        }
                                        if (val <= 2) {
                                            return 'bg-green-500 border-green-500 text-white';
                                        }
                                        if (val === 3) {
                                            return 'bg-yellow-500 border-yellow-500 text-white';
                                        }
                                        return 'bg-red-500 border-red-500 text-white';
                                    })()}`}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">1 = Trivial &nbsp;·&nbsp; 5 = Very Hard</p>
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Tag</span>

                        {/* Existing tags toggle */}
                        {sprintFilteredTags.length > 0 && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowTagList(v => !v)}
                                    className="mt-1 mb-1 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                >
                                    <span>{showTagList ? '▲' : '▼'}</span>
                                    {showTagList ? 'Hide' : 'Show'} existing tags ({sprintFilteredTags.length})
                                </button>
                                {showTagList && (
                                    <div className="mb-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                                        {sprintFilteredTags.map(tag => (
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
                                    aria-label="Project tag prefix"
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
                                    aria-label="Project tag number"
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
                        <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                        <select
                            id="task-assignee"
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
                                {submitButtonText}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
