import { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  X,
  Clock,
  Wallet,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface AttendanceRecord {
  patient_id: number;
  patient_name: string;
  patient_uid: string | null;
  patient_photo_path: string | null;
  phone_number: string;
  treatment_type: string;
  treatment_days: number;
  session_count: number;
  is_present: boolean;
  attendance_status: 'present' | 'pending' | null;
  attended_date: string | null;
  cost_per_day: number;
  effective_balance: number;
  due_amount?: number;
}

interface AttendanceStats {
    total_active: number;
    present: number;
    pending: number;
    absent: number;
}

export const AttendanceScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'pending'>('all'); // Removed 'absent' filter to simplify, or keep it?
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Modals
  const [selectedPatient, setSelectedPatient] = useState<AttendanceRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBalanceActionModal, setShowBalanceActionModal] = useState(false); // New modal for Low Balance decision
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  // History Data
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const branchId = user?.branch_id || 1;
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
      const params = new URLSearchParams({
        branch_id: branchId.toString(),
        date: selectedDate,
        search: searchQuery,
        status: filter === 'pending' ? 'all' : filter, // API might not handle 'pending' filter yet, so use 'all' and filter locally if needed, but for now just pass 'all'
        limit: '100'
      });

      const response = await fetch(`${baseUrl}/attendance.php?${params.toString()}`);
      const data = await response.json();

      if (data.status === 'success') {
        let fetchedPatients: AttendanceRecord[] = data.data;
        if (filter === 'pending') {
            fetchedPatients = fetchedPatients.filter(p => p.attendance_status === 'pending');
        }
        setPatients(fetchedPatients);
        if (data.stats) {
            setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (patientId: number) => {
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
      const response = await fetch(`${baseUrl}/attendance_history.php?patient_id=${patientId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setHistoryData(data.data);
      }
    } catch (error) {
      console.error('History fetch error', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleCardClick = (patient: AttendanceRecord) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
    setCurrentMonth(new Date()); 
    fetchHistory(patient.patient_id);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendance();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filter, selectedDate]);

  const handleMarkClick = (patient: AttendanceRecord) => {
    setSelectedPatient(patient);
    setPaymentAmount('');
    setPaymentMode('');
    setRemarks('');

    const hasBalance = patient.effective_balance >= patient.cost_per_day;

    if (hasBalance) {
      // Sufficient Balance -> Simple Confirm
      setShowConfirmModal(true);
    } else {
      // Insufficient Balance -> Action Modal (Pay or Request)
      const needed = Math.max(0, patient.cost_per_day - patient.effective_balance);
      setPaymentAmount(Math.ceil(needed).toString());
      setShowBalanceActionModal(true);
    }
  };

  const submitAttendance = async (options: { withPayment?: boolean, markAsPending?: boolean }) => {
    if (!selectedPatient) return;
    setProcessing(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
      
      const payload = {
        patient_id: selectedPatient.patient_id,
        employee_id: user?.employee_id || 1,
        payment_amount: options.withPayment ? parseFloat(paymentAmount) : 0,
        mode: options.withPayment ? paymentMode : '',
        remarks: remarks,
        mark_as_pending: options.markAsPending || false
      };

      const response = await fetch(`${baseUrl}/mark_attendance.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Close all modals
        setShowPaymentModal(false);
        setShowConfirmModal(false);
        setShowBalanceActionModal(false);
        fetchAttendance(); 
      } else {
        alert(result.message || 'Error marking attendance');
      }

    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit attendance');
    } finally {
      setProcessing(false);
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    return `https://prospine.in/proadmin/admin/${path.replace(/^\//, '')}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 transition-colors">
      
      {/* 1. Header Area with Glassmorphism */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm sticky top-0 z-20 pt-[var(--safe-area-inset-top,32px)] mt-0 border-b border-gray-100 dark:border-gray-700">
        
        <div className="px-4 py-3 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95"
              >
                <ChevronLeft size={24} className="text-gray-600 dark:text-gray-300" />
              </button>
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Daily Visits</h1>
           </div>
           
           {/* Date Display */}
           <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 shadow-inner">
                 <button onClick={() => changeDate(-1)} className="p-1.5 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 active:scale-90 transition-transform"><ChevronLeft size={16} /></button>
                 <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-24 text-center">
                    {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' })}
                 </span>
                 <button onClick={() => changeDate(1)} className="p-1.5 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 active:scale-90 transition-transform"><ChevronRight size={16} /></button>
           </div>
        </div>

        {/* 2. Search & Stats Overlay */}
        <div className="px-4 pb-4 space-y-3">
           <div className="relative group">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                <Search size={18} />
             </div>
             <input
               type="text"
               placeholder="Search patient via name or ID..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-3 bg-gray-100/50 dark:bg-gray-700/50 backdrop-blur-sm border-2 border-transparent focus:border-teal-500/30 focus:bg-white dark:focus:bg-gray-800 rounded-2xl text-sm outline-none transition-all dark:text-white font-medium"
             />
           </div>

           {/* Filter Pills */}
           <div className="flex gap-2 p-1 overflow-x-auto no-scrollbar mask-gradient">
              {[
                  { id: 'all', label: 'All Patients' },
                  { id: 'present', label: 'Present' },
                  { id: 'pending', label: 'Pending Approval' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all border ${
                    filter === f.id 
                      ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-500/20' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* 3. Main Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32 no-scrollbar">
        
        {/* Stats Card */}
        {stats && (
            <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden mb-4">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-fullblur-3xl -mr-10 -mt-10 blur-2xl"></div>
                 <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-fullblur-3xl -ml-10 -mb-10 blur-xl"></div>
                 
                 <div className="flex justify-between items-center mb-6 relative z-10">
                     <h3 className="font-bold text-sm uppercase tracking-widest opacity-80 flex items-center gap-2">
                         <Calendar size={16} /> Summary
                     </h3>
                     <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        {new Date(selectedDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                     </span>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-4 text-center relative z-10">
                     <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3">
                         <p className="text-2xl font-black">{stats.present}</p>
                         <p className="text-[10px] font-bold text-teal-100 uppercase mt-0.5">Present</p>
                     </div>
                     <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 border border-amber-400/30">
                         <p className="text-2xl font-black text-amber-300">{stats.pending}</p>
                         <p className="text-[10px] font-bold text-amber-100 uppercase mt-0.5">Pending</p>
                     </div>
                     <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3">
                         <p className="text-2xl font-black opacity-80">{stats.absent}</p>
                         <p className="text-[10px] font-bold text-teal-100/70 uppercase mt-0.5 opacity-80">Absent</p>
                     </div>
                 </div>
            </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : patients.length > 0 ? (
          <div className="grid gap-3">
          {patients.map((patient) => {
            const progress = patient.treatment_days > 0 
                ? Math.min(100, (patient.session_count / patient.treatment_days) * 100) 
                : 0;
            
            const isPending = patient.attendance_status === 'pending';
            const isPresent = patient.attendance_status === 'present';

            return (
              <div 
                key={patient.patient_id}
                onClick={() => handleCardClick(patient)}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all active:scale-[0.98] cursor-pointer shadow-sm relative overflow-hidden group
                    ${isPresent ? 'border-green-200 dark:border-green-900/50' : 
                      isPending ? 'border-amber-200 dark:border-amber-900/50' : 'border-gray-100 dark:border-gray-700'}
                `}
              >
                {/* Status Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                    ${isPresent ? 'bg-green-500' : isPending ? 'bg-amber-500' : 'bg-transparent'}`}>
                </div>

                <div className="flex gap-4 pl-2">
                  <div className="relative shrink-0 pt-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg overflow-hidden shadow-inner uppercase transition-colors
                        ${isPresent ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-300'}
                    `}>
                       {patient.patient_photo_path ? (
                         <img src={getImageUrl(patient.patient_photo_path) || ''} alt="" className="w-full h-full object-cover" />
                       ) : (
                         patient.patient_name.charAt(0)
                       )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">{patient.patient_name}</h3>
                        <div className="text-xs font-medium text-gray-400 flex items-center gap-2 mt-0.5">
                           <span>#{patient.patient_uid || patient.patient_id}</span>
                           <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                           <span className="uppercase text-teal-600 dark:text-teal-400 font-bold tracking-wide">{patient.treatment_type}</span>
                        </div>
                      </div>
                      
                      {isPresent ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-lg dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400">
                           <CheckCircle size={10} strokeWidth={3} /> Present
                        </span>
                      ) : isPending ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400">
                           <Clock size={10} strokeWidth={3} /> Pending
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-500">Absent</span>
                      )}
                    </div>
                    
                    {/* Progress Bar Compact */}
                    <div className="mt-4 flex items-center gap-3">
                       <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isPresent ? 'bg-green-500' : isPending ? 'bg-amber-500' : 'bg-teal-500'}`} 
                            style={{ width: `${progress}%` }}
                          ></div>
                       </div>
                       <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{patient.session_count}/{patient.treatment_days || '∞'}</span>
                    </div>

                    {/* Action Bar (Only if absent) */}
                    {!isPresent && !isPending && (
                       <div className="mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50 pt-3">
                          <div className={`text-xs font-bold flex items-center gap-1.5 ${patient.effective_balance < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                             <Wallet size={12} />
                             Bal: ₹{patient.effective_balance.toFixed(0)}
                          </div>
                          
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleMarkClick(patient);
                             }}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold uppercase tracking-wide rounded-lg active:scale-95 transition-transform shadow-lg shadow-gray-200 dark:shadow-none hover:bg-gray-800"
                          >
                             Mark Present
                          </button>
                       </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
             <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
               <Calendar size={32} className="text-gray-400" />
             </div>
             <p className="text-gray-500 dark:text-gray-400 font-medium">No patients found</p>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Low Balance Action Modal */}
      {showBalanceActionModal && selectedPatient && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowBalanceActionModal(false)}></div>
             <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-sm rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-20 sm:zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Wallet size={24} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Low Balance</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4">
                        <b>{selectedPatient.patient_name}</b> has insufficient balance (₹{selectedPatient.effective_balance.toFixed(0)}) for this session (₹{selectedPatient.cost_per_day}).
                    </p>
                </div>

                <div className="grid gap-3">
                    <button 
                        onClick={() => {
                            setShowBalanceActionModal(false);
                            setShowPaymentModal(true);
                        }}
                        className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        Collect Payment
                    </button>
                    
                    <button 
                        onClick={() => submitAttendance({ withPayment: false, markAsPending: true })}
                        disabled={processing}
                        className="w-full py-3.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold rounded-2xl border border-amber-200 dark:border-amber-900 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                         {processing ? 'Requesting...' : 'Request Admin Approval'}
                    </button>

                    <button onClick={() => setShowBalanceActionModal(false)} className="mt-2 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider">
                        Cancel
                    </button>
                </div>
             </div>
         </div>
      )}

      {/* 2. Normal Confirm Modal */}
      {showConfirmModal && selectedPatient && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
             <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Mark Attendance?</h3>
                    <p className="text-sm text-gray-500">
                       Confirm presence for <b>{selectedPatient.patient_name}</b>. Balance is sufficient.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 rounded-xl">Cancel</button>
                    <button 
                       onClick={() => submitAttendance({ withPayment: false })}
                       disabled={processing}
                       className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20"
                    >
                       {processing ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
             </div>
         </div>
      )}

      {/* 3. Payment Modal */}
      {showPaymentModal && selectedPatient && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
             <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-sm rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-20 sm:zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Record Payment</h3>
                    <button onClick={() => setShowPaymentModal(false)}><X size={20} className="text-gray-400" /></button>
                </div>

                <div className="space-y-5">
                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Amount (₹)</label>
                       <input 
                         type="number"
                         value={paymentAmount}
                         onChange={(e) => setPaymentAmount(e.target.value)}
                         className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xl font-bold border-2 border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
                         placeholder="0.00"
                         autoFocus
                       />
                    </div>

                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Mode</label>
                       <div className="grid grid-cols-4 gap-2">
                          {['cash', 'upi', 'card', 'other'].map(m => (
                              <button
                                key={m}
                                onClick={() => setPaymentMode(m)}
                                className={`py-2 text-[10px] font-bold rounded-xl uppercase tracking-wide border-2 transition-all ${
                                   paymentMode === m 
                                     ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' 
                                     : 'bg-transparent border-gray-100 text-gray-400 dark:border-gray-700'
                                }`}
                              >
                                {m}
                              </button>
                          ))}
                       </div>
                    </div>

                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Remarks</label>
                       <input 
                         value={remarks}
                         onChange={(e) => setRemarks(e.target.value)}
                         className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-medium border-2 border-transparent focus:border-teal-500 outline-none"
                         placeholder="Optional notes..."
                       />
                    </div>

                    <button 
                       onClick={() => submitAttendance({ withPayment: true })}
                       disabled={processing || !paymentAmount || !paymentMode}
                       className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-teal-500/20 disabled:opacity-50 disabled:shadow-none hover:bg-teal-700 transition-all"
                    >
                       {processing ? 'Processing...' : 'Pay & Mark Present'}
                    </button>
                </div>
             </div>
         </div>
      )}

      {/* 4. History Detail Modal */}
      {showDetailModal && selectedPatient && (
         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}></div>
             <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-20 sm:zoom-in-95 duration-300 max-h-[85vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-1">{selectedPatient.patient_name}</h3>
                        <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">#{selectedPatient.patient_uid || selectedPatient.patient_id}</span>
                            <span className="text-teal-600 dark:text-teal-400 uppercase font-bold text-xs tracking-wide">{selectedPatient.treatment_type}</span>
                        </p>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-full hover:bg-gray-100"><X size={20} className="text-gray-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {historyLoading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div></div>
                    ) : historyData ? (
                        <>
                           {/* Quick Stats */}
                           <div className="grid grid-cols-3 gap-3">
                              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl text-center border border-gray-100 dark:border-gray-700">
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total</div>
                                 <div className="text-xl font-black text-gray-900 dark:text-white">{historyData.stats.total_days}</div>
                              </div>
                              <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-2xl text-center border border-teal-100 dark:border-teal-900/30">
                                 <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">Present</div>
                                 <div className="text-xl font-black text-teal-700 dark:text-teal-400">{historyData.stats.present_count}</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl text-center border border-gray-100 dark:border-gray-700">
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Left</div>
                                 <div className="text-xl font-black text-gray-900 dark:text-white">{historyData.stats.remaining}</div>
                              </div>
                           </div>

                           {/* Calendar Visualizer */}
                           <div>
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><History size={16} /> Attendance Log</h4>
                                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                                      <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md text-gray-500 transition-shadow"><ChevronLeft size={14} /></button>
                                      <span className="text-xs font-bold w-24 text-center flex items-center justify-center">
                                          {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
                                      </span>
                                      <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md text-gray-500 transition-shadow"><ChevronRight size={14} /></button>
                                  </div>
                              </div>
                              
                              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wide">
                                      {['S','M','T','W','T','F','S'].map((d,i) => <div key={i}>{d}</div>)}
                                  </div>
                                  <div className="grid grid-cols-7 gap-2">
                                      {(() => {
                                          const year = currentMonth.getFullYear();
                                          const month = currentMonth.getMonth();
                                          const firstDay = new Date(year, month, 1).getDay();
                                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                                          const days = [];
                                          
                                          // Empty slots
                                          for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                                          
                                          // Days
                                          for (let d = 1; d <= daysInMonth; d++) {
                                              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                              const record = historyData.history.find((h: any) => h.attendance_date === dateStr);
                                              const status = record?.status || null;
                                              const isToday = dateStr === new Date().toISOString().split('T')[0];

                                              let bgClass = 'bg-white dark:bg-gray-700 text-gray-300 dark:text-gray-600';
                                              
                                              if (status === 'present') {
                                                  bgClass = 'bg-green-500 text-white shadow-md shadow-green-500/20';
                                              } else if (status === 'pending') {
                                                  bgClass = 'bg-amber-400 text-white shadow-md shadow-amber-500/20';
                                              } else if (status === 'rejected') {
                                                  bgClass = 'bg-red-400 text-white opacity-60';
                                              }

                                              days.push(
                                                  <div 
                                                    key={d} 
                                                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all
                                                        ${bgClass}
                                                        ${isToday ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-gray-800 z-10' : ''}
                                                    `}
                                                    title={record?.remarks || ''}
                                                  >
                                                    {d}
                                                  </div>
                                              );
                                          }
                                          return days;
                                      })()}
                                  </div>
                              </div>
                           </div>
                        </>
                     ) : (
                        <div className="text-gray-400 text-center py-10">Data unavailable</div>
                     )}
                </div>
             </div>
         </div>
      )}

    </div>
  );
};

export default AttendanceScreen;
