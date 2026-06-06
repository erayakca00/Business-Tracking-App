import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Verification token is missing.');
                return;
            }

            try {
                const response = await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data?.message || 'Email verified successfully.');
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Failed to verify email. The token may be invalid or expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
                <div className="text-center">
                    {status === 'loading' && (
                        <div className="space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verifying your email...</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we activate your account.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Verified!</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h2>
                            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3.5 rounded-md border border-red-200 dark:border-red-900/50">{message}</p>
                            <div className="mt-6 flex flex-col gap-3">
                                <Link
                                    to="/register"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                                >
                                    Sign up again
                                </Link>
                                <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                    Back to Sign in
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
