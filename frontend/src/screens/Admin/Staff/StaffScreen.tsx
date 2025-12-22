import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTheme } from '../../../hooks';
import { 
    Activity, ChevronDown, X, User, Mail, Shield, Building, Phone
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Employee {
    employee_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role_id: number;
    role_name: string;
    branch_id: number;
    branch_name: string;
    is_active: number;
    job_title?: string;
    address?: string;
    date_of_joining?: string;
}

const StaffScreen: React.FC = () => {
    const { user } = useAuthStore();
    const { theme, toggleTheme } = useTheme();
    const [staff, setStaff] = useState<Employee[]>([]);
    const [filteredStaff, setFilteredStaff] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<{role_id: number, role_name: string}[]>([]);
    const [branches, setBranches] = useState<{branch_id: number, branch_name: string}[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);

    useEffect(() => { fetchStaff(); }, [user]);

    useEffect(() => {
        let res = staff;
        if (search) {
            const low = search.toLowerCase();
            res = res.filter(s => 
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(low) || 
                s.email.toLowerCase().includes(low)
            );
        }
        if (filterRole) res = res.filter(s => s.role_id.toString() === filterRole);
        if (filterBranch) res = res.filter(s => s.branch_id?.toString() === filterBranch);
        setFilteredStaff(res);
    }, [staff, search, filterRole, filterBranch]);

    const fetchStaff = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/admin/staff.php?action=fetch_staff&user_id=${empId}`);
            const json = await res.json();
            if (json.status === 'success') {
                setStaff(json.data);
                setRoles(json.roles);
                setBranches(json.branches);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const branchStats = useMemo(() => {
        const stats: Record<string, number> = {};
        staff.forEach(emp => {
            const b = emp.branch_name || 'Global';
            stats[b] = (stats[b] || 0) + 1;
        });
        return stats;
    }, [staff]);

    return (
        <div className="flex flex-col h-screen bg-[#f8f9fc] dark:bg-[#0f172a] transition-all duration-300">
            {/* Header - Perfectly Clean Read-Only Header */}
            <header className="px-6 pt-12 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0 z-50">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">MANAGER PANEL</p>
                <h1 className="text-xl font-black text-[#1e293b] dark:text-white uppercase tracking-tight">Staff Roster</h1>
            </header>

            {/* Scrollable Content Area */}
            <main className="flex-1 overflow-y-auto p-6 space-y-8 touch-pan-y pb-24">
                {/* Distributions */}
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">TEAM DISTRIBUTION</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(branchStats).map(([name, count]) => (
                            <div key={name} className="px-4 py-2 bg-[#f0f9f9] dark:bg-teal-900/10 text-[#0db9a8] rounded-xl font-black text-[10px] uppercase tracking-widest border border-teal-500/5">
                                {name} <span className="mx-1 opacity-20">/</span> {count}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="space-y-3">
                    <input 
                        className="w-full bg-white dark:bg-gray-800 rounded-2xl py-4 px-6 text-sm font-bold text-gray-700 dark:text-gray-200 shadow-sm border border-transparent focus:border-teal-500/20 outline-none transition-all"
                        placeholder="Filter by name or email..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <select className="w-full bg-white dark:bg-gray-800 rounded-2xl py-4 px-5 appearance-none text-[10px] font-black text-slate-400 dark:text-gray-500 shadow-sm border border-transparent outline-none truncate pr-10" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                                <option value="">ALL ROLES</option>
                                {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        </div>
                        <div className="relative">
                            <select className="w-full bg-white dark:bg-gray-800 rounded-2xl py-4 px-5 appearance-none text-[10px] font-black text-slate-400 dark:text-gray-500 shadow-sm border border-transparent outline-none truncate pr-10" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                                <option value="">ALL BRANCHES</option>
                                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        </div>
                    </div>
                </div>

                {/* Staff Cards - READ ONLY Details */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-20 text-center"><Activity className="animate-spin text-teal-500 mx-auto" /></div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="py-20 text-center text-gray-300 font-black text-[10px] uppercase tracking-[0.2em]">No staff records found</div>
                    ) : (
                        filteredStaff.map(emp => (
                            <div 
                                key={emp.employee_id} 
                                onClick={() => setSelectedStaff(emp)}
                                className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-50 dark:border-gray-800 flex flex-col gap-4 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 flex items-center justify-center font-black text-sm uppercase">
                                            {emp.first_name[0]}{emp.last_name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white text-base leading-tight">{emp.first_name} {emp.last_name}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight mt-1 truncate max-w-[150px]">{emp.email}</p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${emp.is_active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-rose-500'}`} />
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{emp.role_name}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{emp.branch_name || 'Global'}</span>
                                    </div>
                                    <div className="text-[9px] font-black text-teal-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
                                        VIEW DETAILS
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Read-Only Info View */}
            {selectedStaff && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="px-6 pt-12 pb-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Staff Member Info</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">READ ONLY ACCESS</p>
                        </div>
                        <button onClick={() => setSelectedStaff(null)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
                            <X size={24} />
                        </button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-8 space-y-10">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-3xl font-black text-gray-300 dark:text-gray-700 mb-4 border border-gray-100 dark:border-gray-800 shadow-inner">
                                {selectedStaff.first_name[0]}{selectedStaff.last_name[0]}
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedStaff.first_name} {selectedStaff.last_name}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedStaff.role_name} / {selectedStaff.branch_name || 'Global'}</p>
                            <div className={`mt-4 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${selectedStaff.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {selectedStaff.is_active ? 'ACCOUNT ACTIVE' : 'ACCOUNT INACTIVE'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-400"><Mail size={18} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedStaff.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-400"><Phone size={18} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedStaff.phone_number || 'Not provided'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-400"><Building size={18} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Station</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedStaff.branch_name || 'Global'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-400"><Shield size={18} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Role</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedStaff.role_name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedStaff(null)} className="w-full h-16 bg-gray-900 dark:bg-gray-800 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                            CLOSE DETAILS
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffScreen;
