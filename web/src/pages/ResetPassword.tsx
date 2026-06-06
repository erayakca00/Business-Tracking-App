import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (!token) {
            setError('Reset token is missing from the URL.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/auth/reset-password', { token, password });
            setSuccess('Your password has been reset successfully.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Reset Password
                    </h2>
                </div>

                {!token ? (
                    <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-950/20 p-3.5 rounded-md border border-red-200 dark:border-red-900/50">
                        Invalid password reset link. Please request a new one.
                        <div className="mt-4">
                            <Link to="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                Request reset link
                            </Link>
                        </div>
                    </div>
                ) : success ? (
                    <div className="space-y-6 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-950/20 p-3.5 rounded-md border border-green-200 dark:border-green-900/50">
                            {success}
                        </div>
                        <div className="mt-4">
                            <Link
                                to="/login"
                                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-950/20 p-2.5 rounded-md border border-red-200 dark:border-red-900/50">{error}</div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
