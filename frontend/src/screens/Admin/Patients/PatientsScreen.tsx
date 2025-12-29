import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    Search, 
    Filter, 
    CheckCircle2,
    Clock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Patient {
    patient_id: number;
    patient_uid: string;
    patient_name: string;
    phone_number: string;
    status: 'active' | 'inactive' | 'completed';
    treatment_type: string;
    treatment_days: number;
    sessions_attended: number;
    plan_total_amount: number;
    total_paid: number;
    balance_due: number;
    credit_balance?: number;
    created_at: string;
}

const PatientsScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    useEffect(() => {
        if (user) {
            fetchPatients();
        }
    }, [user, search, statusFilter]);

    const fetchPatients = async () => {
        try {
            const empId = (user as any).employee_id || user?.id;
            // Use unique search placeholders to avoid 'Invalid parameter number' error if backend requires it
            // ensuring we send the search term correctly
            let url = `${API_URL}/admin/patients.php?action=fetch_patients&user_id=${empId}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (statusFilter !== 'all') url += `&status=${statusFilter}`;

            const res = await fetch(url);
            const json = await res.json();
            if (json.status === 'success') {
                setPatients(json.data);
            } else {
                setPatients([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        const totalDue = patients.reduce((sum, p) => sum + p.balance_due, 0);
        const activeCount = patients.filter(p => p.status.toLowerCase() === 'active').length;
        return { totalDue, activeCount };
    }, [patients]);

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200 font-sans">
            
            {/* Header */}
            <header className="px-6 py-4 pt-10 sticky top-0 z-30 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Clinic Records</p>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Patient Directory</h1>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                        {patients.length}
                    </div>
                </div>

                 {/* Search & Filter Bar */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="Search name, ID, phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setStatusFilter(prev => prev === 'all' ? 'active' : prev === 'active' ? 'inactive' : 'all')}
                        className={`px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border flex items-center gap-2 ${
                            statusFilter !== 'all' 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <Filter size={14} />
                        {statusFilter === 'all' ? 'All' : statusFilter}
                    </button>
                </div>
            </header>

            {/* Quick Stats - Only show if no search to avoid clutter */}
            {!search && (
                <div className="px-6 pt-6 pb-2">
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-indigo-600 dark:to-violet-700 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="flex justify-between items-end relative z-10">
                            <div>
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Total Outstanding</p>
                                <h2 className="text-2xl font-black tracking-tight">₹{stats.totalDue.toLocaleString()}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Active Patients</p>
                                <h2 className="text-2xl font-black tracking-tight">{stats.activeCount}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Patient List */}
            <main className="flex-1 p-6 space-y-4 pb-24">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-medium">No patients found</div>
                ) : (
                    patients.map(patient => (
                        <div 
                            key={patient.patient_id} 
                            onClick={() => navigate(`/admin/patients/${patient.patient_id}`)}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full ${
                                patient.status.toLowerCase() === 'active' ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                                        {patient.patient_name || 'Unknown Patient'}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                        #{patient.patient_uid || patient.patient_id}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                    patient.status.toLowerCase() === 'active' 
                                    ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' 
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                    {patient.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pl-3 mb-3">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Plan</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white capitalize truncate">
                                        {patient.treatment_type} ({patient.treatment_days} Days)
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Progress</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-teal-500 rounded-full" 
                                                style={{ width: `${Math.min(100, Math.round((patient.sessions_attended / (patient.treatment_days || 1)) * 100))}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                            {Math.round((patient.sessions_attended / (patient.treatment_days || 1)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-3 pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Paid</p>
                                    <p className="text-xs font-black text-gray-900 dark:text-white">₹{patient.total_paid.toLocaleString()}</p>
                                </div>
                                
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
                                    (patient.credit_balance || 0) > 0 
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                    {(patient.credit_balance || 0) > 0 ? <CheckCircle2 size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
                                    <div className="text-right">
                                        <p className="text-[8px] font-black uppercase opacity-70 leading-none mb-0.5">
                                            {(patient.credit_balance || 0) > 0 ? 'Advance Bal' : 'Due Balance'}
                                        </p>
                                        <p className="text-xs font-black leading-none">
                                            ₹{((patient.credit_balance || 0) > 0 ? patient.credit_balance : patient.balance_due)?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};

export default PatientsScreen;
