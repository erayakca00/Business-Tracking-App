import React, { useState } from 'react';
import Modal from './Modal';
import api from '../services/api';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
    groupId: string;
}

const AddMemberModal = ({ isOpen, onClose, onMemberAdded, groupId }: AddMemberModalProps) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.post(`/groups/${groupId}/users`, { email });
            setEmail('');
            onMemberAdded();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Member">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member Email</label>
                    <input
                        type="email"
                        id="email"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                    />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex justify-end space-x-3 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Adding...' : 'Add Member'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddMemberModal;
