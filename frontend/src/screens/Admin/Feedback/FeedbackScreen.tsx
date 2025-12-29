import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    MessageCircle, Search, Filter, Smile, Meh, Frown, User, MapPin, Phone
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Feedback {
    feedback_id: number;
    feedback_type: 'Good' | 'Average' | 'Bad';
    patient_status_snapshot: string;
    comments: string;
    created_at: string;
    patient_name: string;
    phone_number: string;
    first_name: string; // Employee First Name
    last_name: string;  // Employee Last Name
    branch_name: string;
}

const FeedbackScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, good: 0, average: 0, bad: 0 });
    
    // Filters
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'Good' | 'Average' | 'Bad'>('all');

    useEffect(() => {
        if (user) fetchFeedback();
    }, [user, filterType, search]); // Re-fetch on filter change or use client-side filtering? 
                                    // API supports search, but let's debounce or just fetch all and filter client side if small data?
                                    // The API we built supports search params. Let's use them.

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user) fetchFeedback();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const empId = (user as any).employee_id || user?.id;
            let url = `${API_URL}/admin/feedback.php?action=fetch_feedback&user_id=${empId}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (filterType !== 'all') url += `&type=${filterType}`;

            const res = await fetch(url);
            const json = await res.json();
            if (json.status === 'success') {
                setFeedbacks(json.data);
                setStats(json.stats);
            } else {
                setFeedbacks([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Good': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'Average': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
            case 'Bad': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
            default: return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Good': return <Smile size={16} strokeWidth={2.5} />;
            case 'Average': return <Meh size={16} strokeWidth={2.5} />;
            case 'Bad': return <Frown size={16} strokeWidth={2.5} />;
            default: return <MessageCircle size={16} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200 font-sans">
            
            {/* Header */}
            <header className="px-6 py-4 pt-10 sticky top-0 z-30 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Quality Control</p>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Patient Feedback</h1>
                    </div>
                </div>

                 {/* Search & Filter Bar */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="Search feedback..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Filter Type Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                         <button 
                            onClick={() => setFilterType('all')}
                            className={`p-2.5 rounded-lg transition-all ${filterType === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                            <Filter size={16} />
                         </button>
                         <button 
                            onClick={() => setFilterType(filterType === 'Good' ? 'all' : 'Good')}
                            className={`p-2.5 rounded-lg transition-all ${filterType === 'Good' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-emerald-500'}`}
                         >
                            <Smile size={16} />
                         </button>
                         <button 
                            onClick={() => setFilterType(filterType === 'Bad' ? 'all' : 'Bad')}
                            className={`p-2.5 rounded-lg transition-all ${filterType === 'Bad' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-400 hover:text-rose-500'}`}
                         >
                            <Frown size={16} />
                         </button>
                    </div>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3 px-6 pt-6">
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.good}</span>
                    <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-wider">Good</span>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.average}</span>
                    <span className="text-[10px] font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-wider">Neutral</span>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.bad}</span>
                    <span className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase tracking-wider">Bad</span>
                </div>
            </div>

            {/* List */}
            <main className="flex-1 p-6 space-y-4 pb-24 overflow-y-auto">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-medium">No feedback found</div>
                ) : (
                    feedbacks.map(fb => (
                        <div key={fb.feedback_id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                            
                            {/* Header: Patient & Rating */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                        {(fb.patient_name || 'A').charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                                            {fb.patient_name}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                            {new Date(fb.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${getTypeColor(fb.feedback_type)}`}>
                                    {getTypeIcon(fb.feedback_type)}
                                    <span className="text-[10px] font-black uppercase tracking-wide">{fb.feedback_type}</span>
                                </div>
                            </div>

                            {/* Comment */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl mb-3">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 italic">
                                    "{fb.comments || 'No comments provided.'}"
                                </p>
                            </div>

                            {/* Footer: Branch & Staff & Action */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50 mt-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                                        <MapPin size={10} />
                                        <span>{fb.branch_name || 'Global'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                                        <User size={10} />
                                        <span>{fb.first_name} {fb.last_name}</span>
                                    </div>
                                </div>
                                
                                {fb.phone_number && (
                                    <a 
                                        href={`tel:${fb.phone_number}`}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                                    >
                                        <Phone size={12} fill="currentColor" />
                                        <span className="text-[10px] font-black uppercase tracking-wide">Call Patient</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};

export default FeedbackScreen;
