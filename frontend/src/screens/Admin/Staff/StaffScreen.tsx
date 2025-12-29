import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTheme } from '../../../hooks';
import { 
    Activity, ChevronDown, X, Mail, Shield, Building, Phone, Plus, Save, Lock, Briefcase
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

interface StaffFormData {
    employee_id?: number | null;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role_id: string;
    branch_id: string;
    job_title: string;
    address: string;
    password?: string;
    is_active: number;
}

const initialForm: StaffFormData = {
    first_name: '', last_name: '', email: '', phone_number: '', 
    role_id: '', branch_id: '', job_title: '', address: '', 
    password: '', is_active: 1
};

const StaffScreen: React.FC = () => {
    const { user } = useAuthStore();
    useTheme();
    const [staff, setStaff] = useState<Employee[]>([]);
    const [filteredStaff, setFilteredStaff] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<{role_id: number, role_name: string}[]>([]);
    const [branches, setBranches] = useState<{branch_id: number, branch_name: string}[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState<StaffFormData>(initialForm);

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

    const handleAdd = () => {
        setFormData(initialForm);
        setShowModal(true);
    };

    const handleEdit = (emp: Employee) => {
        setFormData({
            employee_id: emp.employee_id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            email: emp.email,
            phone_number: emp.phone_number || '',
            role_id: emp.role_id.toString(),
            branch_id: emp.branch_id?.toString() || '',
            job_title: emp.job_title || '',
            address: emp.address || '',
            password: '', // Don't populate
            is_active: emp.is_active
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (!formData.first_name || !formData.last_name || !formData.email || !formData.role_id) {
            alert('Please fill in required fields');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const empId = (user as any).employee_id || user.id;
            const action = formData.employee_id ? 'update_staff' : 'create_staff';
            
            const res = await fetch(`${API_URL}/admin/staff.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    user_id: empId,
                    ...formData
                })
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                setShowModal(false);
                fetchStaff();
            } else {
                alert(json.message);
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
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
            {/* Header */}
            <header className="px-6 pt-12 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0 z-40 sticky top-0">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">MANAGER PANEL</p>
                        <h1 className="text-xl font-black text-[#1e293b] dark:text-white uppercase tracking-tight">Staff Roster</h1>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 transition-all active:scale-95"
                    >
                        <Plus size={24} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-8 touch-pan-y pb-24">
                {/* Stats */}
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

                {/* Filters */}
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

                {/* List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-20 text-center"><Activity className="animate-spin text-teal-500 mx-auto" /></div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="py-20 text-center text-gray-300 font-black text-[10px] uppercase tracking-[0.2em]">No staff records found</div>
                    ) : (
                        filteredStaff.map(emp => (
                            <div 
                                key={emp.employee_id} 
                                onClick={() => handleEdit(emp)}
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
                                        MANAGE
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="px-6 pt-12 pb-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {formData.employee_id ? 'Edit Staff' : 'Add Staff'}
                            </h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                                {formData.employee_id ? 'UPDATE DETAILS' : 'CREATE ACCOUNT'}
                            </p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
                            <X size={24} />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Status Toggle (Only for Edit) */}
                        {formData.employee_id && (
                             <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ACCOUNT STATUS</span>
                                <button 
                                    onClick={() => setFormData({...formData, is_active: formData.is_active ? 0 : 1})}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        formData.is_active 
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                        : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                    }`}
                                >
                                    {formData.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </button>
                             </div>
                        )}

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">First Name</label>
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 ring-teal-500/20"
                                        value={formData.first_name}
                                        onChange={e => setFormData({...formData, first_name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Last Name</label>
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 ring-teal-500/20"
                                        value={formData.last_name}
                                        onChange={e => setFormData({...formData, last_name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 ring-teal-500/20"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        type="email"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Role & Branch */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 pl-11 pr-10 text-sm font-bold text-gray-900 dark:text-white outline-none appearance-none"
                                        value={formData.role_id}
                                        onChange={e => setFormData({...formData, role_id: e.target.value})}
                                    >
                                        <option value="">Select Role</option>
                                        {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                </div>
                            </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Branch</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 pl-11 pr-10 text-sm font-bold text-gray-900 dark:text-white outline-none appearance-none"
                                        value={formData.branch_id}
                                        onChange={e => setFormData({...formData, branch_id: e.target.value})}
                                    >
                                        <option value="">Global / None</option>
                                        {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Optional Info */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Job Title</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 ring-teal-500/20"
                                        value={formData.job_title}
                                        onChange={e => setFormData({...formData, job_title: e.target.value})}
                                        placeholder="e.g. Senior Nurse"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 ring-teal-500/20"
                                        value={formData.phone_number}
                                        onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                    {formData.employee_id ? 'New Password (Optional)' : 'Password'}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 ring-teal-500/20"
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        type="password"
                                        placeholder={formData.employee_id ? "Leave blank to keep current" : "Min 8 characters"}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-24"></div> {/* Spacer */}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? 'SAVING...' : (
                                <>
                                    <Save size={18} strokeWidth={2.5} />
                                    {formData.employee_id ? 'SAVE CHANGES' : 'CREATE STAFF'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffScreen;
