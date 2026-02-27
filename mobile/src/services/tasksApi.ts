import { api } from './api';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    completedAt?: string;
    groupId: string;
    assignedToId?: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    projectTag?: string;
}

export interface CreateTaskDto {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    groupId: string;
    assignedToId?: string | null;
    projectTag?: string;
}

export interface UpdateTaskDto {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    assignedToId?: string | null;
    projectTag?: string;
}

export const tasksApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getTasksByGroup: builder.query<Task[], string>({
            query: (groupId) => `/tasks?groupId=${groupId}`,
            providesTags: (result, error, groupId) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'Task' as const, id })), { type: 'Task', id: 'LIST' }]
                    : [{ type: 'Task', id: 'LIST' }],
        }),
        getTaskById: builder.query<Task, string>({
            query: (id) => `/tasks/${id}`,
            providesTags: (result, error, id) => [{ type: 'Task', id }],
        }),
        createTask: builder.mutation<Task, CreateTaskDto>({
            query: (body) => ({
                url: '/tasks',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Task', id: 'LIST' }],
        }),
        updateTask: builder.mutation<Task, { id: string; data: UpdateTaskDto }>({
            query: ({ id, data }) => ({
                url: `/tasks/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
        }),
        deleteTask: builder.mutation<void, string>({
            query: (id) => ({
                url: `/tasks/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Task', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetTasksByGroupQuery,
    useGetTaskByIdQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
} = tasksApi;
