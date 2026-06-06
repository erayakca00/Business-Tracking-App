import { api, BASE_URL } from './api';

export interface Attachment {
    id: string;
    taskId: string;
    userId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

export const attachmentsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getAttachments: builder.query<Attachment[], string>({
            query: (taskId) => `/tasks/${taskId}/attachments`,
            providesTags: (_result, _error, taskId) => [
                { type: 'Attachment', id: taskId },
            ],
        }),
        deleteAttachment: builder.mutation<void, { taskId: string; attachmentId: string }>({
            query: ({ taskId, attachmentId }) => ({
                url: `/tasks/${taskId}/attachments/${attachmentId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Attachment', id: taskId },
            ],
        }),
    }),
});

export const {
    useGetAttachmentsQuery,
    useDeleteAttachmentMutation,
} = attachmentsApi;

// ─── Upload helper (outside RTK Query — needs FormData + token) ──────────────
// RTK Query doesn't handle multipart upload progress well, so we use a plain
// fetch with manual token injection from the Redux store.

export async function uploadAttachment(
    taskId: string,
    token: string,
    file: { uri: string; name: string; type: string }
): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
    } as any);

    const response = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            // Do NOT set Content-Type — let fetch set it with the boundary
        },
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
    }

    return response.json();
}
