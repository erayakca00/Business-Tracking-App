import { api } from './api';

export interface Group {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    createdAt: string;
}

export interface CreateGroupDto {
    name: string;
    description?: string;
}

export interface GroupMember {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: 'admin' | 'member';
    joinedAt: string;
}

export interface AddMemberDto {
    email: string;
}

export const groupsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getGroups: builder.query<Group[], void>({
            query: () => '/groups',
            providesTags: ['Group'],
        }),
        getGroupById: builder.query<Group, string>({
            query: (id) => `/groups/${id}`,
            providesTags: (result, error, id) => [{ type: 'Group', id }],
        }),
        createGroup: builder.mutation<Group, CreateGroupDto>({
            query: (body) => ({
                url: '/groups',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Group'],
        }),
        getGroupMembers: builder.query<GroupMember[], string>({
            query: (groupId) => `/groups/${groupId}/users`,
            providesTags: (result, error, groupId) => [{ type: 'GroupMember', id: groupId }],
        }),
        addGroupMember: builder.mutation<any, { groupId: string; email: string }>({
            query: ({ groupId, email }) => ({
                url: `/groups/${groupId}/invite`,
                method: 'POST',
                body: { email },
            }),
            invalidatesTags: (result, error, { groupId }) => [{ type: 'GroupMember', id: groupId }],
        }),
        removeGroupMember: builder.mutation<void, { groupId: string; userId: string }>({
            query: ({ groupId, userId }) => ({
                url: `/groups/${groupId}/users/${userId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { groupId }) => [{ type: 'GroupMember', id: groupId }, 'Group'],
        }),
        updateMemberRole: builder.mutation<any, { groupId: string; userId: string; role: 'admin' | 'member' }>({
            query: ({ groupId, userId, role }) => ({
                url: `/groups/${groupId}/users/${userId}/role`,
                method: 'PATCH',
                body: { role },
            }),
            invalidatesTags: (result, error, { groupId }) => [{ type: 'GroupMember', id: groupId }],
        }),
        transferOwnership: builder.mutation<any, { groupId: string; userId: string }>({
            query: ({ groupId, userId }) => ({
                url: `/groups/${groupId}/transfer-ownership/${userId}`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, { groupId }) => [{ type: 'GroupMember', id: groupId }, { type: 'Group', id: groupId }, 'Group'],
        }),
        deleteGroup: builder.mutation<void, string>({
            query: (id) => ({
                url: `/groups/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Group'],
        }),
        getMyPendingInvitations: builder.query<PendingInvitation[], void>({
            query: () => '/groups/my-invitations',
            providesTags: ['Notification', 'Group'],
        }),
        acceptInvitation: builder.mutation<any, { token: string }>({
            query: ({ token }) => ({
                url: '/groups/invite/accept',
                method: 'POST',
                body: { token },
            }),
            invalidatesTags: ['Group', 'Notification'],
        }),
        declineInvitation: builder.mutation<void, string>({
            query: (invitationId) => ({
                url: `/groups/my-invitations/${invitationId}/decline`,
                method: 'POST',
            }),
            invalidatesTags: ['Notification'],
        }),
    }),
});

export interface PendingInvitation {
    id: string;
    token: string;
    groupName: string;
    inviterName: string;
    createdAt: string;
    expiresAt: string;
}

export const {
    useGetGroupsQuery,
    useGetGroupByIdQuery,
    useCreateGroupMutation,
    useGetGroupMembersQuery,
    useAddGroupMemberMutation,
    useRemoveGroupMemberMutation,
    useUpdateMemberRoleMutation,
    useTransferOwnershipMutation,
    useDeleteGroupMutation,
    useGetMyPendingInvitationsQuery,
    useAcceptInvitationMutation,
    useDeclineInvitationMutation,
} = groupsApi;
