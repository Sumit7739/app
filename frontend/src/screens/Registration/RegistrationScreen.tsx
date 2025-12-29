import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  User,
  Phone,
  Calendar,
  ClipboardList,
  X,
  Stethoscope,
  Plus,
  CheckCircle,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface Registration {
  registration_id: number;
  patient_name: string;
  phone_number: string;
  age: number | string;
  gender: string;
  consultation_type: string;
  reffered_by: string;
  chief_complain: string;
  consultation_amount: number | string;
  created_at: string;
  status: string;
  patient_photo_path: string | null;
  patient_uid: string | null;
  is_patient_created: number;
  email?: string;
  address?: string;
  doctor_notes?: string;
  prescription?: string;
  follow_up_date?: string;
  remarks?: string;
  payment_method?: string;
}

interface RegistrationStats {
  total: number;
  pending: number;
  consulted: number;
  cancelled: number;
}

const DetailRow = ({ icon: Icon, label, value, className = '' }: { icon: any, label: string, value: React.ReactNode, className?: string }) => {
  if (!value) return null;
  return (
    <div className={`flex gap-3 items-start ${className}`}>
      <div className="mt-0.5 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-400 shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
      </div>
    </div>
  );
};

export const RegistrationScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Helper to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fetch Logic
  const fetchRegistrations = async (pageNum: number, search: string) => {
    setLoading(true);
    try {
      const branchId = user?.branch_id || 1;
      const params = new URLSearchParams({
        branch_id: branchId.toString(),
        page: pageNum.toString(),
        limit: '15',
        search: search
      });

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
      const response = await fetch(`${baseUrl}/registrations.php?${params.toString()}`);
      const data = await response.json();

      if (data.status === 'success') {
        setRegistrations(prev => pageNum === 1 ? data.data : [...prev, ...data.data]);
        setTotalPages(data.pagination.pages);
        if (data.stats) {
            setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update Status Logic
  const handleStatusUpdate = async (newStatus: string) => {
      if (!selectedRegistration) return;
      setUpdatingStatus(true);
      try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
          const res = await fetch(`${baseUrl}/update_registration_status.php`, {
              method: 'POST',
              body: JSON.stringify({
                  registration_id: selectedRegistration.registration_id,
                  status: newStatus
              })
          });
          const json = await res.json();
          if (json.status === 'success') {
              // Update local state
              const updatedReg = { ...selectedRegistration, status: newStatus };
              setSelectedRegistration(updatedReg);
              setRegistrations(prev => prev.map(r => r.registration_id === updatedReg.registration_id ? updatedReg : r));
              
              // Refresh stats if needed (optional, simplistic update here)
              // Ideally re-fetch or calc locally
          }
      } catch (err) {
          console.error("Status update failed", err);
      } finally {
          setUpdatingStatus(false);
      }
  };

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRegistrations(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRegistrations(nextPage, searchQuery);
    }
  };

  const handleCardClick = async (reg: Registration) => {
    setSelectedRegistration(reg); // Show partial data immediately
    setDetailLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
      const response = await fetch(`${baseUrl}/registrations.php?id=${reg.registration_id}&branch_id=${user?.branch_id || 1}`);
      const data = await response.json();
      if (data.status === 'success') {
        // Merge with existing to keep UI smooth if backend sends more fields
        setSelectedRegistration(prev => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'consulted': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'closed': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    return `https://prospine.in/proadmin/admin/${path}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 pt-[var(--safe-area-inset-top,32px)]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors font-bold"
          >
            <ChevronLeft size={24} className="text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Registrations</h1>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 bg-gray-100 dark:bg-gray-700/50 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-gray-700 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        
        {/* Stats Card - Enhanced */}
        {stats && (
            <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="col-span-2 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                            <p className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">Total Registrations</p>
                            <p className="text-3xl font-black">{stats.total}</p>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <ClipboardList size={20} className="text-white" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-1">Pending</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                     <p className="text-xs font-bold text-green-500 uppercase tracking-wide mb-1">Consulted</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.consulted}</p>
                </div>
            </div>
        )}

        {loading && page === 1 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : registrations.length > 0 ? (
          <div className="space-y-3">
            {registrations.map((reg) => (
              <div 
                key={reg.registration_id}
                onClick={() => handleCardClick(reg)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group"
              >
                <div className="flex gap-4 items-start">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 font-bold text-xl overflow-hidden shadow-inner uppercase">
                      {reg.patient_photo_path ? (
                        <img src={getImageUrl(reg.patient_photo_path) || ''} alt={reg.patient_name} className="w-full h-full object-cover" />
                      ) : (
                        reg.patient_name.charAt(0)
                      )}
                    </div>
                    {reg.status?.toLowerCase() === 'pending' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                       <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate pr-2">{reg.patient_name}</h3>
                       <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(reg.status)}`}>
                         {reg.status}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 mb-2">
                         <span className="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded">
                            {reg.patient_uid ? `#${reg.patient_uid}` : `#${reg.registration_id}`}
                         </span>
                         <span className="text-xs text-gray-400">•</span>
                         <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                             <Calendar size={10} /> {formatDate(reg.created_at)}
                         </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {reg.chief_complain && (
                           <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-md max-w-[60%] truncate">
                              <Stethoscope size={10} /> <span className="truncate">{reg.chief_complain}</span>
                           </div>
                        )}
                        <div className="flex items-center gap-1">
                           <Phone size={10} /> {reg.phone_number}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination / Load More */}
            {page < totalPages && (
               <div className="flex justify-center pt-4">
                 <button 
                   onClick={loadMore}
                   className="group relative px-6 py-2 bg-white dark:bg-gray-800 text-teal-600 text-sm font-bold rounded-full shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                 >
                   <span className="relative z-10 group-hover:text-teal-700 transition-colors">Load More Records</span>
                   <div className="absolute inset-0 bg-teal-50 dark:bg-teal-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 </button>
               </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700">
              <User size={32} className="text-gray-400/50" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold mb-1">No registrations found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[200px]">Try adjusting your search or add a new patient.</p>
          </div>
        )}
      </div>

      {/* Details Modal - Premium Glass revamp */}
      {selectedRegistration && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4 perspective-1000">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRegistration(null)}
          ></div>
          <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            
            {/* Modal Header with Status Toggle */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-white dark:bg-gray-800 z-10 sticky top-0">
               <div className="flex-1 mr-4">
                   <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1">{selectedRegistration.patient_name}</h2>
                   <div className="flex items-center gap-2">
                       {/* STATUS DROPDOWN */}
                       <div className="relative inline-block">
                           <select
                               value={selectedRegistration.status}
                               onChange={(e) => handleStatusUpdate(e.target.value)}
                               disabled={updatingStatus}
                               className={`appearance-none pl-4 pr-12 py-2 rounded-lg text-xs uppercase font-black tracking-widest border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 transition-all min-w-[180px] ${getStatusColor(selectedRegistration.status)} ${updatingStatus ? 'opacity-50' : ''}`}
                           >
                               <option value="Pending">Pending</option>
                               <option value="Consulted">Consulted</option>
                               <option value="Cancelled">Cancelled</option>
                           </select>
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                               <MoreVertical size={14} />
                           </div>
                       </div>
                       {updatingStatus && <div className="animate-spin w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full"></div>}
                   </div>
               </div>
               <button 
                 onClick={() => setSelectedRegistration(null)}
                 className="p-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
               >
                 <X size={20} className="text-gray-500 dark:text-gray-400" />
               </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-900/30">
              {detailLoading ? (
                 <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent"></div>
                 </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div className={`p-3 rounded-xl flex items-center gap-3 border ${selectedRegistration.is_patient_created ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900' : 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900'}`}>
                      {selectedRegistration.is_patient_created ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-amber-500" />}
                      <span className="text-xs font-bold">{selectedRegistration.is_patient_created ? 'Patient Record Synced' : 'No Permanent Record Found'}</span>
                  </div>

                  {/* Photo & Basic Info */}
                  <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-700 p-1 shadow-sm border border-gray-100 dark:border-gray-600">
                          <div className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-600 overflow-hidden flex items-center justify-center text-3xl font-black text-gray-300 uppercase">
                             {selectedRegistration.patient_photo_path ? (
                                <img src={getImageUrl(selectedRegistration.patient_photo_path) || ''} alt="Profile" className="w-full h-full object-cover" />
                             ) : selectedRegistration.patient_name.charAt(0)}
                          </div>
                      </div>
                      <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                              <Phone size={14} className="text-teal-500" />
                              <a href={`tel:${selectedRegistration.phone_number}`} className="hover:underline font-medium">{selectedRegistration.phone_number}</a>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                              <User size={14} className="text-teal-500" />
                              <span>{selectedRegistration.age} Yrs, {selectedRegistration.gender}</span>
                          </div>
                          {selectedRegistration.email && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                  <User size={14} className="text-teal-500" />
                                  <span className="truncate max-w-[150px]">{selectedRegistration.email}</span>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Medical Details</h3>
                      <DetailRow icon={Stethoscope} label="Chief Complaint" value={selectedRegistration.chief_complain} />
                      <DetailRow icon={ClipboardList} label="Type" value={selectedRegistration.consultation_type} />
                      <DetailRow icon={User} label="Referred By" value={selectedRegistration.reffered_by} />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Payment</h3>
                      <div className="flex justify-between items-end bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</p>
                              <p className="text-xl font-black text-gray-900 dark:text-white">₹ {selectedRegistration.consultation_amount || '0'}</p>
                          </div>
                          <span className="px-2 py-1 bg-white dark:bg-gray-600 rounded text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-500">
                              {selectedRegistration.payment_method || 'CASH'}
                          </span>
                      </div>
                  </div>

                  {/* Notes & Remarks */}
                  {(selectedRegistration.doctor_notes || selectedRegistration.prescription || selectedRegistration.remarks) && (
                    <div className="space-y-3">
                         {selectedRegistration.doctor_notes && (
                             <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-l-4 border-teal-500 shadow-sm">
                                 <h4 className="text-xs font-bold text-teal-600 uppercase mb-1">Doctor Notes</h4>
                                 <p className="text-sm text-gray-600 dark:text-gray-300">{selectedRegistration.doctor_notes}</p>
                             </div>
                         )}
                         {selectedRegistration.remarks && (
                             <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border-l-4 border-amber-500 shadow-sm">
                                 <h4 className="text-xs font-bold text-amber-600 uppercase mb-1">Remarks</h4>
                                 <p className="text-sm text-gray-600 dark:text-gray-300">{selectedRegistration.remarks}</p>
                             </div>
                         )}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
       )}

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/registration/new')}
        className="fixed bottom-24 right-5 w-16 h-16 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl shadow-xl shadow-teal-600/30 flex items-center justify-center active:scale-90 transition-all z-30 group"
      >
        <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
};

export default RegistrationScreen;
