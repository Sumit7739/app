import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    Wallet, 
    Filter, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Clock, 
    FileText,
    Loader2,
    Banknote,
    CreditCard,
    Building2,
    UserCircle,
    Plus,
    X
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface Expense {
    expense_id: number;
    voucher_no: string;
    description: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    expense_date: string;
    paid_to: string;
    expense_for: string;
    payment_method: string;
    branch_name: string;
    creator_username: string;
    approver_username: string | null;
}

const AdminExpensesScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'clinic' | 'admin'>('clinic');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [stats, setStats] = useState({ total_amount: 0 });
    const [branches, setBranches] = useState<{branch_id: number, branch_name: string}[]>([]);
    
    // Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        branch_id: user?.branch_id || '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'cash',
        cheque_details: '',
        paid_to: '',
        description: ''
    });

    // Filters
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    
    // Fetch Branches
    useEffect(() => {
        const fetchBranches = async () => {
            if (!user?.employee_id) return;
            try {
                const response = await fetch(`${API_BASE_URL}/admin/expenses.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_branches', user_id: user.employee_id })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    setBranches(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch branches", error);
            }
        };
        fetchBranches();
    }, [user?.employee_id]);

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('type', activeTab);
            params.append('start_date', startDate);
            params.append('end_date', endDate);
            if (user?.branch_id) params.append('branch_id', user.branch_id.toString());
            
            const response = await fetch(`${API_BASE_URL}/admin/expenses.php?${params.toString()}`);
            const data = await response.json();

            if (data.status === 'success') {
                setExpenses(data.data);
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to fetch expenses", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [activeTab]);

    const handleUpdateStatus = async (expenseId: number, newStatus: string) => {
        try {
            // Optimistic update
            setExpenses(prev => prev.map(e => 
                e.expense_id === expenseId ? { ...e, status: newStatus as any } : e
            ));

            const response = await fetch(`${API_BASE_URL}/admin/expenses.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_status',
                    expense_id: expenseId,
                    status: newStatus,
                    user_id: user?.employee_id
                })
            });
            const data = await response.json();
            if (data.status !== 'success') {
                // Revert on failure
                fetchExpenses();
                alert('Failed to update status: ' + data.message);
            }
        } catch (error) {
            console.error(error);
            fetchExpenses();
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/expenses.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_admin_expense',
                    user_id: user?.employee_id,
                    ...formData
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                setIsModalOpen(false);
                setFormData({ 
                    branch_id: user?.branch_id || '',
                    category: '',
                    expense_date: new Date().toISOString().split('T')[0],
                    amount: '',
                    payment_method: 'cash',
                    cheque_details: '',
                    paid_to: '',
                    description: ''
                });
                fetchExpenses();
                alert('Expense added successfully');
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to create expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
            case 'rejected': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30';
            case 'paid': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
            default: return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 pb-2 pt-[max(env(safe-area-inset-top),16px)]">
                <div className="px-4 mb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Expenses</h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manage & Approve</p>
                    </div>
                    {/* Add Button (Visible on Admin Tab) */}
                    {activeTab === 'admin' && (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                        >
                            <Plus size={24} />
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="px-4 mb-4">
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('clinic')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'clinic' 
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Clinic (Reception)
                        </button>
                        <button 
                            onClick={() => setActiveTab('admin')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'admin' 
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Admin (Operational)
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl flex-1 min-w-[200px]">
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
                        onClick={fetchExpenses}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-2.5 rounded-xl shadow-lg hover:scale-105 transition-transform"
                     >
                        <Filter size={16} />
                     </button>
                </div>
            </div>

            {/* Stats Card */}
            <div className="px-4 pt-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 p-5 rounded-3xl shadow-lg text-white">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Wallet size={20} />
                        </div>
                         <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase tracking-wide">
                            {activeTab === 'clinic' ? 'Clinic Total' : 'Admin Total'}
                         </span>
                    </div>
                    <div>
                         <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Total Expenses</p>
                         <h3 className="text-2xl font-black tracking-tight mt-1">
                            {formatCurrency(stats.total_amount)}
                         </h3>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar pb-24">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                ) : expenses.length > 0 ? (
                    expenses.map((expense) => (
                        <div key={expense.expense_id} className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                            
                            {/* Top Row: Date & Status */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-xs font-bold">
                                        {new Date(expense.expense_date).getDate()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                                            {new Date(expense.expense_date).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium">
                                            {expense.voucher_no}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(expense.status)} capitalize flex items-center gap-1`}>
                                    {expense.status === 'approved' && <CheckCircle size={10} />}
                                    {expense.status === 'rejected' && <XCircle size={10} />}
                                    {expense.status === 'pending' && <Clock size={10} />}
                                    {expense.status}
                                </div>
                            </div>

                            {/* Middle: Details */}
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{expense.paid_to}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{expense.description || expense.expense_for}</p>
                                
                                <div className="flex items-center gap-4 mt-3">
                                     <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                         <Building2 size={12} />
                                         <span>{expense.branch_name}</span>
                                     </div>
                                     <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                         <UserCircle size={12} />
                                         <span>{expense.creator_username.split(' ')[0]}</span>
                                     </div>
                                </div>
                            </div>

                            {/* Bottom: Amount & Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50">
                                <div className="flex items-center gap-2">
                                     {expense.payment_method === 'cash' ? <Banknote size={16} className="text-orange-400" /> : <CreditCard size={16} className="text-blue-400" />}
                                     <span className="text-lg font-black text-gray-900 dark:text-white">
                                        {formatCurrency(expense.amount)}
                                     </span>
                                </div>

                                {/* Actions (Only for Clinic & Pending) */}
                                {activeTab === 'clinic' && expense.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleUpdateStatus(expense.expense_id, 'approved')}
                                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-transform"
                                        >
                                            Approve
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(expense.expense_id, 'rejected')}
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="text-gray-400" size={24} />
                        </div>
                        <h3 className="text-gray-900 dark:text-white font-bold">No Expenses</h3>
                        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">New Operational Expense</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <form id="expenseForm" onSubmit={handleCreateExpense} className="space-y-4">
                                {/* Branch (Auto-detected for now, can be select if needed) */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Branch</label> 
                                     {/* Simple Select for now, fallback to user's branch */}
                                    <select 
                                        value={formData.branch_id} 
                                        onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(branch => (
                                            <option key={branch.branch_id} value={branch.branch_id}>
                                                {branch.branch_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={formData.expense_date}
                                            onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                                            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                        />
                                     </div>
                                      <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            required
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                        />
                                     </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                    <select 
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Salary">Salary / Wages</option>
                                        <option value="Rent">Rent</option>
                                        <option value="Electricity">Electricity Bill</option>
                                        <option value="Internet">Internet / WiFi</option>
                                        <option value="Maintenance">Maintenance & Repairs</option>
                                        <option value="Marketing">Marketing / Ads</option>
                                        <option value="Provisions">Provisions / Inventory</option>
                                        <option value="Equipment">Medical Equipment</option>
                                        <option value="Petty Cash">Petty Cash Refill</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Paid To</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Payee Name"
                                        value={formData.paid_to}
                                        onChange={(e) => setFormData({...formData, paid_to: e.target.value})}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Payment Method</label>
                                    <select 
                                        required
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI / GPay / PhonePe</option>
                                        <option value="net_banking">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {formData.payment_method === 'cheque' && (
                                     <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Cheque Details</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Cheque No. & Bank"
                                            value={formData.cheque_details}
                                            onChange={(e) => setFormData({...formData, cheque_details: e.target.value})}
                                            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <textarea 
                                        rows={3}
                                        className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm font-bold border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-indigo-500 resize-none"
                                        placeholder="Add notes..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    ></textarea>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 mx-4 mb-4">
                            <button 
                                type="submit" 
                                form="expenseForm"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExpensesScreen;


