import { api } from './api';

export interface TaskTemplate {
    id: string;
    groupId: string;
    createdById: string | null;
    name: string;
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    effort?: number;
    projectTag?: string;
    createdAt: string;
}

export interface CreateTaskTemplateDto {
    name: string;
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    effort?: number;
    projectTag?: string;
    taskId?: string;
}

export const templatesApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getTemplatesByGroup: builder.query<TaskTemplate[], string>({
            query: (groupId) => `/groups/${groupId}/templates`,
            providesTags: (result) =>
                result
                    ? [...result.map(({ id }) => ({ type: 'Template' as const, id })), { type: 'Template', id: 'LIST' }]
                    : [{ type: 'Template', id: 'LIST' }],
        }),
        createTemplate: builder.mutation<TaskTemplate, { groupId: string; data: CreateTaskTemplateDto }>({
            query: ({ groupId, data }) => ({
                url: `/groups/${groupId}/templates`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Template', id: 'LIST' }],
        }),
        deleteTemplate: builder.mutation<void, string>({
            query: (id) => ({
                url: `/templates/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Template', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetTemplatesByGroupQuery,
    useCreateTemplateMutation,
    useDeleteTemplateMutation,
} = templatesApi;
