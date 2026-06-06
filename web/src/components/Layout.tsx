import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutGrid, CheckSquare, User, Settings as SettingsIcon, LogOut, ChevronLeft, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import logo from '../assets/logo.png';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebar_open');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const toggleSidebar = () => {
        setIsSidebarOpen((prev: boolean) => {
            const next = !prev;
            localStorage.setItem('sidebar_open', JSON.stringify(next));
            return next;
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
        { name: 'My Tasks', path: '/my-tasks', icon: CheckSquare },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: SettingsIcon },
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 flex flex-col h-full transition-all duration-300 ease-in-out flex-shrink-0 ${
                isSidebarOpen 
                    ? 'w-64 border-r border-gray-200 dark:border-gray-700' 
                    : 'w-0 overflow-hidden border-r-0'
            }`}>
                {/* Brand Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                        <img src={logo} alt="Logo" className="h-9 w-9 object-contain flex-shrink-0" />
                        <span className="font-bold text-[14px] text-gray-900 dark:text-white whitespace-nowrap">Business Tracking App</span>
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-950 dark:hover:text-white'
                                }`}
                            >
                                <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User Info & Logout */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="flex items-center space-x-3 mb-3 px-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Global Header */}
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between flex-shrink-0 transition-colors duration-200">
                    <div className="flex items-center">
                        {!isSidebarOpen && (
                            <>
                                <button
                                    onClick={toggleSidebar}
                                    className="mr-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                    title="Open sidebar"
                                >
                                    <Menu size={20} />
                                </button>
                                <div className="flex items-center space-x-2.5">
                                    <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
                                    <span className="font-bold text-[14px] text-gray-900 dark:text-white whitespace-nowrap">Business Tracking App</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        <NotificationBell />
                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Welcome, {user?.name}</span>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-hidden relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
