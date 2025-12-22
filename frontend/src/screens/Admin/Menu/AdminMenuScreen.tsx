import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    LayoutDashboard, 
    MessageCircle, 
    BookOpen, 
    LayoutGrid,
    LogOut,
    Wallet,
    Users,
    CheckCircle,
    Building,
    Share2
} from 'lucide-react';

const AdminMenuScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { 
            id: 'home', 
            label: 'Home', 
            desc: 'Dashboard Overview',
            icon: <LayoutDashboard size={22} />, 
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            link: '/admin/dashboard'
        },
        { 
            id: 'chat', 
            label: 'Chat', 
            desc: 'Team Communication',
            icon: <MessageCircle size={22} />, 
            color: 'from-teal-500 to-teal-600',
            bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
            link: '/admin/chat'
        },
        { 
            id: 'ledger', 
            label: 'Ledger', 
            desc: 'Financial Records',
            icon: <BookOpen size={22} />, 
            color: 'from-purple-500 to-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
            link: '/admin/ledger'
        },
        { 
            id: 'expenses', 
            label: 'Expenses', 
            desc: 'Approvals & Ops',
            icon: <Wallet size={22} />, 
            color: 'from-emerald-500 to-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
            link: '/admin/expenses'
        },
        { 
            id: 'staff', 
            label: 'Staff', 
            desc: 'Member Directory',
            icon: <Users size={22} />, 
            color: 'from-orange-500 to-orange-600',
            bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
            link: '/admin/staff'
        },
        { 
            id: 'attendance', 
            label: 'Attendance', 
            desc: 'Approvals Queue',
            icon: <CheckCircle size={22} />, 
            color: 'from-amber-500 to-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
            link: '/admin/attendance'
        },
        { 
            id: 'branches', 
            label: 'Branches', 
            desc: 'Clinic Network',
            icon: <Building size={22} />, 
            color: 'from-teal-500 to-teal-600',
            bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
            link: '/admin/branches'
        },
        { 
            id: 'referrals', 
            label: 'Referrals', 
            desc: 'Partner Mgmt',
            icon: <Share2 size={22} />, 
            color: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            link: '/admin/referrals'
        }

    ];

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-6 py-4 pt-[max(env(safe-area-inset-top),20px)] shadow-sm sticky top-0 z-20 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <LayoutGrid size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Menu</h1>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Admin Controls</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
                
                {/* User Profile Card */}
                <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-500/30">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 dark:text-white text-lg leading-tight">{user?.name || 'Admin'}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user?.role || 'Administrator'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors active:scale-95"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {menuItems.map((item, index) => (
                        <button 
                            key={item.id}
                            onClick={() => navigate(item.link)}
                            className="group relative bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center aspect-square hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`p-4 rounded-2xl mb-3 ${item.bg} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                                {item.icon}
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{item.label}</h3>
                            <p className="text-[10px] text-gray-500 mt-1">{item.desc}</p>
                            
                            {/* Hover Gradient Overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-gray-50/50 dark:from-transparent dark:to-gray-700/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </button>
                    ))}
                </div>

                {/* Footer Credits */}
                <div className="mt-8 mb-6 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">CareSyncOS Admin</p>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        v2.5.0
                    </p>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setShowLogoutModal(false)}
                    ></div>
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Logout?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Are you sure you want to sign out of your admin account?
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setShowLogoutModal(false)} 
                                className="py-3.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmLogout} 
                                className="py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMenuScreen;
