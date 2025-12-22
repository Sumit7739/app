import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Activity, ChevronLeft, Building, MapPin, 
    Phone, Mail, CreditCard, Shield, XCircle
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

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

const BranchDetailScreen: React.FC = () => {
    const { branchId } = useParams<{ branchId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [branch, setBranch] = useState<Branch | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBranchDetail();
    }, [branchId]);

    const fetchBranchDetail = async () => {
        if (!user || !branchId) return;
        setLoading(true);
        try {
            const empId = (user as any).employee_id || user.id;
            const res = await fetch(`${API_URL}/admin/branches.php?action=fetch_branches&user_id=${empId}`);
            const json = await res.json();
            if (json.status === 'success') {
                const found = json.data.find((b: Branch) => b.branch_id === parseInt(branchId));
                setBranch(found || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        let cleanPath = path;
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        if (cleanPath.startsWith('admin/')) return `https://prospine.in/${cleanPath}`;
        return `https://prospine.in/admin/${cleanPath}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a]">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!branch) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a] p-6 text-center">
                <XCircle size={48} className="text-rose-500 mb-4" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Branch Not Found</h2>
                <p className="text-sm text-gray-500 mb-6">The branch you're looking for doesn't exist.</p>
                <button 
                    onClick={() => navigate('/admin/branches')}
                    className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm"
                >
                    Back to Directory
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200 font-sans relative overflow-hidden">
            
            {/* Ambient Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 dark:bg-teal-900/10 blur-3xl"></div>
                <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-900/10 blur-3xl"></div>
            </div>

            {/* Header */}
            <header className="px-6 py-4 pt-11 flex items-center gap-4 sticky top-0 z-30 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <button 
                    onClick={() => navigate('/admin/branches')}
                    className="w-9 h-9 rounded-full bg-white dark:bg-gray-800/50 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 active:scale-95 transition-transform backdrop-blur-sm"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Branch Details</p>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">{branch.branch_name}</h1>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide ${
                    branch.is_active 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                }`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto z-10 pb-24">
                
                {/* Branch Identity Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                            {branch.logo_primary_path ? (
                                <img src={getImageUrl(branch.logo_primary_path)} className="w-full h-full object-contain" />
                            ) : (
                                <Building className="text-gray-400" size={28} />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{branch.branch_name}</h3>
                            <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">{branch.clinic_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">ID: #{branch.branch_id}</p>
                        </div>
                    </div>
                </div>

                {/* Contact Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                                <Phone size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.phone_primary}</p>
                        {branch.phone_secondary && (
                            <p className="text-xs text-gray-500 mt-1">{branch.phone_secondary}</p>
                        )}
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                <Mail size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white break-all">{branch.email || 'N/A'}</p>
                    </div>
                </div>

                {/* Location Card */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                            <MapPin size={18} />
                        </div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Location</h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Address</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {branch.address_line_1}
                                {branch.address_line_2 && <><br/>{branch.address_line_2}</>}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">City & State</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.city}, {branch.state}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pincode</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white font-mono">{branch.pincode}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin Card */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500">
                            <Shield size={18} />
                        </div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Branch Admin</h3>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white text-lg font-black">
                            {branch.admin_first_name[0]}{branch.admin_last_name[0]}
                        </div>
                        <div>
                            <p className="font-black text-gray-900 dark:text-white">{branch.admin_first_name} {branch.admin_last_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch Supervisor</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl text-center">
                            <p className="text-[9px] font-bold text-gray-400 uppercase">ID</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">#{branch.branch_id}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl text-center">
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Est.</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">{new Date(branch.created_at).getFullYear()}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded-xl text-center">
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Currency</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">INR</p>
                        </div>
                    </div>
                </div>

                {/* Budget Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-indigo-900 dark:to-indigo-800 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                <CreditCard size={18} />
                            </div>
                            <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Daily Budget</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black">₹</span>
                            <span className="text-4xl font-black tracking-tight">
                                {branch.current_budget ? Number(branch.current_budget).toLocaleString() : '---'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {branch.current_budget 
                                ? 'Daily spending limit for operational expenses' 
                                : 'No budget limit configured for this branch'}
                        </p>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default BranchDetailScreen;
