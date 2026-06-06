import { api } from './api';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    completedAt?: string;
    groupId: string;
    assignedToId?: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    projectTag?: string;
    blockedBy?: Task[];
    blocking?: Task[];
    effortScore?: number;
    aiSummary?: string;
    aiSummaryUpdatedAt?: string;
}

export interface TimeLog {
    id: string;
    taskId: string;
    userId: string;
    startedAt: string;
    endedAt?: string;
    duration?: number; // duration in seconds
    note?: string;
    createdAt: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
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
    status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    assignedToId?: string | null;
    projectTag?: string;
}

export const tasksApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getTasksByGroup: builder.query<Task[], string>({
            query: (groupId) => `/groups/${groupId}/tasks`,
            providesTags: (result, _error, _groupId) =>
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
        addDependency: builder.mutation<Task, { id: string; blockingTaskId: string }>({
            query: ({ id, blockingTaskId }) => ({
                url: `/tasks/${id}/dependencies`,
                method: 'POST',
                body: { blockingTaskId },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
        }),
        removeDependency: builder.mutation<Task, { id: string; blockingId: string }>({
            query: ({ id, blockingId }) => ({
                url: `/tasks/${id}/dependencies/${blockingId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
        }),
        startTimeLog: builder.mutation<TimeLog, { id: string; note?: string }>({
            query: ({ id, note }) => ({
                url: `/tasks/${id}/time/start`,
                method: 'POST',
                body: { note },
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Task', id },
                { type: 'Task', id: 'LIST' },
                { type: 'TimeLog', id: 'LIST' },
            ],
        }),
        stopTimeLog: builder.mutation<TimeLog, string>({
            query: (id) => ({
                url: `/tasks/${id}/time/stop`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [
                { type: 'Task', id },
                { type: 'Task', id: 'LIST' },
                { type: 'TimeLog', id: 'LIST' },
            ],
        }),
        addManualTimeLog: builder.mutation<TimeLog, { id: string; durationSeconds: number; note?: string }>({
            query: ({ id, durationSeconds, note }) => ({
                url: `/tasks/${id}/time/manual`,
                method: 'POST',
                body: { durationSeconds, note },
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Task', id },
                { type: 'Task', id: 'LIST' },
                { type: 'TimeLog', id: 'LIST' },
            ],
        }),
        getTimeLogs: builder.query<TimeLog[], string>({
            query: (id) => `/tasks/${id}/time`,
            providesTags: (result, _error, _id) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'TimeLog' as const, id })), { type: 'TimeLog', id: 'LIST' }]
                    : [{ type: 'TimeLog', id: 'LIST' }],
        }),
        summarizeTask: builder.mutation<Task, string>({
            query: (id) => ({
                url: `/tasks/${id}/summarize`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetTasksByGroupQuery,
    useGetTaskByIdQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
    useAddDependencyMutation,
    useRemoveDependencyMutation,
    useStartTimeLogMutation,
    useStopTimeLogMutation,
    useAddManualTimeLogMutation,
    useGetTimeLogsQuery,
    useSummarizeTaskMutation,
} = tasksApi;

