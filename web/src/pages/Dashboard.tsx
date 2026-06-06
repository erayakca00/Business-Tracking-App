import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CreateGroupModal from '../components/CreateGroupModal';

const Dashboard = () => {
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


    const handleGroupClick = (groupId: string) => {
        navigate(`/groups/${groupId}`);
    };

    const renderGroupsContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
            );
        }

        if (groups.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No groups found. Create one to get started!</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group: any) => (
                    <button
                        key={group.id}
                        onClick={() => handleGroupClick(group.id)}
                        className="text-left w-full bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer border border-transparent dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">{group.name}</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 z-10 shadow-sm transition-colors duration-200">
                <div className="flex justify-between items-center max-w-[98%] mx-auto w-full">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 max-w-[98%] mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Groups</h2>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Create Group
                    </button>
                </div>

                {renderGroupsContent()}
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
