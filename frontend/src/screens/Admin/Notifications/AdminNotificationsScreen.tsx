import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    ArrowLeft, 
    Bell, 
    CheckCircle, 
    Clock, 
    ExternalLink 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Notification {
    notification_id: number;
    message: string;
    link_url: string;
    is_read: number;
    created_at: string;
    first_name: string;
    last_name: string;
}

const AdminNotificationsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/notifications.php?employee_id=${empId}`);
            const json = await res.json();
            if (json.status === 'success') {
                setNotifications(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await fetch(`${API_URL}/notifications.php`, {
                method: 'POST',
                body: JSON.stringify({ action: 'mark_read', notification_id: id })
            });
            setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n));
        } catch (e) { console.error(e); }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const empId = (user as any).employee_id || user.id;
            await fetch(`${API_URL}/notifications.php`, {
                method: 'POST',
                body: JSON.stringify({ action: 'mark_all_read', employee_id: empId })
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 px-4 py-3 pt-[max(env(safe-area-inset-top),12px)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 dark:text-white">Notifications</h1>
                    </div>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <button 
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1"
                    >
                        <CheckCircle size={14} />
                        Mark all read
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-10 text-gray-400 font-bold text-xs opacity-50 animate-pulse">Loading...</div>
                ) : notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div 
                            key={notif.notification_id} 
                            onClick={() => !notif.is_read && markAsRead(notif.notification_id)}
                            className={`relative p-4 rounded-2xl border transition-all ${
                                notif.is_read 
                                ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 opacity-70' 
                                : 'bg-white dark:bg-gray-800 border-indigo-100 dark:border-indigo-900/30 shadow-md shadow-indigo-500/5'
                            }`}
                        >
                            {!notif.is_read && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></div>
                            )}
                            
                            <div className="flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                    notif.is_read ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                    <Bell size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${notif.is_read ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-900 dark:text-white font-bold'}`}>
                                        {notif.message}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            <Clock size={10} />
                                            {timeAgo(notif.created_at)}
                                        </span>
                                        {notif.link_url && (
                                            <a 
                                                href={notif.link_url} 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Open <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Bell size={24} />
                        </div>
                        <h3 className="text-gray-900 dark:text-white font-bold">No Notifications</h3>
                        <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminNotificationsScreen;
