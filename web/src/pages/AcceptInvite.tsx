import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AcceptInvite = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAuthenticated = !!user;

    const [status, setStatus] = useState<'loading' | 'info' | 'error' | 'accepting'>('loading');
    const [inviteDetails, setInviteDetails] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInviteDetails = async () => {
            if (!token) {
                setStatus('error');
                setError('Invitation token is missing.');
                return;
            }

            try {
                const response = await api.get(`/groups/invite/details?token=${token}`);
                setInviteDetails(response.data);
                setStatus('info');
            } catch (err: any) {
                setStatus('error');
                setError(err.response?.data?.message || 'Failed to load invitation details. The invitation may be invalid or expired.');
            }
        };

        fetchInviteDetails();
    }, [token]);

    const handleAccept = async () => {
        if (!token) return;
        setStatus('accepting');
        setError('');

        try {
            const response = await api.post('/groups/invite/accept', { token });
            const { groupId } = response.data;
            navigate(`/groups/${groupId}`);
        } catch (err: any) {
            setStatus('info'); // keep details visible
            setError(err.response?.data?.message || 'Failed to accept invitation.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
                <div className="text-center">
                    {status === 'loading' && (
                        <div className="space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading invitation...</h2>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Invitation</h2>
                            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3.5 rounded-md border border-red-200 dark:border-red-900/50">{error}</p>
                            <div className="mt-6">
                                <Link
                                    to="/dashboard"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                        </div>
                    )}

                    {inviteDetails && (status === 'info' || status === 'accepting') && (
                        <div className="space-y-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Group Invitation</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-900 dark:text-white">{inviteDetails.inviterName}</strong> has invited you to join the group task board <strong className="text-gray-900 dark:text-white">{inviteDetails.groupName}</strong>.
                            </p>

                            {isAuthenticated ? (
                                <div className="space-y-4">
                                    <button
                                        onClick={handleAccept}
                                        disabled={status === 'accepting'}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                    >
                                        {status === 'accepting' ? 'Joining...' : 'Accept Invitation'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                                        You must be logged in to accept this invitation.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            to={`/login?inviteToken=${token}`}
                                            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                                        >
                                            Sign in to Accept
                                        </Link>
                                        <Link
                                            to={`/register?inviteToken=${token}`}
                                            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                                        >
                                            Create Account
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-950/20 p-2.5 rounded-md border border-red-200 dark:border-red-900/50">{error}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;
