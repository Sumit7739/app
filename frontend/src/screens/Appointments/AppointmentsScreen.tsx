import * as React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { 
    MdPhone, 
    MdRefresh, 
    MdCheckCircle, 
    MdAccessTime,
    MdPerson,
    MdMoreVert,
    MdArrowDropDown,
    MdHistory
} from 'react-icons/md';
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
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // displayMonth is used to control which month range we fetch
  const [displayMonth] = useState(new Date());
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // --- Data Fetching ---

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
        const data = json.data || [];
        // Sort by time
        data.sort((a: Appointment, b: Appointment) => a.appointment_time.localeCompare(b.appointment_time));
        setAppointments(data);
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

  const availableDates = useMemo(() => {
     const dates = new Set(appointments.map(a => a.appointment_date));
     const today = new Date().toISOString().split('T')[0];
     dates.add(today);
     return Array.from(dates).sort();
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
     return appointments.filter(a => a.appointment_date === selectedDate);
  }, [appointments, selectedDate]);

  const dayStats = useMemo(() => {
    return {
        total: filteredAppointments.length,
        done: filteredAppointments.filter(a => ['consulted', 'closed'].includes(a.status.toLowerCase())).length,
        pending: filteredAppointments.filter(a => a.status.toLowerCase() === 'pending' || a.status.toLowerCase() == 'confirmed').length,
        cancelled: filteredAppointments.filter(a => a.status.toLowerCase() === 'cancelled').length
    };
  }, [filteredAppointments]);

  // --- Helper Functions ---

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-sky-500';
      case 'pending': return 'bg-amber-500';
      case 'consulted': return 'bg-emerald-500';
      case 'closed': return 'bg-gray-500';
      case 'cancelled': return 'bg-rose-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusStyles = (status: string) => {
      // Returns generic styles for the card border/accents
      switch (status.toLowerCase()) {
          case 'consulted': return 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10';
          case 'cancelled': return 'border-rose-500/30 opacity-75 grayscale-[0.5]';
          case 'pending':
          case 'confirmed': return 'border-primary/20 hover:border-primary/50';
          default: return 'border-outline-variant/20';
      }
  };

  const formatDateLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      return {
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.getDate(),
      };
  };

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-gray-950 relative font-sans">
      
      {/* Primary Gradient Background Mesh */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/30 via-primary/5 to-transparent pointer-events-none z-0 dark:from-primary/10" />

      {/* --- Unified Header & Calendar --- */}
      <div className="bg-transparent backdrop-blur-xl sticky top-0 z-30 transition-colors duration-200">
        {/* Top Navbar */}
        <header className="px-5 py-3 pt-11 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold font-poppins text-on-surface dark:text-white tracking-tight flex items-center gap-2">
                        Schedule
                        <span className="px-2 py-0.5 rounded-full bg-surface-variant dark:bg-gray-800 text-[10px] font-bold text-outline dark:text-gray-400 border border-outline-variant/20">
                            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                    </h1>
                </div>
            </div>
            <button 
                onClick={handleRefresh} 
                className={`w-10 h-10 rounded-full bg-surface-variant/40 hover:bg-surface-variant/60 dark:bg-gray-800 flex items-center justify-center text-on-surface dark:text-gray-200 transition-all active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
            >
                <MdRefresh size={20} />
            </button>
        </header>

        {/* Date Strip */}
        <div className="px-4 pb-3 overflow-x-auto no-scrollbar flex gap-2 snap-x">
               {availableDates.map(date => {
                   const { day, date: dayNum } = formatDateLabel(date);
                   const isSelected = date === selectedDate;
                   const isToday = date === new Date().toISOString().split('T')[0];

                   return (
                       <button 
                            key={date}
                            id={`date-${date}`}
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center justify-center min-w-[3.8rem] h-[4.2rem] rounded-2xl border transition-all duration-300 snap-center
                                ${isSelected 
                                    ? 'bg-primary text-on-primary shadow-md shadow-primary/25 border-transparent scale-105' 
                                    : 'bg-surface dark:bg-gray-900/50 text-outline dark:text-gray-400 border-transparent hover:bg-surface-variant/50'
                                }
                            `}
                       >
                           <span className={`text-[10px] font-bold uppercase ${isSelected ? 'opacity-90' : 'opacity-70'}`}>{day}</span>
                           <span className="text-lg font-bold my-0.5">{dayNum}</span>
                           {isToday && <span className="w-1 h-1 rounded-full bg-current opacity-80 mt-0.5"></span>}
                       </button>
                   );
               })}
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          
          {/* Summary Pill - Floating/Sticky behaviour could be added, keeping it simple inline for now */}
          <div className="px-5 py-4">
              <div className="flex items-center justify-between bg-surface-variant/30 dark:bg-gray-900 border border-outline-variant/10 dark:border-gray-800 rounded-2xl p-4">
                  <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline dark:text-gray-400 mb-0.5">Total</span>
                      <span className="text-2xl font-bold text-on-surface dark:text-white leading-none">{dayStats.total}</span>
                  </div>
                  <div className="w-px h-8 bg-outline-variant/20 dark:bg-gray-800"></div>
                   <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Done</span>
                      <span className="text-2xl font-bold text-on-surface dark:text-white leading-none">{dayStats.done}</span>
                  </div>
                  <div className="w-px h-8 bg-outline-variant/20 dark:bg-gray-800"></div>
                   <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Pending</span>
                      <span className="text-2xl font-bold text-on-surface dark:text-white leading-none">{dayStats.pending}</span>
                  </div>
              </div>
          </div>

          <div className="px-5 pb-24 min-h-[50vh]">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-medium text-outline">Loading schedule...</p>
                </div>
            ) : filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-surface-variant/50 flex items-center justify-center mb-4">
                        <MdAccessTime size={32} className="text-outline" />
                    </div>
                    <h3 className="text-base font-bold text-on-surface dark:text-gray-200">No Appointments</h3>
                    <p className="text-sm text-outline dark:text-gray-500 text-center max-w-[200px] mt-1">
                        There are no scheduled visits for {new Date(selectedDate).toLocaleDateString()}.
                    </p>
                </div>
            ) : (
                <div className="relative pl-2">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-[3.5rem] top-4 bottom-4 w-px bg-outline-variant/30 dark:bg-gray-800 border-l border-dashed border-gray-300 dark:border-gray-700"></div>

                    <div className="space-y-6">
                        {filteredAppointments.map((appt, i) => (
                            <div key={appt.registration_id} className="relative flex gap-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                                {/* Time Column */}
                                <div className="flex flex-col items-end w-[2.8rem] pt-1.5 shrink-0">
                                    <span className="text-sm font-bold text-on-surface dark:text-white leading-none">
                                        {appt.appointment_time.slice(0, 5)}
                                    </span>
                                    <div className="text-[9px] font-bold text-outline dark:text-gray-500 uppercase mt-0.5 tracking-wider">
                                        {parseInt(appt.appointment_time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}
                                    </div>
                                </div>

                                {/* Timeline Node */}
                                <div className="relative z-10 pt-2 shrink-0">
                                    <div className={`w-3.5 h-3.5 rounded-full ring-4 ring-bg-surface dark:ring-gray-950 shadow-sm ${getStatusColor(appt.status)}`}></div>
                                </div>
                                
                                {/* Card */}
                                <div className={`flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-[20px] p-4 border shadow-sm transition-all active:scale-[0.98] ${getStatusStyles(appt.status)}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate pr-2">
                                                {appt.patient_name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                                    <MdPerson size={10} />
                                                    <span>{appt.gender || '?'}, {appt.age || '-'}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md uppercase text-[9px] font-bold tracking-wider text-white ${getStatusColor(appt.status)}`}>
                                                    {appt.status}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Status Context Menu or simple more button */}
                                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 -mr-2 -mt-2">
                                            <MdMoreVert size={18} />
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    {['cancelled', 'closed'].includes(appt.status.toLowerCase()) ? null : (
                                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/50 relative">
                                            {appt.phone_number && (
                                                <a href={`tel:${appt.phone_number}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                    <MdPhone size={14} /> Call
                                                </a>
                                            )}
                                            
                                            {appt.status !== 'consulted' && (
                                                <div className="flex-[2] relative">
                                                    <div className="flex items-center bg-primary rounded-full shadow-sm shadow-primary/20 overflow-hidden">
                                                        <button 
                                                            onClick={() => handleStatusUpdate(appt.registration_id, 'consulted')}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-on-primary text-xs font-bold hover:bg-black/10 transition-colors whitespace-nowrap"
                                                        >
                                                            <MdCheckCircle size={14} className="shrink-0" /> Check In
                                                        </button>
                                                        <div className="w-px h-5 bg-white/20"></div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(activeDropdownId === appt.registration_id ? null : appt.registration_id);
                                                            }}
                                                            className={`px-2 py-2.5 text-on-primary hover:bg-black/10 transition-colors flex items-center justify-center ${activeDropdownId === appt.registration_id ? 'bg-black/10' : ''}`}
                                                        >
                                                            <MdArrowDropDown size={18} />
                                                        </button>
                                                    </div>

                                                    {/* Dropdown Menu */}
                                                    {activeDropdownId === appt.registration_id && (
                                                        <>
                                                            <div 
                                                                className="fixed inset-0 z-10" 
                                                                onClick={() => setActiveDropdownId(null)}
                                                            />
                                                            <div className="absolute right-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-scale-in origin-bottom-right">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleStatusUpdate(appt.registration_id, 'pending');
                                                                        setActiveDropdownId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <MdHistory size={16} className="text-amber-500" /> Mark Pending
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default AppointmentsScreen;
