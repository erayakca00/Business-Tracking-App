import { api } from './api';
import { Task } from './tasksApi';

export interface Sprint {
    id: string;
    groupId: string;
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    status: 'planned' | 'active' | 'completed';
    createdAt: string;
    tasks?: Task[];
}

export interface CreateSprintDto {
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
}

export interface UpdateSprintDto {
    name?: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
}

export const sprintsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getSprintsByGroup: builder.query<Sprint[], string>({
            query: (groupId) => `/groups/${groupId}/sprints`,
            providesTags: (result, _error, _groupId) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'Sprint' as const, id })), { type: 'Sprint', id: 'LIST' }]
                    : [{ type: 'Sprint', id: 'LIST' }],
        }),
        getBacklogByGroup: builder.query<Task[], string>({
            query: (groupId) => `/groups/${groupId}/backlog`,
            providesTags: (result, _error, _groupId) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'Backlog' as const, id })), { type: 'Backlog', id: 'LIST' }]
                    : [{ type: 'Backlog', id: 'LIST' }],
        }),
        createSprint: builder.mutation<Sprint, { groupId: string; data: CreateSprintDto }>({
            query: ({ groupId, data }) => ({
                url: `/groups/${groupId}/sprints`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Sprint', id: 'LIST' }],
        }),
        updateSprint: builder.mutation<Sprint, { sprintId: string; data: UpdateSprintDto }>({
            query: ({ sprintId, data }) => ({
                url: `/sprints/${sprintId}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { sprintId }) => [{ type: 'Sprint', id: sprintId }, { type: 'Sprint', id: 'LIST' }],
        }),
        deleteSprint: builder.mutation<void, string>({
            query: (sprintId) => ({
                url: `/sprints/${sprintId}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Sprint', id: 'LIST' }, { type: 'Backlog', id: 'LIST' }, { type: 'Task', id: 'LIST' }],
        }),
        startSprint: builder.mutation<Sprint, string>({
            query: (sprintId) => ({
                url: `/sprints/${sprintId}/start`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, sprintId) => [
                { type: 'Sprint', id: sprintId },
                { type: 'Sprint', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
            ],
        }),
        completeSprint: builder.mutation<Sprint, string>({
            query: (sprintId) => ({
                url: `/sprints/${sprintId}/complete`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, sprintId) => [
                { type: 'Sprint', id: sprintId },
                { type: 'Sprint', id: 'LIST' },
                { type: 'Backlog', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
            ],
        }),
        addTaskToSprint: builder.mutation<void, { sprintId: string; taskId: string }>({
            query: ({ sprintId, taskId }) => ({
                url: `/sprints/${sprintId}/tasks/${taskId}`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { sprintId }) => [
                { type: 'Sprint', id: sprintId },
                { type: 'Sprint', id: 'LIST' },
                { type: 'Backlog', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
            ],
        }),
        removeTaskFromSprint: builder.mutation<void, { sprintId: string; taskId: string }>({
            query: ({ sprintId, taskId }) => ({
                url: `/sprints/${sprintId}/tasks/${taskId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { sprintId }) => [
                { type: 'Sprint', id: sprintId },
                { type: 'Sprint', id: 'LIST' },
                { type: 'Backlog', id: 'LIST' },
                { type: 'Task', id: 'LIST' },
            ],
        }),
        getSprintBurndown: builder.query<any, string>({
            query: (sprintId) => `/sprints/${sprintId}/burndown`,
        }),
        getGroupAnalytics: builder.query<any, string>({
            query: (groupId) => `/groups/${groupId}/analytics`,
        }),
        getGroupTimeReport: builder.query<any[], string>({
            query: (groupId) => `/groups/${groupId}/time-report`,
            providesTags: (result, _error, _groupId) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'TimeLog' as const, id })), { type: 'TimeLog', id: 'LIST' }]
                    : [{ type: 'TimeLog', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetSprintsByGroupQuery,
    useGetBacklogByGroupQuery,
    useCreateSprintMutation,
    useUpdateSprintMutation,
    useDeleteSprintMutation,
    useStartSprintMutation,
    useCompleteSprintMutation,
    useAddTaskToSprintMutation,
    useRemoveTaskFromSprintMutation,
    useGetSprintBurndownQuery,
    useGetGroupAnalyticsQuery,
    useGetGroupTimeReportQuery,
} = sprintsApi;
