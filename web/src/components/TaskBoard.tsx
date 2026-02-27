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
}

interface TaskBoardProps {
    tasks: Task[];
    members: any[];
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => Promise<void>;
    onViewDetail?: (task: Task) => void;
    isAdmin: boolean;
    currentUserId?: string;
}

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
    currentUserId
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

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {postsByStatus[column.id].map(task => (
                            <div
                                key={task.id}
                                className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer group relative"
                                onClick={() => onViewDetail ? onViewDetail(task) : (canEditTask(task) && onEdit(task))}
                            >
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-snug">{task.title}</h4>
                                        {task.projectTag && (
                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                                📁 {task.projectTag}
                                            </span>
                                        )}
                                    </div>
                                    {canDeleteTask && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(task.id);
                                            }}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 flex-shrink-0 -mr-1 -mt-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                {task.description && (
                                    <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3">
                                        {task.description}
                                    </p>
                                )}

                                <div className="mb-1">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${task.priority === 'high' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300' :
                                        task.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300' :
                                            'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                                        }`}>
                                        {task.priority}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 dark:border-gray-700">
                                    <div className="flex items-center text-gray-400 text-xs">
                                        {task.dueDate && (
                                            <div className="flex items-center mr-3" title={`Deadline: ${new Date(task.dueDate).toLocaleDateString()}`}>
                                                <Calendar size={12} className="mr-1" />
                                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                            </div>
                                        )}
                                        {task.completedAt && (
                                            <div className="flex items-center text-green-600 dark:text-green-400" title={`Completed: ${new Date(task.completedAt).toLocaleDateString()}`}>
                                                <CheckCircle size={12} className="mr-1" />
                                            </div>
                                        )}
                                    </div>

                                    {task.assignedToId ? (
                                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800" title={members.find(m => m.userId === task.assignedToId)?.name}>
                                            {members.find(m => m.userId === task.assignedToId)?.name.charAt(0) || '?'}
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs border border-gray-200 dark:border-gray-600">
                                            <User size={12} />
                                        </div>
                                    )}
                                </div>
                                {/* Date info */}
                                {task.createdAt && (
                                    <div className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 flex gap-2">
                                        <span title={`Created: ${new Date(task.createdAt).toLocaleString()}`}>📅 {new Date(task.createdAt).toLocaleDateString()}</span>
                                        {task.updatedAt && task.updatedAt !== task.createdAt && (
                                            <span title={`Last edited: ${new Date(task.updatedAt).toLocaleString()}`} className="text-gray-300 dark:text-gray-600">· edited {new Date(task.updatedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TaskBoard;
