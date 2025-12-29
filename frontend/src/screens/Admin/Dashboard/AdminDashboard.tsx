import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTheme } from '../../../hooks';
import { 
  Users, 
  Activity, 
  FileText, 
  Receipt,
  Sun,
  Moon,
  Bell,
  IndianRupee,
  Clock,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

// --- Interfaces ---

interface DashboardData {
    status: string;
    kpi: {
        registrations: {
            total: number;
            today: number;
            revenue_today: number;
            revenue_total: number;
            breakdown: { wait: number; cncl: number; done: number };
        };
        patients: {
            total: number;
            today: number;
            revenue_today: number;
            revenue_total: number;
            breakdown: { active: number; inactive: number };
        };
        tests: {
            total: number;
            today: number;
            revenue_today: number;
            revenue_total: number;
            breakdown: { pending: number; done: number };
        };
        expenses: {
            total_count: number;
            total_spend: number;
            today_spend: number;
        };
        sessions: {
            total: number;
            today: number;
            month: number;
        };
        overall: {
            today_revenue: number;
            total_revenue: number;
        };
    };
    charts: {
        financial_growth: Array<{ date: string; income: number; expense: number }>;
        expense_analysis: Array<{ category: string; amount: number }>;
        treatment_plans?: Array<{ type: string; count: number }>;
        service_mix?: Array<{ type: string; count: number }>;
        test_types?: Array<{ type: string; count: number }>;
    };
    recent_activity?: Array<{
        user: string;
        action: string;
        details: string;
        time: string;
    }>;
}

interface Notification {
    notification_id: number;
    message: string;
    link_url: string;
    is_read: number;
    created_at: string;
    first_name: string;
    last_name: string;
}

// --- Chart Components ---

const SimpleBarChart = ({ data }: { data: Array<{ type: string; count: number }> }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400">No Data Available</div>;

    const maxVal = Math.max(...data.map(d => d.count)) || 1;
    const colors = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

    return (
        <div className="flex items-end justify-around h-full pt-8 pb-6 px-4 gap-2">
            {data.map((item, index) => {
                // Cap max height at 80% to leave room for the label on top
                const heightPct = (item.count / maxVal) * 80;
                return (
                    <div key={index} className="flex flex-col items-center justify-end h-full w-full max-w-[48px] group">
                        <div className="relative w-full flex items-end justify-center h-full mb-2"> 
                            {/* Count Label (Always Visible) */}
                            <div className="absolute -top-6 text-[10px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                                {item.count}
                            </div>
                            
                            {/* Bar */}
                            <div 
                                className="w-full rounded-t-lg transition-all duration-500 hover:opacity-90"
                                style={{ 
                                    height: `${Math.max(heightPct, 4)}%`, // Minimum height for visibility
                                    backgroundColor: colors[index % colors.length] 
                                }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase text-center leading-tight truncate w-full" title={item.type}>
                            {item.type}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// Line Chart for Finance (Smoothed)
const SimpleLineChart = ({ data }: { data: Array<{ date: string; income: number; expense: number }> }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400">No Finance Data</div>;
    
    // Normalize data
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense))) || 1;
    
    // Calculate Totals
    const totalIncome = data.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = data.reduce((acc, curr) => acc + curr.expense, 0);

    // Padding for chart area (stroke width buffer)
    const PADDING_TOP = 5;
    const PADDING_BOTTOM = 5;
    const AVAILABLE_HEIGHT = 100 - PADDING_TOP - PADDING_BOTTOM;

    // Helper to generate smooth path
    const getPath = (key: 'income' | 'expense', color: string) => {
        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            // Map Y to [PADDING_TOP, 100 - PADDING_BOTTOM] range
            const normalizedVal = d[key] / maxVal;
            const y = PADDING_TOP + (1 - normalizedVal) * AVAILABLE_HEIGHT;
            return [x, y];
        });

        if (points.length < 2) return "";

        let d = `M ${points[0][0]},${points[0][1]}`;
        
        for (let i = 1; i < points.length; i++) {
            const [x0, y0] = points[i - 1];
            const [x1, y1] = points[i];
            
            // Control points for smooth bezier (horizontal smoothing)
            const cp1x = x0 + (x1 - x0) / 2;
            const cp1y = y0;
            const cp2x = x1 - (x1 - x0) / 2;
            const cp2y = y1;
            
            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
        }

        return (
            <path 
                d={d} 
                fill="none" 
                stroke={color} 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                vectorEffect="non-scaling-stroke"
            />
        );
    };

    return (
        <div className="relative h-full w-full pt-4 pb-4 px-1 flex flex-col">
            <div className="flex-1 w-full relative">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    <line x1="0" y1={PADDING_TOP} x2="100" y2={PADDING_TOP} stroke="currentColor" strokeOpacity="0.05" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.05" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={100 - PADDING_BOTTOM} x2="100" y2={100 - PADDING_BOTTOM} stroke="currentColor" strokeOpacity="0.05" vectorEffect="non-scaling-stroke" />

                    {getPath('expense', '#f43f5e')}
                    {getPath('income', '#14b8a6')}
                </svg>
                
                 {/* Legend */}
                 <div className="absolute -top-4 right-0 flex gap-3 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-500"></div>Income</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Expense</div>
                </div>
            </div>

             {/* Footer Totals */}
            <div className="flex justify-between items-end mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-col">
                     <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wide">Total Income</span>
                     <span className="text-sm font-bold text-teal-600 dark:text-teal-400">₹{totalIncome.toLocaleString()}</span>
                </div>
                 <div className="flex flex-col text-right">
                     <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wide">Total Expense</span>
                     <span className="text-sm font-bold text-rose-500">₹{totalExpense.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

// ... (SimplePieChart remains same, omitted for brevity if no changes needed, but putting it back to be safe)
const SimplePieChart = ({ data }: { data: Array<{ category: string; amount: number }> }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-gray-400">No Expense Data</div>;
    
    const total = data.reduce((acc, curr) => acc + curr.amount, 0) || 1;
    let cumulative = 0;
    const colors = ['#e11d48', '#f97316', '#3b82f6', '#8b5cf6', '#64748b'];

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="flex flex-col items-center gap-6 h-full justify-center">
            <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                     {data.map((item, index) => {
                        const startPct = cumulative / total;
                        cumulative += item.amount;
                        const endPct = cumulative / total;
                        
                        // If only one item, full circle
                        if(data.length === 1) return <circle cx="0" cy="0" r="1" fill={colors[0]} key={index} />;

                        const [startX, startY] = getCoordinatesForPercent(startPct);
                        const [endX, endY] = getCoordinatesForPercent(endPct);
                        const largeArcFlag = endPct - startPct > 0.5 ? 1 : 0;
                        const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                        return (
                            <path 
                                key={index} 
                                d={pathData} 
                                fill={colors[index % colors.length]} 
                                stroke="white"
                                strokeWidth="0.05"
                            />
                        );
                     })}
                </svg>
            </div>
            
            <div className="w-full grid grid-cols-1 gap-2 text-xs px-8">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 py-1 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                         <div className="flex items-center gap-3">
                             <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: colors[index % colors.length]}}></div>
                             <span className="text-gray-600 dark:text-gray-300 font-medium">{item.category}</span>
                         </div>
                         <span className="font-bold text-gray-900 dark:text-white">
                            {/* Display correct number without 'k' */}
                            {item.amount.toLocaleString()}
                         </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chart Tab State
  const [activeTab, setActiveTab] = useState<'finance' | 'plans' | 'services' | 'tests' | 'expenses'>('finance');

  // Notifications State ... (rest of code)

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
      if (!user) return;
      try {
          const empId = (user as any).employee_id || user.id;
          const res = await fetch(`${API_URL}/notifications.php?employee_id=${empId}`);
          const json = await res.json();
          if (json.status === 'success') {
              setNotifications(json.data);
              setUnreadCount(json.unread_count);
          }
      } catch (e) { console.error(e); }
  };

  const markAsRead = async (id: number) => {
      try {
          await fetch(`${API_URL}/notifications.php`, {
              method: 'POST',
              body: JSON.stringify({ action: 'mark_read', notification_id: id })
          });
          setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) { console.error(e); }
  };

  const fetchDashboardData = async () => {
    try {
        const branchId = user?.branch_id || 0; 
        const response = await fetch(`${API_URL}/admin/dashboard.php?branch_id=${branchId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            setData(result);
        }
    } catch (error) {
        console.error("Failed to fetch dashboard data", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(val);
  };

  const formatK = (n: number) => {
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
      return n;
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          </div>
      );
  }

  const kpi = data?.kpi;

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200 font-sans relative overflow-hidden">
      
      {/* Ambient Background Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-teal-400/10 dark:bg-teal-900/10 blur-3xl"></div>
         <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-900/10 blur-3xl"></div>
         <div className="absolute bottom-[0%] right-[0%] w-[60%] h-[60%] rounded-full bg-violet-400/5 dark:bg-violet-900/5 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="px-6 py-4 pt-11 flex items-center justify-between sticky top-0 z-30 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
             {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
           </p>
           <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Overview</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800/50 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 active:scale-95 transition-transform backdrop-blur-sm">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          
          <div className="relative">
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full bg-white dark:bg-gray-800/50 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 active:scale-95 transition-transform backdrop-blur-sm relative"
            >
                <Bell size={14} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-gray-900"></span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell size={20} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-medium">No notifications</p>
                            </div>
                        ) : (
                            notifications.slice(0, 5).map(notif => (
                                <div 
                                    key={notif.notification_id}
                                    onClick={() => {
                                        if (!notif.is_read) markAsRead(notif.notification_id);
                                        if (notif.link_url) window.open(notif.link_url, '_blank');
                                    }}
                                    className={`p-3 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!notif.is_read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.is_read ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                                        <div className="flex-1">
                                            <p className={`text-xs ${!notif.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                <Clock size={8} />
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 text-center">
                        <button 
                            onClick={() => {
                                setShowNotifications(false);
                                navigate('/admin/notifications');
                            }}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
          </div>

           <div 
               onClick={() => navigate('/admin/profile')}
               className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-400 to-teal-600 p-[2px] shadow-lg shadow-teal-500/20 active:scale-95 transition-transform cursor-pointer"
           >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                <span className="font-bold text-xs text-teal-600 dark:text-teal-400">{user?.name?.charAt(0) || 'A'}</span>
                </div>
            </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto z-10">
        
        {/* Top Feature: Total Revenue */}
        <div className="mb-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-teal-900 dark:to-teal-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-teal-500/20 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                         <div className="flex items-center gap-3 mb-2">
                             <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-inner">
                                <IndianRupee size={20} />
                            </div>
                            <span className="text-sm font-medium text-gray-300 uppercase tracking-widest">Total Revenue</span>
                         </div>
                         <div className="flex items-baseline gap-2">
                            <span className="text-4xl sm:text-5xl font-black tracking-tight">{formatCurrency(kpi?.overall?.total_revenue || 0)}</span>
                         </div>
                    </div>
                    
                    <div className="text-right">
                        <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Today's Revenue</span>
                        <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl inline-block border border-white/10">
                             <span className="font-bold text-emerald-300 text-lg">+{formatCurrency(kpi?.overall?.today_revenue || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Mobile: Grid Layout for Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            
            {/* 1. Registrations */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                        <FileText size={18} />
                    </div>
                    <div className="text-right">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rev</span>
                         <div className="text-xs font-black text-violet-600">₹{formatK(kpi?.registrations.revenue_today || 0)}</div>
                    </div>
                </div>
                
                <div className="mb-3">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{kpi?.registrations.today}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">Registrations</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-2 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Wait</div>
                        <div className="text-sm font-black text-gray-700 dark:text-gray-200">{kpi?.registrations.breakdown.wait}</div>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/10 rounded-xl p-2 text-center">
                         <div className="text-[10px] font-bold text-gray-400 uppercase">Done</div>
                         <div className="text-sm font-black text-violet-600 dark:text-violet-400">{kpi?.registrations.breakdown.done}</div>
                    </div>
                </div>
            </div>

            {/* 2. Patients */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Users size={18} />
                    </div>
                     <div className="text-right">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rev</span>
                         <div className="text-xs font-black text-teal-600">₹{formatK(kpi?.patients.revenue_today || 0)}</div>
                    </div>
                </div>
                
                <div className="mb-3">
                     <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{kpi?.patients.today}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">New Patients</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-teal-50 dark:bg-teal-900/10 rounded-xl p-2 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Actv</div>
                        <div className="text-sm font-black text-teal-600 dark:text-teal-400">{kpi?.patients.breakdown.active}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-2 text-center">
                         <div className="text-[10px] font-bold text-gray-400 uppercase">Inac</div>
                         <div className="text-sm font-black text-gray-700 dark:text-gray-200">{kpi?.patients.breakdown.inactive}</div>
                    </div>
                </div>
            </div>

            {/* 3. Tests */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Activity size={18} />
                    </div>
                    <div className="text-right">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rev</span>
                         <div className="text-xs font-black text-blue-600">₹{formatK(kpi?.tests.revenue_today || 0)}</div>
                    </div>
                </div>
                
                 <div className="mb-3">
                     <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{kpi?.tests.today}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">Tests</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-2 text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Pend</div>
                        <div className="text-sm font-black text-orange-500">{kpi?.tests.breakdown.pending}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-2 text-center">
                         <div className="text-[10px] font-bold text-gray-400 uppercase">Done</div>
                         <div className="text-sm font-black text-blue-600 dark:text-blue-400">{kpi?.tests.breakdown.done}</div>
                    </div>
                </div>
            </div>

            {/* 4. Expenses */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                 <div className="flex justify-between items-start mb-2">
                     <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
                        <Receipt size={18} />
                    </div>
                    <div className="text-right">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                         <div className="text-xs font-black text-gray-700 dark:text-gray-300">₹{formatK(kpi?.expenses.total_spend || 0)}</div>
                    </div>
                </div>
                
                 <div className="mb-3">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{kpi?.expenses.today_spend ? kpi.expenses.total_count : 0}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">Expenses</p>
                </div>

                 <div className="mt-auto">
                    <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-2 flex items-center justify-between px-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Today</span>
                        <span className="text-sm font-black text-rose-500">₹{formatK(kpi?.expenses.today_spend || 0)}</span>
                    </div>
                </div>
            </div>

            {/* 5. Sessions */}
            <div className="col-span-2 lg:col-span-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-pink-500 dark:text-pink-400">
                        <Users size={20} />
                     </div>
                     <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Sessions Today</p>
                         <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-0.5">{kpi?.sessions.today}</h3>
                     </div>
                 </div>
                 
                 <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Monthly</p>
                      <p className="text-lg font-black text-pink-500">{kpi?.sessions.month}</p>
                 </div>
            </div>

        </div>

        {/* Unified Charts Section */}
        <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
                
                {/* Header with Tabs */}
                <div className="p-4 md:px-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Analytics</h3>
                    
                    {/* Tabs / Switcher */}
                    <div className="flex p-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-x-auto hide-scrollbar">
                        {[
                            { id: 'finance', label: 'Finance' },
                            { id: 'plans', label: 'Treatment' },
                            { id: 'services', label: 'Services' },
                            { id: 'tests', label: 'Tests' },
                            { id: 'expenses', label: 'Expenses' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap
                                    ${activeTab === tab.id 
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm scale-100' 
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 scale-95'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart Content Area */}
                <div className="p-6 min-h-[480px] flex items-center justify-center">
                    
                    {activeTab === 'finance' && (
                        <div className="w-full h-96 flex flex-col">
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Revenue vs Expense</h4>
                                <div className="text-[10px] font-bold text-gray-400">Last 30 Days</div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <SimpleLineChart data={data?.charts.financial_growth || []} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'plans' && (
                         <div className="w-full h-96">
                             <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Patient Treatment Plans</h4>
                             <SimplePieChart data={((data?.charts?.treatment_plans || []) as any).map((d: any) => ({ category: d.type, amount: d.count }))} />
                         </div>
                    )}

                    {activeTab === 'services' && (
                        <div className="w-full h-96">
                             <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Overall Service Mix</h4>
                             <SimplePieChart data={((data?.charts?.service_mix || []) as any).map((d: any) => ({ category: d.type, amount: d.count }))} />
                         </div>
                    )}

                    {activeTab === 'tests' && (
                        <div className="w-full h-96">
                             <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 text-center">Top 5 Diagnostic Tests</h4>
                             <SimpleBarChart data={data?.charts.test_types || []} />
                        </div>
                    )}

                     {activeTab === 'expenses' && (
                        <div className="w-full h-96">
                             <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Expense Breakdown</h4>
                             <SimplePieChart data={data?.charts.expense_analysis || []} />
                        </div>
                    )}

                </div>
            </div>
        </div>
        
        {/* Footer Padding for Mobile Nav if exists */}
        <div className="h-20 md:hidden"></div>

      </main>
    </div>
  );
};
