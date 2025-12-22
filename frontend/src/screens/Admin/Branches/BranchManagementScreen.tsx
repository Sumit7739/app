import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
    Activity, XCircle, Building, Search, 
    MapPin, Phone, CreditCard, Power
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Branch {
    branch_id: number;
    branch_name: string;
    clinic_name: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    pincode: string;
    phone_primary: string;
    phone_secondary: string;
    email: string;
    logo_primary_path: string;
    logo_secondary_path: string;
    is_active: number;
    current_budget: number | null;
    admin_employee_id: number;
    admin_first_name: string;
    admin_last_name: string;
    created_at: string;
}

const BranchManagementScreen: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<Partial<Branch> | null>(null);
    const [budgetData, setBudgetData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        let cleanPath = path;
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        if (cleanPath.startsWith('admin/')) return `https://prospine.in/${cleanPath}`;
        return `https://prospine.in/admin/${cleanPath}`;
    };

    useEffect(() => {
        fetchBranches();
    }, [user]);

    const fetchBranches = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/admin/branches.php?action=fetch_branches&user_id=${empId}`);
            const json = await res.json();
            if (json.status === 'success') {
                setBranches(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleBranchStatus = async (branchId: number, currentStatus: number) => {
        if (!user) return;
        const newStatus = currentStatus === 1 ? 0 : 1;
        setBranches(prev => prev.map(b => b.branch_id === branchId ? { ...b, is_active: newStatus } : b));
        try {
            const res = await fetch(`${API_URL}/admin/branches.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_status', branch_id: branchId, is_active: newStatus })
            });
            const json = await res.json();
            if (json.status !== 'success') fetchBranches();
        } catch (ex) {
            console.error(ex);
            fetchBranches();
        }
    };

    const handleSaveBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedBranch) return;
        setSubmitting(true);
        try {
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/admin/branches.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_budget',
                    user_id: empId,
                    branch_id: selectedBranch.branch_id,
                    daily_budget_amount: budgetData.amount,
                    effective_from_date: budgetData.date
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setIsBudgetModalOpen(false);
                fetchBranches();
            }
        } catch (ex) {
            console.error(ex);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredBranches = useMemo(() => {
        if (!searchTerm) return branches;
        const low = searchTerm.toLowerCase();
        return branches.filter(b => 
            (b.branch_name || '').toLowerCase().includes(low) || 
            (b.clinic_name || '').toLowerCase().includes(low) ||
            (b.city || '').toLowerCase().includes(low) ||
            (b.phone_primary || '').toLowerCase().includes(low)
        );
    }, [branches, searchTerm]);

    const stats = useMemo(() => ({
        total: branches.length,
        active: branches.filter(b => b.is_active === 1).length,
        inactive: branches.filter(b => b.is_active === 0).length
    }), [branches]);

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200 font-sans relative overflow-hidden">
            
            {/* Ambient Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 dark:bg-teal-900/10 blur-3xl"></div>
                <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-900/10 blur-3xl"></div>
            </div>

            {/* Header */}
            <header className="px-6 py-4 pt-11 flex items-center justify-between sticky top-0 z-30 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Configuration</p>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Branch Directory</h1>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto z-10 pb-24">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stats.total}</h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Active</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.active}</h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Inactive</p>
                        <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{stats.inactive}</h3>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        className="w-full bg-white dark:bg-gray-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors shadow-sm"
                        placeholder="Search branches..."
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Branch Cards */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                        </div>
                    ) : filteredBranches.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-sm">No branches found</div>
                    ) : (
                        filteredBranches.map(branch => (
                            <div 
                                key={branch.branch_id} 
                                onClick={() => navigate(`/admin/branches/${branch.branch_id}`)}
                                className={`bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all hover:shadow-md active:scale-[0.99] cursor-pointer ${!branch.is_active ? 'opacity-60' : ''}`}
                            >
                                {/* Card Header */}
                                <div className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Logo */}
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
                                            {branch.logo_primary_path ? (
                                                <img src={getImageUrl(branch.logo_primary_path)} className="w-full h-full object-contain" />
                                            ) : (
                                                <Building className="text-gray-400" size={20} />
                                            )}
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight truncate">{branch.branch_name}</h3>
                                                    <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider truncate">{branch.clinic_name}</p>
                                                </div>
                                                
                                                {/* Status Badge */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleBranchStatus(branch.branch_id, branch.is_active); }}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                                        branch.is_active 
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                                    }`}
                                                >
                                                    <Power size={10} />
                                                    {branch.is_active ? 'Online' : 'Offline'}
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1">ID: {branch.branch_id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Info Grid */}
                                <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl">
                                        <div className="flex items-center gap-2 text-blue-500 mb-1">
                                            <MapPin size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Location</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{branch.city}, {branch.state}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl">
                                        <div className="flex items-center gap-2 text-emerald-500 mb-1">
                                            <Phone size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Contact</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{branch.phone_primary}</p>
                                    </div>
                                </div>

                                {/* Budget Section */}
                                <div className="px-4 pb-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 text-indigo-500 mb-1">
                                                <CreditCard size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Daily Budget</span>
                                            </div>
                                            <p className="text-xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">
                                                {branch.current_budget ? `₹${Number(branch.current_budget).toLocaleString()}` : 'No limit'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setSelectedBranch(branch); 
                                                setBudgetData({ ...budgetData, amount: branch.current_budget?.toString() || '' }); 
                                                setIsBudgetModalOpen(true); 
                                            }}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                                        >
                                            Configure
                                        </button>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 dark:border-gray-700/50">
                                    <span>Admin: {branch.admin_first_name} {branch.admin_last_name}</span>
                                    <span>Since {new Date(branch.created_at).getFullYear()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Budget Modal */}
            {isBudgetModalOpen && selectedBranch && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Financial Control</p>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Set Daily Budget</h2>
                            </div>
                            <button 
                                onClick={() => setIsBudgetModalOpen(false)} 
                                className="w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <XCircle size={16} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveBudget} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Budget for {selectedBranch.branch_name}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">₹</span>
                                    <input 
                                        autoFocus 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 py-4 pl-10 pr-4 rounded-2xl text-2xl font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-100 dark:border-gray-700" 
                                        value={budgetData.amount} 
                                        onChange={e => setBudgetData({ ...budgetData, amount: e.target.value })} 
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">This will set the daily spending limit for this branch.</p>
                            </div>

                            <button 
                                disabled={submitting}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? <Activity className="animate-spin" size={16} /> : 'Confirm Budget'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManagementScreen;
