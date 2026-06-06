import React from 'react';
import { Calendar, Trash2, CheckCircle, User } from 'lucide-react';

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
    dependsOnId?: string | null;
    dependsOn?: { title: string };
    blockedBy?: Task[];
    blocking?: Task[];
}

interface TaskBoardProps {
    tasks: Task[];
    members: any[];
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => Promise<void>;
    onViewDetail?: (task: Task) => void;
    isAdmin: boolean;
    currentUserId?: string;
    onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
}

const getPriorityColorClass = (priority: string) => {
    switch (priority) {
        case 'high':
            return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300';
        case 'medium':
            return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300';
        default:
            return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300';
    }
};

const COLUMNS = [
    { id: 'todo', title: 'TO DO', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'IN PROGRESS', color: 'bg-blue-50' },
    { id: 'review', title: 'IN REVIEW', color: 'bg-yellow-50' },
    { id: 'done', title: 'DONE', color: 'bg-green-50' },
];

const TaskBoard: React.FC<TaskBoardProps> = ({
    tasks,
    members,
    onEdit,
    onDelete,
    onViewDetail,
    isAdmin,
    currentUserId,
    onStatusChange
}) => {
    const getTasksByStatus = (status: string) => {
        return tasks.filter((task) => task.status === status);
    };

    const canEditTask = (task: Task) => isAdmin || (currentUserId && task.assignedToId === currentUserId);
    const canDeleteTask = isAdmin;

    const postsByStatus = COLUMNS.reduce((acc, column) => {
        acc[column.id] = getTasksByStatus(column.id);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full pb-4">
            {COLUMNS.map(column => (
                <div key={column.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg flex flex-col max-h-full border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                    <div className={`p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${column.color} dark:bg-opacity-10 bg-opacity-20`}>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{column.title}</h3>
                        <span className="bg-white dark:bg-gray-800 bg-opacity-50 px-2 py-0.5 rounded text-sm font-medium text-gray-600 dark:text-gray-400">
                            {postsByStatus[column.id].length}
                        </span>
                    </div>

                    <ul 
                        className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData('taskId');
                            if (taskId && onStatusChange) {
                                onStatusChange(taskId, column.id as Task['status']);
                            }
                        }}
                    >
                        {postsByStatus[column.id].map(task => {
                            const isBlocked = task.blockedBy?.some(b => b.status !== 'done') || false;
                            const activeBlockers = task.blockedBy?.filter(b => b.status !== 'done') || [];
                            return (
                                <li
                                    key={task.id}
                                    draggable={!isBlocked}
                                    onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                                    className={`bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 group relative ${isBlocked ? 'opacity-80' : ''}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onViewDetail ? onViewDetail(task) : (canEditTask(task) && onEdit(task))}
                                        className="w-full text-left p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md block cursor-pointer"
                                    >
                                        <span className="flex justify-between items-start mb-2 gap-2 pr-6">
                                            <span className="flex items-center flex-wrap gap-2">
                                                <span className="font-medium text-gray-900 dark:text-white text-sm leading-snug">{task.title}</span>
                                                <span className="flex gap-1 flex-wrap">
                                                    {task.projectTag && (
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                                            📁 {task.projectTag}
                                                        </span>
                                                    )}
                                                    {isBlocked && (
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" title="This task has unresolved blockers">
                                                            🔒 Blocked
                                                        </span>
                                                    )}
                                                    {!(task as any).assignedTo && !task.assignedToId && (
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                                                            👤 Unassigned
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                        </span>

                                        {task.description && (
                                            <span className="block text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3">
                                                {task.description}
                                            </span>
                                        )}

                                        {activeBlockers.length > 0 && (
                                            <span className="block mb-1.5 space-y-1">
                                                {activeBlockers.map(b => (
                                                    <span key={b.id} className="flex items-start gap-1">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-805">
                                                            🔒 Blocked by: {b.title}
                                                        </span>
                                                    </span>
                                                ))}
                                            </span>
                                        )}

                                        {task.dependsOn && activeBlockers.length === 0 && (
                                            <span className="block mb-1.5 flex items-start gap-1">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                                    🚧 Blocked by: {task.dependsOn.title}
                                                </span>
                                            </span>
                                        )}

                                        <span className="block mb-1">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getPriorityColorClass(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </span>

                                        <span className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 dark:border-gray-700">
                                            <span className="flex items-center text-gray-400 text-xs">
                                                {task.dueDate && (
                                                    <span className="flex items-center mr-3" title={`Deadline: ${new Date(task.dueDate).toLocaleDateString()}`}>
                                                        <Calendar size={12} className="mr-1" />
                                                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                                    </span>
                                                )}
                                                {task.completedAt && (
                                                    <span className="flex items-center text-green-600 dark:text-green-400" title={`Completed: ${new Date(task.completedAt).toLocaleDateString()}`}>
                                                        <CheckCircle size={12} className="mr-1" />
                                                    </span>
                                                )}
                                            </span>

                                            {task.assignedToId ? (
                                                <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800" title={members.find(m => m.userId === task.assignedToId)?.name}>
                                                    {members.find(m => m.userId === task.assignedToId)?.name.charAt(0) || '?'}
                                                </span>
                                            ) : (
                                                <span className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs border border-gray-200 dark:border-gray-600">
                                                    <User size={12} />
                                                </span>
                                            )}
                                        </span>

                                        {task.createdAt && (
                                            <span className="block mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 flex gap-2">
                                                <span title={`Created: ${new Date(task.createdAt).toLocaleString()}`}>📅 {new Date(task.createdAt).toLocaleDateString()}</span>
                                                {task.updatedAt && task.updatedAt !== task.createdAt && (
                                                    <span title={`Last edited: ${new Date(task.updatedAt).toLocaleString()}`} className="text-gray-300 dark:text-gray-600">· edited {new Date(task.updatedAt).toLocaleDateString()}</span>
                                                )}
                                            </span>
                                        )}
                                    </button>

                                    {canDeleteTask && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(task.id);
                                            }}
                                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 z-10"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default TaskBoard;
