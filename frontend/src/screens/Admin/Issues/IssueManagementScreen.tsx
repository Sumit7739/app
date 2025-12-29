import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    Bug, Search, Filter, MessageSquare, CheckCircle2, Clock, 
    AlertCircle, X, Send 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Issue {
    issue_id: number;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    release_schedule?: 'immediate' | 'nightly' | 'next_release';
    release_date?: string;
    created_at: string;
    admin_response?: string;
    branch_name: string;
    reported_by_name: string;
}

const IssueManagementScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeveloper, setIsDeveloper] = useState(false);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
    const [search, setSearch] = useState('');

    // Modal States
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    
    // Form States
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit States (Developer)
    const [editStatus, setEditStatus] = useState<string>('');
    const [editResponse, setEditResponse] = useState<string>('');
    const [editSchedule, setEditSchedule] = useState<string>('');

    useEffect(() => {
        if (user) fetchIssues();
    }, [user, statusFilter]); // Rely on client-side search filtering usually, or debounced effect

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const empId = (user as any).employee_id || user?.id;
            let url = `${API_URL}/admin/issues.php?action=fetch_issues&user_id=${empId}`;
            if (statusFilter !== 'all') url += `&status=${statusFilter}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await fetch(url);
            const json = await res.json();
            
            if (json.status === 'success') {
                setIssues(json.data);
                setIsDeveloper(json.is_developer);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleReportIssue = async () => {
        if (!reportDescription.trim()) return;
        setIsSubmitting(true);
        try {
            const empId = (user as any).employee_id || user?.id;
            const res = await fetch(`${API_URL}/admin/issues.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'report_issue',
                    user_id: empId,
                    description: reportDescription
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setShowReportModal(false);
                setReportDescription('');
                fetchIssues(); // Refresh
            } else {
                alert(json.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateIssue = async () => {
        if (!selectedIssue) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/admin/issues.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_issue',
                    issue_id: selectedIssue.issue_id,
                    status: editStatus,
                    admin_response: editResponse,
                    release_schedule: editSchedule
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setSelectedIssue(null);
                fetchIssues();
            } else {
                alert(json.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (issue: Issue) => {
        setSelectedIssue(issue);
        setEditStatus(issue.status);
        setEditResponse(issue.admin_response || '');
        setEditSchedule(issue.release_schedule || 'next_release');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={14} />;
            case 'in_progress': return <Clock size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200 font-sans">
            
            {/* Header */}
            <header className="px-6 py-4 pt-10 sticky top-0 z-30 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">System Support</p>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Issue Tracker</h1>
                    </div>
                    {!isDeveloper && (
                        <button 
                            onClick={() => setShowReportModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                        >
                            <Bug size={20} />
                        </button>
                    )}
                </div>

                {/* Search & Filter */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-indigo-500 outline-none"
                            placeholder="Search issues..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onBlur={fetchIssues}
                        />
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shrink-0">
                         {/* Simple status toggle for mobile real estate */}
                         <button 
                            onClick={() => setStatusFilter(prev => prev === 'all' ? 'pending' : prev === 'pending' ? 'completed' : 'all')}
                            className="px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-2"
                         >
                            <Filter size={14} />
                            {statusFilter === 'all' ? 'All' : statusFilter}
                         </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 space-y-4 pb-24 overflow-y-auto">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-medium">No issues found</div>
                ) : (
                    issues.map(issue => (
                        <div 
                            key={issue.issue_id}
                            onClick={() => isDeveloper ? openEditModal(issue) : setSelectedIssue(issue)}
                            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.99] transition-transform cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(issue.status)}`}>
                                    {getStatusIcon(issue.status)}
                                    {issue.status.replace('_', ' ')}
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">#{issue.issue_id}</span>
                            </div>
                            
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2 leading-snug">
                                {issue.description}
                            </h3>

                            {issue.admin_response && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-xl mb-3 flex gap-2">
                                    <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                                        <span className="font-bold opacity-70 block text-[10px] uppercase mb-0.5">Dev Response</span>
                                        {issue.admin_response}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                <div className="flex items-center gap-2">
                                     <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                         {issue.reported_by_name.charAt(0)}
                                     </div>
                                     <span className="text-[10px] font-bold text-gray-400 uppercase">{issue.reported_by_name}</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">{new Date(issue.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Developer Edit Modal */}
            {selectedIssue && isDeveloper && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-black text-gray-900 dark:text-white text-lg">Manage Issue #{selectedIssue.issue_id}</h3>
                            <button onClick={() => setSelectedIssue(null)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Reported Issue</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">{selectedIssue.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Status</label>
                                    <select 
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white border-none outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Schedule</label>
                                    <select 
                                        value={editSchedule}
                                        onChange={(e) => setEditSchedule(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white border-none outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="immediate">Immediate</option>
                                        <option value="nightly">Nightly Build</option>
                                        <option value="next_release">Next Release</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Dev Response</label>
                                <textarea 
                                    rows={4}
                                    value={editResponse}
                                    onChange={(e) => setEditResponse(e.target.value)}
                                    placeholder="Explain the fix or request info..."
                                    className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm font-medium text-gray-900 dark:text-white border-none outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                            <button 
                                onClick={handleUpdateIssue}
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Update Issue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin View Details Modal (Read Only) */}
            {selectedIssue && !isDeveloper && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-black text-gray-900 dark:text-white text-lg">Issue Details</h3>
                            <button onClick={() => setSelectedIssue(null)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Description</h4>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedIssue.description}</p>
                            </div>
                            <div className="flex gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Status</h4>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(selectedIssue.status)}`}>
                                        {selectedIssue.status.replace('_', ' ')}
                                    </span>
                                </div>
                                {selectedIssue.release_schedule && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Target Release</h4>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">
                                            {selectedIssue.release_schedule.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {selectedIssue.admin_response && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl">
                                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-1">Developer Response</h4>
                                    <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">{selectedIssue.admin_response}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Report Issue Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-white text-lg">Report New Issue</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Found a bug or need a feature?</p>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                             <textarea 
                                rows={6}
                                autoFocus
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                                placeholder="Describe the issue in detail..."
                                className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-sm font-medium text-gray-900 dark:text-white border-2 border-transparent focus:border-indigo-500 outline-none resize-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                             <button 
                                onClick={() => setShowReportModal(false)}
                                className="flex-1 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReportIssue}
                                disabled={isSubmitting || !reportDescription.trim()}
                                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Sending...' : <><Send size={18} /> Submit Report</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default IssueManagementScreen;
