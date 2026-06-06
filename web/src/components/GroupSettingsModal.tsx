import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { UserMinus, Trash2 } from 'lucide-react';

interface GroupSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    members: any[];
    isAdmin: boolean;
    isOwner: boolean;
    onSettingsChanged: () => void;
    onDeleteGroup: () => void;
    currentUserId?: string;
}

const GroupSettingsModal = ({ isOpen, onClose, groupId, members, isAdmin, isOwner, onSettingsChanged, onDeleteGroup, currentUserId }: GroupSettingsModalProps) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'members' | 'templates' | 'danger'>('members');
    const [invitations, setInvitations] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);

    const fetchInvitations = async () => {
        try {
            const res = await api.get(`/groups/${groupId}/invitations`);
            setInvitations(res.data);
        } catch (err) {
            console.error('Failed to fetch invitations', err);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get(`/groups/${groupId}/templates`);
            setTemplates(res.data);
        } catch (err) {
            console.error('Failed to fetch templates', err);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!globalThis.confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.delete(`/templates/${templateId}`);
            fetchTemplates();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete template');
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'members' && isAdmin) {
                fetchInvitations();
            } else if (activeTab === 'templates') {
                fetchTemplates();
            }
        }
    }, [isOpen, groupId, isAdmin, activeTab]);

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.post(`/groups/${groupId}/invite`, { email });
            setEmail('');
            fetchInvitations();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!globalThis.confirm('Are you sure you want to remove this member?')) return;
        try {
            await api.delete(`/groups/${groupId}/users/${userId}`);
            onSettingsChanged();
            if (userId === currentUserId) {
                 onClose();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to remove member');
            alert(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleRevokeInvitation = async (id: string) => {
        if (!globalThis.confirm('Are you sure you want to revoke this invitation?')) return;
        try {
            await api.delete(`/groups/${groupId}/invitations/${id}`);
            fetchInvitations();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to revoke invitation');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Group Settings">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('members')}
                >
                    Members
                </button>
                <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'templates' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('templates')}
                >
                    Templates
                </button>
                {isOwner && (
                    <button
                        className={`py-2 px-4 text-sm font-medium ${activeTab === 'danger' ? 'border-b-2 border-red-500 text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('danger')}
                    >
                        Danger Zone
                    </button>
                )}
            </div>

            {activeTab === 'members' && (
                <div className="space-y-6">
                    {isAdmin && (
                        <form onSubmit={handleInviteMember} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invite New Member</label>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        type="email"
                                        id="email"
                                        required
                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter email address"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                        {isLoading ? 'Inviting...' : 'Invite'}
                                    </button>
                                </div>
                                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                            </div>
                        </form>
                    )}

                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Current Members ({members.length})</h4>
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto pr-2 rounded-md border border-gray-200 dark:border-gray-700">
                            {members.map((member) => (
                                <li key={member.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {member.name}
                                            {member.role === 'admin' && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded uppercase">Admin</span>}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                                    </div>
                                    {isAdmin && member.userId !== currentUserId && member.role !== 'admin' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.userId)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Remove Member"
                                        >
                                            <UserMinus size={18} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {invitations.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Pending Invitations ({invitations.length})</h4>
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-40 overflow-y-auto pr-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                {invitations.map((invite) => (
                                    <li key={invite.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{invite.email}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Invited by: {invite.invitedBy?.name || 'Admin'}</p>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleRevokeInvitation(invite.id)}
                                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-semibold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                                title="Revoke Invitation"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'danger' && isOwner && (
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="text-red-800 dark:text-red-400 font-medium mb-1">Delete this group</h4>
                        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                            Once you delete a group, there is no going back. Please be certain.
                        </p>
                        <button
                            onClick={onDeleteGroup}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Delete Group
                        </button>
                    </div>
                </div>
            )}
            {activeTab === 'templates' && (
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Task Templates ({templates.length})</h4>
                    {templates.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No templates created for this group yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto pr-2 rounded-md border border-gray-200 dark:border-gray-700">
                            {templates.map((t: any) => (
                                <li key={t.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                            {t.title ? `Title: ${t.title}` : 'No title'} • {t.priority ? `Priority: ${t.priority}` : 'No priority'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTemplate(t.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        title="Delete Template"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default GroupSettingsModal;
