import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    Calendar, 
    Filter, 
    ChevronDown, 
    Banknote, 
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Loader2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface LedgerSummary {
    total_income: number;
    total_expenses: number;
    net_profit_loss: number;
    opening_balance: number;
    current_balance: number;
}

interface Transaction {
    description: string;
    branch_name: string;
    method: 'cash' | 'online';
    credit: number;
    debit: number;
    time: string;
}

interface DailyLedger {
    date: string;
    opening_balance: { total: number; cash: number; online: number };
    credits: { total: number; cash: number; online: number };
    debits: { total: number; cash: number; online: number };
    closing_balance: { total: number; cash: number; online: number };
    transactions: Transaction[];
}

const LedgerScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState<LedgerSummary | null>(null);
    const [ledger, setLedger] = useState<DailyLedger[]>([]);
    
    // Filters
    const now = new Date();
    // Default to first day of current month
    const listStartOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const listEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(listStartOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(listEndOfMonth.toISOString().split('T')[0]);
    
    // Expanded state for accordion
    const [expandedDate, setExpandedDate] = useState<string | null>(null);

    const fetchLedger = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            const branchId = user?.branch_id || 1; 
            params.append('branch_id', branchId.toString());
            params.append('start_date', startDate);
            params.append('end_date', endDate);

            // Use the newly created API
            const response = await fetch(`${API_BASE_URL}/admin/ledger.php?${params.toString()}`);
            const data = await response.json();

            if (data.status === 'success') {
                setSummary(data.summary);
                setLedger(data.ledger);
            }
        } catch (error) {
            console.error("Failed to fetch ledger", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, []); // Initial load

    // Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Format Date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear(),
            weekday: date.toLocaleString('default', { weekday: 'long' })
        };
    };

    const toggleExpand = (date: string) => {
        setExpandedDate(expandedDate === date ? null : date);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 pb-2 pt-[max(env(safe-area-inset-top),16px)]">
                <div className="px-4 flex items-center justify-between mb-4">
                     <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Financial Ledger</h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Real-time Overview</p>
                    </div>
                    {/* Current Balance Tag */}
                    <div className="text-right">
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Balance</p>
                         <p className="text-lg font-black text-teal-600 dark:text-teal-400 tracking-tight">
                            {summary ? formatCurrency(summary.current_balance) : '...'}
                         </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                     <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl flex-1">
                        <div className="relative flex-1">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-transparent border-none text-xs font-bold text-gray-900 dark:text-white pl-8 pr-2 focus:ring-0"
                            />
                        </div>
                        <span className="text-gray-400 text-xs">-</span>
                        <div className="relative flex-1">
                             <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-transparent border-none text-xs font-bold text-gray-900 dark:text-white pl-2 pr-2 focus:ring-0 text-right"
                            />
                        </div>
                     </div>
                     <button 
                        onClick={fetchLedger}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-2.5 rounded-xl shadow-lg hover:scale-105 transition-transform"
                     >
                        <Filter size={16} />
                     </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
                
                {isLoading && !summary ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-teal-500" size={32} />
                    </div>
                ) : (
                    <>
                        {/* KPI Card - Merged */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 overflow-hidden">
                            <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
                                {/* Income */}
                                <div className="p-4 flex flex-col items-center justify-center text-center group hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors">
                                    <div className="mb-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp size={16} />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Income</p>
                                    <h3 className="text-sm md:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                        {formatCurrency(summary?.total_income || 0)}
                                    </h3>
                                </div>

                                {/* Expenses */}
                                <div className="p-4 flex flex-col items-center justify-center text-center group hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors">
                                    <div className="mb-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-full text-rose-500 dark:text-rose-400">
                                        <TrendingDown size={16} />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expenses</p>
                                    <h3 className="text-sm md:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                        {formatCurrency(summary?.total_expenses || 0)}
                                    </h3>
                                </div>

                                {/* Net Balance */}
                                <div className="p-4 flex flex-col items-center justify-center text-center group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors relative overflow-hidden">
                                     <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                        <Wallet size={16} />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net</p>
                                    <h3 className={`text-sm md:text-lg font-black tracking-tight ${
                                        (summary?.net_profit_loss || 0) >= 0 
                                        ? 'text-teal-600 dark:text-teal-400' 
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {(summary?.net_profit_loss || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.net_profit_loss || 0)}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {ledger.length > 0 ? ledger.map((day) => {
                                const d = formatDate(day.date);
                                const isExpanded = expandedDate === day.date;
                                
                                return (
                                    <div key={day.date} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                                        {/* Header */}
                                        <div 
                                            onClick={() => toggleExpand(day.date)}
                                            className="p-4 flex flex-col gap-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none">{d.month}</span>
                                                        <span className="text-xl font-black text-gray-900 dark:text-white leading-none mt-0.5">{d.day}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{d.weekday}</p>
                                                        <p className="text-xs text-gray-400 font-medium">{d.year}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Closing</p>
                                                        <p className="text-base font-black text-gray-900 dark:text-white">
                                                            {formatCurrency(day.closing_balance.total)}
                                                        </p>
                                                    </div>
                                                    <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronDown size={16} className="text-gray-500" />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Cash & Bank Row */}
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0">
                                                        <Banknote size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Cash In Hand</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(day.closing_balance.cash)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 justify-end md:justify-start">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0 order-last md:order-first">
                                                        <CreditCard size={14} />
                                                    </div>
                                                    <div className="text-right md:text-left">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Bank / Online</p>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(day.closing_balance.online)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-5 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                                
                                                {/* Balance Sheet Table */}
                                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                    <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Balance Sheet</h4>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs whitespace-nowrap">
                                                            <thead>
                                                                <tr className="border-b border-gray-50 dark:border-gray-700">
                                                                    <th className="px-3 py-2 text-left font-bold text-gray-400 uppercase">Type</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-gray-400 uppercase">Open</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-emerald-500 uppercase">Cr</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-rose-500 uppercase">Dr</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-gray-400 uppercase">Close</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 font-medium">
                                                                <tr>
                                                                    <td className="px-3 py-2 flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></div> Cash
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-gray-500">{day.opening_balance.cash.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right text-emerald-600">{day.credits.cash.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right text-rose-600">{day.debits.cash.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">{day.closing_balance.cash.toLocaleString('en-IN')}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="px-3 py-2 flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div> Online
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-gray-500">{day.opening_balance.online.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right text-emerald-600">{day.credits.online.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right text-rose-600">{day.debits.online.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">{day.closing_balance.online.toLocaleString('en-IN')}</td>
                                                                </tr>
                                                                <tr className="bg-gray-50 dark:bg-gray-700/20 font-bold">
                                                                    <td className="px-3 py-2">Total</td>
                                                                    <td className="px-3 py-2 text-right">{day.opening_balance.total.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right text-emerald-600">{day.credits.total.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right text-rose-600">{day.debits.total.toLocaleString('en-IN')}</td>
                                                                    <td className="px-3 py-2 text-right">{day.closing_balance.total.toLocaleString('en-IN')}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Transactions List */}
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">Transactions</h4>
                                                    <div className="space-y-2">
                                                        {day.transactions.map((txn, idx) => (
                                                            <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                                                        ${txn.method === 'cash' ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/20' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20'}`}>
                                                                        {txn.method === 'cash' ? <Banknote size={18} /> : <CreditCard size={18} />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">{txn.description}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-medium">{txn.time}</span>
                                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{txn.method}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right pl-2">
                                                                    {txn.credit > 0 ? (
                                                                        <div className="text-emerald-600 dark:text-emerald-400 flex flex-col items-end">
                                                                             <div className="flex items-center gap-0.5">
                                                                                <ArrowDownLeft size={12} />
                                                                                <span className="text-sm font-black">+{txn.credit}</span>
                                                                             </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-rose-600 dark:text-rose-400 flex flex-col items-end">
                                                                             <div className="flex items-center gap-0.5">
                                                                                <ArrowUpRight size={12} />
                                                                                <span className="text-sm font-black">-{txn.debit}</span>
                                                                             </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-400 text-sm">No transactions found for this period.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LedgerScreen;
