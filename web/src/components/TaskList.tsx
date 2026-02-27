import React, { useState } from 'react';

import { Trash2, X, ArrowUpCircle, Edit } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    assignedToId?: string;
    dueDate?: string;
    completedAt?: string;
    updatedAt?: string;
    createdAt?: string;
    projectTag?: string;
}

interface Member {
    userId: string;
    name: string;
    email: string;
}

interface TaskListProps {
    tasks: Task[];
    members: Member[];
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => Promise<void>;
    onViewDetail?: (task: Task) => void;
    onBulkDelete?: (taskIds: string[]) => Promise<void>;
    onBulkStatusChange?: (taskIds: string[], status: string) => Promise<void>;
    isAdmin: boolean;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    onSortChange: (column: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
    tasks,
    members,
    onEdit,
    onDelete,
    onViewDetail,
    onBulkDelete,
    onBulkStatusChange,
    isAdmin,
    sortBy,
    sortDir,
    onSortChange
}) => {
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const handleSelectTask = (taskId: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleSelectAll = () => {
        if (selectedTaskIds.length === tasks.length) {
            setSelectedTaskIds([]);
        } else {
            setSelectedTaskIds(tasks.map(t => t.id));
        }
    };

    const canEditTask = (_task: Task) => isAdmin;
    const canDeleteTask = isAdmin; // Only admin can delete

    return (
        <div className="flex-1 flex flex-col min-h-0">


            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 transition-colors duration-200">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 transition-colors"
                                />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('title')}>
                                <div className="flex items-center gap-1">Title {sortBy === 'title' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('tag')}>
                                <div className="flex items-center gap-1">Tag {sortBy === 'tag' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('status')}>
                                <div className="flex items-center gap-1">Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('priority')}>
                                <div className="flex items-center gap-1">Priority {sortBy === 'priority' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Assigned To
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('createdAt')}>
                                <div className="flex items-center gap-1">Created {sortBy === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('updatedAt')}>
                                <div className="flex items-center gap-1">Updated {sortBy === 'updatedAt' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" onClick={() => onSortChange('dueDate')}>
                                <div className="flex items-center gap-1">Due {sortBy === 'dueDate' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors duration-200">
                        {tasks.map((task) => (
                            <tr
                                key={task.id}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${selectedTaskIds.includes(task.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                onClick={() => onViewDetail ? onViewDetail(task) : handleSelectTask(task.id)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTaskIds.includes(task.id)}
                                        onChange={() => handleSelectTask(task.id)}
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 transition-colors"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
                                    {task.description && <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{task.description}</div>}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    {task.projectTag ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                            📁 {task.projectTag}
                                        </span>
                                    ) : <span className="text-gray-400 text-xs">—</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.status === 'done' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                        task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                            task.status === 'review' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                        }`}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                        task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                        }`}>
                                        {task.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {task.assignedToId ? (
                                        <div className="flex items-center">
                                            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2 border border-transparent dark:border-gray-600">
                                                {members.find(m => m.userId === task.assignedToId)?.name.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm text-gray-900 dark:text-gray-300">{members.find(m => m.userId === task.assignedToId)?.name || 'Unknown'}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-500 dark:text-gray-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                    {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                    {canEditTask(task) && (
                                        <button
                                            onClick={() => onEdit(task)}
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                                            title="Edit Task"
                                        >
                                            <Edit size={18} />
                                        </button>
                                    )}
                                    {canDeleteTask && (
                                        <button
                                            onClick={() => onDelete(task.id)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedTaskIds.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-50 transition-all duration-300">
                    <span className="mr-6 text-sm font-medium whitespace-nowrap">{selectedTaskIds.length} selected</span>

                    <div className="flex items-center space-x-4">
                        {selectedTaskIds.length === 1 && (
                            <button
                                onClick={() => {
                                    const task = tasks.find(t => t.id === selectedTaskIds[0]);
                                    if (task) onEdit(task);
                                }}
                                className="flex items-center text-sm font-medium hover:text-blue-300 transition-colors"
                            >
                                <span className="mr-2">✏️</span>
                                Edit
                            </button>
                        )}

                        {onBulkStatusChange && (
                            <div className="relative group">
                                <button className="flex items-center text-sm font-medium hover:text-blue-300 transition-colors py-2">
                                    <ArrowUpCircle size={16} className="mr-2" />
                                    Change Status
                                </button>
                                {/* Fixed Dropdown with bridge padding */}
                                <div className="absolute bottom-full left-0 pb-2 w-40 hidden group-hover:block">
                                    <div className="bg-white rounded-lg shadow-xl overflow-hidden text-gray-900">
                                        {['todo', 'in_progress', 'review', 'done'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    onBulkStatusChange(selectedTaskIds, status);
                                                    setSelectedTaskIds([]);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 capitalize"
                                            >
                                                {status.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {onBulkDelete && (
                            <button
                                onClick={() => {
                                    onBulkDelete(selectedTaskIds);
                                    setSelectedTaskIds([]);
                                }}
                                className="flex items-center text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setSelectedTaskIds([])}
                        className="ml-4 p-1 rounded-full hover:bg-gray-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div >
            )}
        </div >
    );
};

export default TaskList;
