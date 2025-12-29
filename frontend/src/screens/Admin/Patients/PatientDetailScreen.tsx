import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Activity,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Clock,
    CreditCard,
    Mail,
    MapPin,
    Phone,
    Stethoscope,
    TrendingUp,
    User,
    Wallet,
    AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

// Define API URLs
const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
const ADMIN_ASSETS_URL = 'https://prospine.in/admin';

// Types matching the new PHP fetch_patient_details response
interface PatientDetail {
    basic: {
        patient_id: number;
        patient_uid: string;
        name: string;
        photo: string | null;
        status: string;
        age: number;
        gender: string;
        phone: string;
        email: string;
        address: string;
        occupation?: string;
        remarks?: string;
    };
    treatment: {
        type: string;
        days: number;
        start_date: string;
        end_date: string;
        cost_per_day: number;
        plan_total: number;
    };
    financials: {
        billed: number;
        paid: number;
        consumed_liability: number;
        balance_due: number;
        credit_balance: number;
        payment_percentage: number;
    };
    attendance: Array<{
        attendance_date: string;
        status: string;
        remarks: string;
    }>;
    payments: Array<{
        payment_id: number;
        payment_date: string;
        amount: number;
        mode: string;
        remarks: string;
    }>;
}

const PatientDetailScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');

    const fetchPatientDetails = async () => {
        try {
            // Using the new Admin API action
            const res = await fetch(`${API_URL}/admin/patients.php?action=fetch_patient_details&patient_id=${id}&user_id=${user?.employee_id}`);
            const json = await res.json();
            if (json.status === 'success') {
                setPatient(json.data);
            } else {
                console.error(json.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatientDetails();
    }, [id]);


    if (loading) return (
        <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!patient) return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 items-center justify-center">
            <p className="text-gray-500">Patient not found</p>
            <button onClick={() => navigate(-1)} className="mt-4 text-teal-600 font-bold">Go Back</button>
        </div>
    );

    const { basic, financials, treatment, attendance, payments } = patient;
    const progressPercent = treatment.days > 0 ? Math.min(100, Math.round((attendance.length / treatment.days) * 100)) : 0;
    
    // Check if Due or Credit
    const isCredit = financials.credit_balance > 0;
    const balanceLabel = isCredit ? 'Advance Balance' : 'Total Due';
    const balanceValue = isCredit ? financials.credit_balance : financials.balance_due;


    // Components helpers
    const TabButton = ({ active, onClick, label, icon }: any) => (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wide rounded-xl transition-all duration-300
            ${active ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm scale-[1.02]' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
        >
            {icon} {label}
        </button>
    );

    const Section = ({ title, icon, children }: any) => (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-[11px] font-black text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-teal-500">{icon}</span>
                {title}
            </h3>
            <div className="mt-2 text-sm">{children}</div>
        </div>
    );

    const InfoItem = ({ icon, label, value, className = '' }: any) => (
        <div className={`p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl ${className}`}>
            <div className="flex items-center gap-2 mb-1.5">
                <div className="text-gray-400 dark:text-gray-500">{icon}</div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{label}</p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white break-words leading-tight pl-1">{value || 'N/A'}</p>
        </div>
    );
     const StatCard = ({ label, value, colorClass, icon }: any) => (
         <div className={`rounded-2xl p-4 border flex justify-between items-center ${colorClass}`}>
            <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{label}</p>
                <p className="text-xl font-black mt-1">{value}</p>
            </div>
            {icon}
        </div>
    );


    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 transition-colors duration-200">
            {/* Header */}
            <header className="px-6 py-4 pt-11 flex items-center justify-between sticky top-0 z-20 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-transform">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 dark:text-white leading-tight truncate max-w-[200px]">{basic.name}</h1>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{basic.patient_uid || basic.patient_id}</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 no-scrollbar">

                {/* Hero Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-1 shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-500 to-emerald-600"></div>
                    <div className="relative pt-12 px-5 pb-5 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 shadow-md mb-3 overflow-hidden">
                            {basic.photo ? (
                                <img src={`${ADMIN_ASSETS_URL}/${basic.photo}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-400 uppercase bg-gray-100 dark:bg-gray-700">
                                    {basic.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 border-2 ${
                            basic.status.toLowerCase() === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                            {basic.status}
                        </div>
                         <div className="flex gap-3 w-full">
                             <a href={`tel:${basic.phone}`} className="flex-1 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors hover:bg-teal-50 hover:text-teal-600">
                                 <Phone size={14} /> Call
                             </a>
                             <a href={`mailto:${basic.email}`} className="flex-1 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors hover:bg-blue-50 hover:text-blue-600">
                                 <Mail size={14} /> Email
                             </a>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800 rounded-2xl">
                    <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Profile" icon={<User size={14} />} />
                    <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} label="Timeline" icon={<Activity size={14} />} />
                    <TabButton active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} label="Billing" icon={<Wallet size={14} />} />
                </div>

                {/* TAB CONTENT */}
                <div className="animate-in slide-in-from-bottom-5 fade-in duration-300">

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <Section title="Basic Details" icon={<User size={14} />}>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoItem icon={<User size={14} />} label="Full Name" value={basic.name} className="col-span-2" />
                                    <InfoItem icon={<Clock size={14} />} label="Age" value={`${basic.age} Years`} />
                                    <InfoItem icon={<User size={14} />} label="Gender" value={basic.gender} />
                                    <InfoItem icon={<Phone size={14} />} label="Phone" value={basic.phone} className="col-span-2" />
                                    <InfoItem icon={<MapPin size={14} />} label="Address" value={basic.address} className="col-span-2" />
                                </div>
                            </Section>

                            <Section title="Medical Context" icon={<Stethoscope size={14} />}>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-4">
                                        <InfoItem icon={<Activity size={14} />} label="Treatment Plan" value={treatment.type} />
                                        <InfoItem icon={<AlertCircle size={14} />} label="Occupation" value={basic.occupation || 'N/A'} />
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                                         <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Remarks</p>
                                         <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                             "{basic.remarks || 'No remarks recorded.'}"
                                         </p>
                                    </div>
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                        <div className="space-y-6">
                            {/* Plan Overview */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Active Treatment</h3>
                                            <p className="text-2xl font-black capitalize">{treatment.type}</p>
                                        </div>
                                        <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10">
                                            {treatment.days} Days Goal
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <div className="flex justify-between text-xs font-bold text-indigo-100 mb-2">
                                            <span>Attendance ({progressPercent}%)</span>
                                            <span>{attendance.length}/{treatment.days} Sessions</span>
                                        </div>
                                        <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                                            <div className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
                                        <div>
                                            <p className="text-indigo-200 text-[10px] uppercase font-bold">Start Date</p>
                                            <p className="font-bold text-xs">{treatment.start_date ? new Date(treatment.start_date).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-indigo-200 text-[10px] uppercase font-bold">End Date</p>
                                            <p className="font-bold text-xs">{treatment.end_date ? new Date(treatment.end_date).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                            </div>

                            {/* Session History */}
                            <Section title="Session History" icon={<Calendar size={14} />}>
                                <div className="space-y-0 relative border-l-2 border-gray-100 dark:border-gray-700 ml-2">
                                    {attendance.slice(0, 10).map((record, i) => (
                                        <div key={i} className="pl-6 pb-6 relative last:pb-0">
                                            <div className="absolute -left-[5px] top-1.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white dark:border-gray-800"></div>
                                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white capitalize">{record.status} Use</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{record.attendance_date}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{record.remarks || 'Regular session'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {attendance.length === 0 && <p className="text-sm text-gray-400 pl-6 italic">No sessions recorded.</p>}
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* BILLING TAB */}
                    {activeTab === 'billing' && (
                        <div className="space-y-4">
                            {/* Dynamic Balance Card */}
                            <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${
                                isCredit 
                                ? 'bg-gradient-to-tr from-green-700 to-emerald-600' 
                                : 'bg-gradient-to-tr from-gray-900 to-gray-800 dark:from-black dark:to-gray-900'
                            }`}>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{balanceLabel}</p>
                                            <p className="text-4xl font-black mt-1">₹{balanceValue.toLocaleString()}</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                            <Wallet size={24} className="text-white" />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                                         <div>
                                            <p className="text-[10px] text-white/60 uppercase font-bold">Planned Cost</p>
                                            <p className="font-bold">₹{financials.billed.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-white/60 uppercase font-bold">Consumed Value</p>
                                            <p className="font-bold">₹{financials.consumed_liability.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <Section title="Financial Overview" icon={<TrendingUp size={14} />}>
                                 <div className="grid grid-cols-2 gap-3">
                                     <StatCard 
                                        label="Total Paid" 
                                        value={`₹${financials.paid.toLocaleString()}`} 
                                        colorClass="bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                                        icon={<CheckCircle size={16} />}
                                     />
                                     <StatCard 
                                        label="Collection" 
                                        value={`${financials.payment_percentage}%`} 
                                        colorClass="bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                                        icon={<Activity size={16} />}
                                     />
                                 </div>
                             </Section>

                             <Section title="Payment History" icon={<CreditCard size={14} />}>
                                <div className="space-y-3">
                                    {payments.map((pay, i) => (
                                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">₹{pay.amount.toLocaleString()}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <span className="text-[10px] font-bold uppercase bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-100 dark:border-gray-700">{pay.mode}</span>
                                                     <span className="text-[10px] text-gray-400">{new Date(pay.payment_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400 italic max-w-[100px] truncate">{pay.remarks}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {payments.length === 0 && <p className="text-sm text-gray-400 italic">No payments recorded.</p>}
                                </div>
                             </Section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDetailScreen;
