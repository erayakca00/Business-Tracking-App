import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CreateGroupModal from '../components/CreateGroupModal';
import NotificationBell from '../components/NotificationBell';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchGroups = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/groups');
            setGroups(response.data);
        } catch (error) {
            console.error('Failed to fetch groups', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleGroupClick = (groupId: string) => {
        navigate(`/groups/${groupId}`);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
            <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Business Tracking App</h1>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-gray-700 dark:text-gray-300">Welcome, {user?.name}</span>
                            <div className="mr-2 flex items-center">
                                <NotificationBell />
                            </div>
                            <button
                                onClick={() => navigate('/profile')}
                                className="mr-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="mr-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Settings
                            </button>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Groups</h2>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Create Group
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400 text-lg">No groups found. Create one to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {groups.map((group: any) => (
                                <div
                                    key={group.id}
                                    onClick={() => handleGroupClick(group.id)}
                                    className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer border border-transparent dark:border-gray-700"
                                >
                                    <div className="px-4 py-5 sm:p-6">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">{group.name}</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <CreateGroupModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onGroupCreated={fetchGroups}
            />
        </div>
    );
};

export default Dashboard;
