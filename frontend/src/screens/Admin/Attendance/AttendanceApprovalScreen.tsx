import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    Activity, ChevronDown, CheckCircle, XCircle, Clock, Building, Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface AttendanceRecord {
    attendance_id: number;
    attendance_date: string;
    status: 'pending' | 'present' | 'rejected';
    remarks: string;
    approval_request_at: string;
    patient_id: number;
    patient_name: string;
    branch_name: string;
    patient_uid: string;
}

const AttendanceApprovalScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [branches, setBranches] = useState<{branch_id: number, branch_name: string}[]>([]);
    const [stats, setStats] = useState({ pending: 0 });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<number | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
    const [filterBranch, setFilterBranch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAttendance();
    }, [user, filterStatus, filterBranch]);

    const fetchAttendance = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/admin/attendance.php?action=fetch_attendance&user_id=${empId}&status=${filterStatus}&branch_id=${filterBranch}`);
            const json = await res.json();
            if (json.status === 'success') {
                setRecords(json.data);
                setBranches(json.branches || []);
                setStats(json.stats || { pending: 0 });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleUpdateStatus = async (attendanceId: number, newStatus: 'approved' | 'rejected') => {
        if (!user) return;
        setSubmitting(attendanceId);
        try {
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/admin/attendance.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'update_status', 
                    user_id: empId, 
                    attendance_id: attendanceId, 
                    status: newStatus 
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                fetchAttendance();
            }
        } catch (ex) { console.error(ex); }
        finally { setSubmitting(null); }
    };

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        const low = searchTerm.toLowerCase();
        return records.filter(r => 
            r.patient_name.toLowerCase().includes(low) || 
            r.patient_uid?.toLowerCase().includes(low) ||
            r.remarks?.toLowerCase().includes(low)
        );
    }, [records, searchTerm]);

    return (
        <div className="flex flex-col h-screen bg-[#f8f9fc] dark:bg-[#0f172a] transition-all duration-300">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0 z-50">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">TEAM OVERVIEW</p>
                <h1 className="text-xl font-black text-[#1e293b] dark:text-white uppercase tracking-tight">Attendance Approval</h1>
            </header>

            {/* Scrollable Area */}
            <main className="flex-1 overflow-y-auto p-6 space-y-8 touch-pan-y pb-24">
                
                {/* Pending Stat Hero */}
                <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] dark:from-teal-600 dark:to-teal-800 p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden group">
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">ACTIONS REQUIRED</p>
                            <h2 className="text-4xl font-black tracking-tighter">{stats.pending}</h2>
                            <p className="text-sm font-bold text-white/70 mt-1 uppercase tracking-widest">Pending Requests</p>
                        </div>
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform duration-500">
                            <Clock size={32} />
                        </div>
                    </div>
                    {/* Abstract Shapes */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
                </div>

                {/* Filter & Search Bar */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            className="w-full bg-white dark:bg-gray-800 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm border border-transparent focus:border-teal-500/20 transition-all outline-none"
                            placeholder="Search by name or UID..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <select className="w-full bg-white dark:bg-gray-800 rounded-2xl py-4 px-5 appearance-none text-[10px] font-black text-slate-400 dark:text-gray-500 shadow-sm border border-transparent outline-none truncate pr-10" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                                <option value="pending">PENDING ONLY</option>
                                <option value="approved">PRESENT</option>
                                <option value="rejected">REJECTED</option>
                                <option value="">ALL STATUS</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={14} />
                        </div>
                        <div className="relative">
                            <select className="w-full bg-white dark:bg-gray-800 rounded-2xl py-4 px-5 appearance-none text-[10px] font-black text-slate-400 dark:text-gray-500 shadow-sm border border-transparent outline-none truncate pr-10" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                                <option value="">ALL BRANCHES</option>
                                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={14} />
                        </div>
                    </div>
                </div>

                {/* List of Requests */}
                <div className="space-y-4">
                    {loading ? (
                         <div className="py-20 text-center"><Activity className="animate-spin text-teal-500 mx-auto" /></div>
                    ) : filteredRecords.length === 0 ? (
                         <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                                <CheckCircle size={32} className="text-gray-200 dark:text-gray-700" />
                            </div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No pending queue</p>
                         </div>
                    ) : (
                        filteredRecords.map(req => (
                            <div key={req.attendance_id} className="bg-white dark:bg-gray-800 p-6 rounded-[36px] shadow-sm border border-gray-50 dark:border-gray-800 flex flex-col gap-6 group hover:border-teal-500/10 transition-all">
                                {/* Top: Info Segment */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 flex flex-col items-center justify-center font-black leading-none border border-teal-500/5">
                                            <span className="text-lg">{new Date(req.attendance_date).getDate()}</span>
                                            <span className="text-[9px] uppercase mt-0.5">{new Date(req.attendance_date).toLocaleString('en', { month: 'short' })}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white text-lg leading-tight tracking-tight">{req.patient_name}</h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800">UID {req.patient_uid || req.patient_id}</span>
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                                                    <Building size={10} /> {req.branch_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1.5">REQUESTED</p>
                                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                            {req.approval_request_at ? new Date(req.approval_request_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Middle: Remarks */}
                                {req.remarks && (
                                    <div className="bg-gray-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">REMARKS</p>
                                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 leading-relaxed italic">"{req.remarks}"</p>
                                    </div>
                                )}

                                {/* Bottom: Action Bar */}
                                <div className="pt-2 flex gap-3">
                                    {req.status === 'pending' ? (
                                        <>
                                            <button 
                                                disabled={submitting !== null}
                                                onClick={() => handleUpdateStatus(req.attendance_id, 'approved')}
                                                className="flex-1 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white h-14 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-teal-500/10 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {submitting === req.attendance_id ? (
                                                    <Activity className="animate-spin" size={18} />
                                                ) : (
                                                    <>APPROVE <CheckCircle size={16} /></>
                                                )}
                                            </button>
                                            <button 
                                                disabled={submitting !== null}
                                                onClick={() => handleUpdateStatus(req.attendance_id, 'rejected')}
                                                className="w-14 h-14 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-rose-500 flex items-center justify-center rounded-2xl active:scale-95 transition-all"
                                            >
                                                <XCircle size={22} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className={`w-full h-12 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] border ${req.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-800'}`}>
                                            {req.status === 'present' ? (
                                                <><CheckCircle size={14} /> APPROVED & PROCESSED</>
                                            ) : (
                                                <><XCircle size={14} /> REQUEST REJECTED</>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default AttendanceApprovalScreen;
