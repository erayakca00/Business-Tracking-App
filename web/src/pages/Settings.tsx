import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

const Settings: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
                    <Link to="/dashboard" className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-colors duration-200">
                    <div className="p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Appearance</h2>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-indigo-100 text-indigo-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Dark Mode</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`
                                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2
                                    ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}
                                `}
                            >
                                <span className="sr-only">Use setting</span>
                                <span
                                    aria-hidden="true"
                                    className={`
                                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                        ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
