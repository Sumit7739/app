import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Plus, X, AlignLeft, 
  Wallet, CheckCircle, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

// --- Modals ---

const ExpenseDetailsModal = ({ expense, onClose }: { expense: any; onClose: () => void }) => {
    if (!expense) return null;
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-white/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex flex-col justify-between text-white pb-8">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                    <div className="relative z-10 flex justify-between items-start mb-6">
                         <h3 className="text-lg font-black tracking-wide">Voucher Details</h3>
                         <button onClick={onClose} className="p-1.5 bg-black/20 rounded-full hover:bg-black/40 transition-colors">
                            <X size={16} />
                         </button>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-medium opacity-80 uppercase">Total Amount</p>
                        <h2 className="text-4xl font-black tracking-tight">₹{Number(expense.amount).toLocaleString()}</h2>
                        {expense.amount_in_words && (
                            <p className="text-[10px] font-medium opacity-80 italic mt-1 capitalize">
                                {expense.amount_in_words}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="px-6 py-6 space-y-5 -mt-4 bg-white dark:bg-gray-800 rounded-t-[2rem] relative z-20">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                         <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                         <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                             expense.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                             expense.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                         }`}>
                             {expense.status}
                         </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Paid To</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{expense.paid_to}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Date</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{new Date(expense.expense_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Done By</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{expense.expense_done_by || 'N/A'}</p>
                        </div>
                         <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Payment</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white capitalize leading-tight">{expense.payment_method}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Category / For</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{expense.expense_for}</p>
                        </div>
                    </div>

                    {expense.description && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                <AlignLeft size={10} /> Description
                            </p>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                                {expense.description}
                            </p>
                        </div>
                    )}
                    
                    <div className="text-center pt-2">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold font-mono">Voucher No: {expense.voucher_no}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Utility for Indian Number to Words
const numberToWords = (price: any) => {
  const sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const handle_tens = (d: any) => {
    let str = "";
    let num = parseInt(d);
    if (num > 0 && num < 10) {
      str = sglDigit[num] + " ";
    } else if (num > 9 && num < 20) {
      str = dblDigit[num - 10] + " ";
    } else if (num > 19) {
      str = tensPlace[parseInt(d[0])] + " " + sglDigit[parseInt(d[1])] + " ";
    } else {
        return "";
    }
    return str;
  };

  const convert = (n: any) => {
    let str = "";
    let num = parseInt(n);
    if (!num) return "";
    
    // Crores
    if (num >= 10000000) {
        str += convert(Math.floor(num / 10000000)) + "Crore ";
        num %= 10000000;
    }
    // Lakhs
    if (num >= 100000) {
        str += convert(Math.floor(num / 100000)) + "Lakh ";
        num %= 100000;
    }
    // Thousands
    if (num >= 1000) {
        str += convert(Math.floor(num / 1000)) + "Thousand ";
        num %= 1000;
    }
    // Hundreds
    if (num >= 100) {
        str += convert(Math.floor(num / 100)) + "Hundred ";
        num %= 100;
    }
    // Tens & Units
    if (num > 0) {
        if(str != "") str += "and ";
        str += handle_tens(num.toString().padStart(2,'0'));
    }
    return str;
  };

  let str = convert(price).trim();
  // Fix weird "Zero " suffix if any
  return str ? str + " Rupees Only" : "";
}

const AddExpenseModal = ({ show, onClose, onSave, loading }: any) => {
    if (!show) return null;
    
    const [formData, setFormData] = useState({
        voucher_no: '',
        expense_date: new Date().toISOString().split('T')[0],
        paid_to: '',
        expense_done_by: '',
        expense_for: '',
        amount: '',
        payment_method: '',
        description: '',
        amount_in_words: ''
    });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'amount') {
                newData.amount_in_words = value ? numberToWords(Number(value)) : '';
            }
            return newData;
        });
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4 pb-24 sm:pb-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[95vh] animate-in slide-in-from-bottom-10 duration-300">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">New Expense</h3>
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Create Voucher</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="add-expense-form" onSubmit={handleSubmit} className="space-y-5">
                         {/* Amount Hero Input */}
                         <div className="flex flex-col items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                             <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Total Amount</label>
                             <div className="relative flex items-center justify-center w-full">
                                 <span className="text-2xl font-black text-indigo-300 mr-1">₹</span>
                                 <input 
                                     type="number" name="amount" required min="1" step="0.01" placeholder="0"
                                     value={formData.amount} onChange={handleChange}
                                     className="w-1/2 bg-transparent text-center text-4xl font-black text-indigo-600 dark:text-indigo-300 border-none outline-none placeholder-indigo-200"
                                     autoFocus
                                 />
                             </div>
                         </div>

                         {/* Common Fields */}
                         <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Paid To</label>
                                     <input 
                                         type="text" name="paid_to" required
                                         value={formData.paid_to} onChange={handleChange}
                                         className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-indigo-500 transition-all"
                                         placeholder="Recipient"
                                     />
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Method</label>
                                     <select 
                                         name="payment_method" required
                                         value={formData.payment_method} onChange={handleChange}
                                         className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-0 appearance-none"
                                     >
                                         <option value="">Select...</option>
                                         <option value="cash">Cash</option>
                                         <option value="online">Online / UPI</option>
                                         <option value="card">Card</option>
                                         <option value="cheque">Cheque</option>
                                     </select>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">For / Category</label>
                                     <input 
                                         type="text" name="expense_for" required
                                         value={formData.expense_for} onChange={handleChange}
                                         className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-indigo-500 transition-all"
                                         placeholder="e.g. Supplies"
                                     />
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Date</label>
                                     <input 
                                         type="date" name="expense_date" required
                                         value={formData.expense_date} onChange={handleChange}
                                         className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-0"
                                     />
                                 </div>
                             </div>

                             <div className="space-y-1">
                                     <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Amount In Words</label>
                                     <input 
                                         type="text" name="amount_in_words"
                                         value={formData.amount_in_words} onChange={handleChange}
                                         className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-0"
                                         placeholder="e.g. Three Thousand Only"
                                     />
                             </div>
                             
                             <div className="space-y-1">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Description (Optional)</label>
                                 <textarea 
                                     name="description" 
                                     value={formData.description} onChange={handleChange}
                                     placeholder="Add notes..."
                                     rows={2}
                                     className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-0 resize-none opacity-80 focus:opacity-100 transition-opacity"
                                 />
                             </div>
                         </div>
                    </form>
                </div>

                <div className="p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
                    <button 
                        form="add-expense-form"
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div> : <CheckCircle size={18} />}
                        Save Voucher
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
                        Approval status will be calculated automatically based on daily budget.
                    </p>
                </div>
             </div>
        </div>
    );
};


export const ExpensesScreen = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // State
    const [loading, setLoading] = useState(false);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    
    // Dates
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Fetch Data
    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
            const branchId = user?.branch_id || 1;
            
            const params = new URLSearchParams({
                branch_id: branchId.toString(),
                start_date: startDate,
                end_date: endDate,
                limit: '1000' // Ensure we get all records for the month/range
            });

            const res = await fetch(`${baseUrl}/expenses.php?${params.toString()}`);
            const json = await res.json();
            
            if (json.status === 'success') {
                setExpenses(json.data);
                setStats(json.stats);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [startDate, endDate]);

    const handleSaveExpense = async (formData: any) => {
        setSaving(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
            const branchId = user?.branch_id || 1;
            const res = await fetch(`${baseUrl}/expenses.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    branch_id: branchId,
                    user_id: user?.id || 0,
                    expense_done_by: formData.expense_done_by || user?.name || 'Admin'
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setShowAddModal(false);
                fetchExpenses();
            } else {
                alert("Error: " + json.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (n: any) => {
        const num = Number(n);
        return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 relative">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-5 py-4 pt-[var(--safe-area-inset-top,32px)] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
                    </button>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest">Expenses</h1>
                    <div className="w-8"></div> {/* Spacer for alignment since FAB is moved */}
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 relative group">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-transparent text-gray-900 dark:text-white rounded-xl pl-9 pr-2 py-2 text-xs font-bold outline-none"
                        />
                    </div>
                    <span className="text-gray-400"><ArrowLeft size={12} className="rotate-180" /></span>
                    <div className="flex-1 relative group">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-transparent text-gray-900 dark:text-white rounded-xl pl-9 pr-2 py-2 text-xs font-bold outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="px-5 pt-4 shrink-0">
                     <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl">
                         <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                         
                         <div className="relative z-10 flex justify-between items-end">
                             <div>
                                 <p className="text-xs font-bold opacity-60 uppercase mb-1">Total Spent</p>
                                 <h2 className="text-3xl font-black tracking-tight">{formatCurrency(stats.total_amount)}</h2>
                                 <div className="flex items-center gap-2 mt-2">
                                     <div className="px-2 py-0.5 rounded bg-white/10 dark:bg-black/10 text-[10px] font-bold">
                                         {stats.total_expenses} Vouchers
                                     </div>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-base font-bold opacity-60 uppercase mb-1">Budget Left (Today)</p>
                                 <h3 className={`text-xl font-black ${
                                     Number(stats.remaining_today) < 0 ? 'text-rose-400 dark:text-rose-600' : 'text-emerald-400 dark:text-emerald-600'
                                 }`}>
                                     {formatCurrency(stats.remaining_today)}
                                 </h3>
                                 <p className="text-[9px] opacity-40 mt-1">Daily Limit: {formatCurrency(stats.daily_budget)}</p>
                             </div>
                         </div>
                     </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 space-y-3">
                {(!expenses.length && !loading) && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <Wallet size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm font-bold text-gray-400">No expenses recorded</p>
                    </div>
                )}
                
                {expenses.map((item, idx) => (
                    <div 
                        key={idx}
                        onClick={() => setSelectedExpense(item)} 
                        className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-all hover:shadow-md cursor-pointer relative overflow-hidden"
                    >
                         <div className={`absolute top-0 left-0 w-1 h-full ${
                             item.status === 'approved' ? 'bg-emerald-500' : item.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
                         }`}></div>
                         
                         <div className="flex justify-between items-center pl-3">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-xs font-black text-gray-400">
                                     {new Date(item.expense_date).getDate()}
                                 </div>
                                 <div>
                                     <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.paid_to}</h4>
                                     <div className="flex items-center gap-1.5 mt-0.5">
                                         <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{item.expense_for}</p>
                                         <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                         <p className="text-[10px] text-gray-400">{item.expense_done_by}</p>
                                     </div>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-base font-black text-gray-900 dark:text-white">{formatCurrency(item.amount)}</p>
                                 <div className="flex items-center justify-end gap-1 mt-0.5">
                                      {item.status === 'pending' && <Clock size={10} className="text-amber-500" />}
                                      <span className={`text-[9px] font-bold uppercase ${
                                           item.status === 'approved' ? 'text-emerald-500' : item.status === 'pending' ? 'text-amber-500' : 'text-rose-500'
                                      }`}>{item.status}</span>
                                 </div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>

            {/* FAB (Floating Action Button) - Bottom Right */}
            <button 
                 onClick={() => setShowAddModal(true)}
                 className="fixed bottom-24 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-700 active:scale-95 transition-all z-40 animate-in zoom-in slide-in-from-bottom-5 duration-300"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>
            
            <AddExpenseModal 
                show={showAddModal} 
                onClose={() => setShowAddModal(false)}
                onSave={handleSaveExpense}
                loading={saving}
            />
            
            <ExpenseDetailsModal 
                expense={selectedExpense} 
                onClose={() => setSelectedExpense(null)} 
            />
        </div>
    );
};
