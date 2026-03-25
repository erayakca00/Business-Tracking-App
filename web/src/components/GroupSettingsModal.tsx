import React, { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { UserMinus } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState<'members' | 'danger'>('members');

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.post(`/groups/${groupId}/users`, { email });
            setEmail('');
            onSettingsChanged();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Group Settings">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('members')}
                >
                    Members
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
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add New Member</label>
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
                                        {isLoading ? 'Adding...' : 'Add'}
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
        </Modal>
    );
};

export default GroupSettingsModal;
