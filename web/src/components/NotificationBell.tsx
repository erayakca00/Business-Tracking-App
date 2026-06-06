import React, { useState, useEffect, useRef } from 'react';
import { Bell, UserPlus, Check, X as XIcon } from 'lucide-react';
import { AppNotification, notificationsService } from '../services/notifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface PendingInvitation {
    id: string;
    token: string;
    groupName: string;
    inviterName: string;
    createdAt: string;
    expiresAt: string;
}

const NotificationBell = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const data = await notificationsService.getNotifications();
            setNotifications(data);
            const unread = data.filter((n: AppNotification) => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const fetchPendingInvitations = async () => {
        try {
            const res = await api.get('/groups/my-invitations');
            setPendingInvitations(res.data);
        } catch (error) {
            console.error('Failed to fetch pending invitations', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        fetchPendingInvitations();
        const interval = setInterval(() => {
            fetchNotifications();
            fetchPendingInvitations();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.isRead) {
            try {
                await notificationsService.markAsRead(notification.id);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
            } catch (e) {
                console.error('Failed to mark as read', e);
            }
        }
        setIsOpen(false);
        if (notification.taskId) {
            try {
                const taskRes = await api.get(`/tasks/${notification.taskId}`);
                if (taskRes.data?.groupId) {
                    navigate(`/groups/${taskRes.data.groupId}?taskId=${notification.taskId}`);
                } else {
                    navigate('/dashboard');
                }
            } catch (e) {
                console.error("Failed to fetch task details for navigation", e);
                navigate('/dashboard');
            }
        }
    };

    const handleAcceptInvitation = async (invitation: PendingInvitation) => {
        setAcceptingId(invitation.id);
        try {
            const res = await api.post('/groups/invite/accept', { token: invitation.token });
            setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
            setIsOpen(false);
            if (res.data?.groupId) {
                navigate(`/groups/${res.data.groupId}`);
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('Failed to accept invitation:', err);
            alert(err.response?.data?.message || 'Failed to accept invitation');
        } finally {
            setAcceptingId(null);
        }
    };

    const handleDeclineInvitation = async (invitation: PendingInvitation) => {
        setDecliningId(invitation.id);
        try {
            await api.post(`/groups/my-invitations/${invitation.id}/decline`);
            setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        } catch (err: any) {
            console.error('Failed to decline invitation:', err);
            alert(err.response?.data?.message || 'Failed to decline invitation');
        } finally {
            setDecliningId(null);
        }
    };

    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsService.markAllAsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) {
            console.error('Failed to mark all as read', e);
        }
    };

    const totalBadge = unreadCount + pendingInvitations.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none"
            >
                <Bell size={20} />
                {totalBadge > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {totalBadge > 99 ? '99+' : totalBadge}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {/* Pending Invitations Section */}
                        {pendingInvitations.length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserPlus size={12} />
                                        Pending Invitations ({pendingInvitations.length})
                                    </p>
                                </div>
                                {pendingInvitations.map(invitation => (
                                    <div
                                        key={invitation.id}
                                        className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-amber-50/30 dark:bg-amber-900/10"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                                                    <UserPlus size={14} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                                    <span className="font-bold">{invitation.inviterName}</span>
                                                    {' '}invited you to join{' '}
                                                    <span className="font-semibold text-purple-600 dark:text-purple-400">{invitation.groupName}</span>
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAcceptInvitation(invitation); }}
                                                        disabled={acceptingId === invitation.id}
                                                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        <Check size={12} />
                                                        {acceptingId === invitation.id ? 'Joining...' : 'Accept'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeclineInvitation(invitation); }}
                                                        disabled={decliningId === invitation.id}
                                                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        <XIcon size={12} />
                                                        {decliningId === invitation.id ? 'Declining...' : 'Decline'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Regular Notifications */}
                        {notifications.length === 0 && pendingInvitations.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <button
                                    type="button"
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left block px-4 py-3 pb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${notification.isRead ? '' : 'bg-blue-50/50 dark:bg-blue-900/20'}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {notification.actor?.avatar ? (
                                                <img src={notification.actor.avatar} alt={notification.actor.name} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                                                    {notification.actor?.name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                <span className="font-bold">{notification.actor?.name || 'Unknown User'}</span>
                                                {' '}
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="flex-shrink-0 flex items-center">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
