import * as React from 'react';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Phone, RefreshCw, ChevronLeft, Calendar, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Appointment {
  registration_id: string;
  patient_name: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  phone_number?: string;
  gender?: string;
  age?: number;
}

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const AppointmentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayMonth] = useState(new Date());
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const dateListRef = useRef<HTMLDivElement>(null);

  // Scroll to selected date on mount and when changed
  useEffect(() => {
    if (dateListRef.current && selectedDate) {
        const el = document.getElementById(`date-${selectedDate}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [selectedDate]);

  const fetchAppointments = useCallback(async (dateForMonth: Date) => {
    setLoading(true);
    try {
      const branchId = user?.branch_id || 1;
      const employeeId = user?.employee_id || '';

      const startDate = formatDate(new Date(dateForMonth.getFullYear(), dateForMonth.getMonth(), 1));
      const endDate = formatDate(new Date(dateForMonth.getFullYear(), dateForMonth.getMonth() + 1, 0));

      const response = await fetch(`${API_URL}/appointments.php?branch_id=${branchId}&employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`);
      const json = await response.json();
      if (json.status === 'success') {
        setAppointments(json.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchAppointments(displayMonth);
    }
  }, [displayMonth, user, fetchAppointments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments(displayMonth);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    // Optimistic Update
    setAppointments(prev => prev.map(a => 
      a.registration_id === id ? { ...a, status: newStatus } : a
    ));

    try {
      const res = await fetch(`${API_URL}/appointments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: id, status: newStatus })
      });
      const json = await res.json();
      if (json.status !== 'success') {
          fetchAppointments(displayMonth); // Revert on failure
      }
    } catch (err) {
      console.error(err);
      fetchAppointments(displayMonth);
    }
  };

  // --- Derived Data ---
  
  // Generate all days for the current displayed month
  const availableDates = useMemo(() => {
     const year = displayMonth.getFullYear();
     const month = displayMonth.getMonth();
     const date = new Date(year, month, 1);
     const dates = [];

     while (date.getMonth() === month) {
       dates.push(new Date(date).toISOString().split('T')[0]);
       date.setDate(date.getDate() + 1);
     }
     return dates;
  }, [displayMonth]);

  // Filter by selected date
  const filteredAppointments = useMemo(() => {
     return appointments.filter(a => a.appointment_date === selectedDate);
  }, [appointments, selectedDate]);

  // Stats for the SELECTED date
  const dayStats = useMemo(() => {
    return {
        total: filteredAppointments.length,
        consulted: filteredAppointments.filter(a => a.status.toLowerCase() === 'consulted').length,
        pending: filteredAppointments.filter(a => a.status.toLowerCase() === 'pending').length
    };
  }, [filteredAppointments]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'consulted': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'closed': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const formatDateLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      return {
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.getDate(),
          month: d.toLocaleDateString('en-US', { month: 'short' })
      };
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 transition-colors duration-200">
      {/* Modern Glassy Header */}
      <header className="px-6 py-4 pt-11 flex items-center justify-between sticky top-0 z-20 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-transform">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Schedule</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                 Command Center
            </p>
          </div>
        </div>
        <button 
          onClick={handleRefresh} 
          className={`w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-transform ${refreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          
          {/* Horizontal Date Picker */}
          <div ref={dateListRef} className="px-6 py-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto no-scrollbar flex gap-3 snap-x">
               {availableDates.map(date => {
                   const { day, date: dayNum, month } = formatDateLabel(date);
                   const isSelected = date === selectedDate;
                   const isToday = date === new Date().toISOString().split('T')[0];

                   return (
                       <button 
                            key={date}
                            id={`date-${date}`}
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center justify-center min-w-[4.5rem] p-2 rounded-2xl border transition-all duration-300 snap-center
                                ${isSelected 
                                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 border-transparent scale-105' 
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'
                                }
                            `}
                       >
                           <span className="text-[10px] font-bold uppercase opacity-80">{day}</span>
                           <span className="text-xl font-black">{dayNum}</span>
                           <span className="text-[10px] font-bold opacity-60">{isToday ? 'Today' : month}</span>
                       </button>
                   );
               })}
          </div>

          <div className="p-6 space-y-6 pb-24">
            
            {/* Day Stats Hero */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-teal-500/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                 
                 <div className="flex justify-between items-end mb-4 relative z-10">
                     <div>
                        <p className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">
                            Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                        </p>
                        <h2 className="text-3xl font-black">{dayStats.total} <span className="text-lg font-medium opacity-70">Appts</span></h2>
                     </div>
                     <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                         <Calendar size={24} className="text-white" />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 relative z-10">
                     <div className="bg-black/10 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                         <span className="text-xs font-bold text-teal-50 uppercase">Pending</span>
                         <span className="text-lg font-black">{dayStats.pending}</span>
                     </div>
                     <div className="bg-black/10 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                         <span className="text-xs font-bold text-teal-50 uppercase">Done</span>
                         <span className="text-lg font-black">{dayStats.consulted}</span>
                     </div>
                 </div>
            </div>

            {/* Timeline List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-50">
                        <Calendar size={48} className="text-gray-300 mb-2" />
                        <p className="font-bold text-gray-400">No appointments for this day.</p>
                    </div>
                ) : (
                    filteredAppointments.map((appt) => (
                        <div key={appt.registration_id} className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 flex gap-4 transition-all duration-300 hover:shadow-md">
                             {/* Time Column */}
                             <div className="flex flex-col items-center min-w-[3.5rem] border-r border-gray-100 dark:border-gray-700 pr-4 py-1">
                                 <span className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                     {appt.appointment_time.slice(0, 5)}
                                 </span>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                                     {parseInt(appt.appointment_time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}
                                 </span>
                             </div>

                             {/* Details Column */}
                             <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start mb-1">
                                     <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">{appt.patient_name}</h3>
                                     <button className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-200">
                                         <MoreVertical size={16} />
                                     </button>
                                 </div>
                                 
                                 <div className="flex items-center gap-2 mb-3">
                                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(appt.status)}`}>
                                         {appt.status}
                                     </span>
                                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                     <span className="text-xs text-gray-500 font-medium capitalize">{appt.gender || 'Unknown'}, {appt.age || '?'}</span>
                                 </div>

                                 {/* Quick Actions Row */}
                                 <div className="flex items-center gap-3 mt-2">
                                     {appt.phone_number && (
                                         <a href={`tel:${appt.phone_number}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold active:scale-95 transition-transform">
                                             <Phone size={12} /> Call
                                         </a>
                                     )}
                                     <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusUpdate(appt.registration_id, 'consulted');
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-transform
                                            ${appt.status === 'consulted' 
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-500/20' 
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-400'
                                            }`}
                                     >
                                         <CheckCircle size={12} /> Arrived
                                     </button>
                                     <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusUpdate(appt.registration_id, 'pending');
                                        }}
                                        className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-transform"
                                        title="Mark as Pending / No Show"
                                     >
                                         <XCircle size={14} />
                                     </button>
                                 </div>
                             </div>
                        </div>
                    ))
                )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default AppointmentsScreen;
