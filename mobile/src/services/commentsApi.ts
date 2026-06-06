import { api } from './api';

export interface Comment {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: {
        id: string;
        name: string;
        email: string;
    };
}

export interface CreateCommentDto {
    content: string;
}

export interface UpdateCommentDto {
    content: string;
}

export interface TaskActivity {
    id: string;
    taskId: string;
    userId: string;
    type: string;
    data?: {
        from?: string;
        to?: string;
    };
    createdAt: string;
    actor: {
        id: string;
        name: string;
        email: string;
    };
}

export const commentsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getComments: builder.query<Comment[], string>({
            query: (taskId) => `/tasks/${taskId}/comments`,
            providesTags: (result, _error, taskId) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Comment' as const, id })),
                          { type: 'Comment', id: `LIST_${taskId}` },
                      ]
                    : [{ type: 'Comment', id: `LIST_${taskId}` }],
        }),
        addComment: builder.mutation<Comment, { taskId: string; content: string }>({
            query: ({ taskId, content }) => ({
                url: `/tasks/${taskId}/comments`,
                method: 'POST',
                body: { content },
            }),
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Comment', id: `LIST_${taskId}` },
            ],
        }),
        updateComment: builder.mutation<Comment, { id: string; content: string }>({
            query: ({ id, content }) => ({
                url: `/comments/${id}`,
                method: 'PATCH',
                body: { content },
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Comment', id }],
        }),
        deleteComment: builder.mutation<void, string>({
            query: (id) => ({
                url: `/comments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Comment', id }],
        }),
        getTaskActivity: builder.query<TaskActivity[], string>({
            query: (taskId) => `/tasks/${taskId}/activity`,
            providesTags: (_result, _error, taskId) => [
                { type: 'Activity', id: taskId },
            ],
        }),
    }),
});

export const {
    useGetCommentsQuery,
    useAddCommentMutation,
    useUpdateCommentMutation,
    useDeleteCommentMutation,
    useGetTaskActivityQuery,
} = commentsApi;
