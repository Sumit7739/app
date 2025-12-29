import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Search, CheckCircle, MessageSquare, 
  Smile, Meh, Frown, Clock, Activity, ArrowRight, ChevronDown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

// --- Type Definitions ---
type Patient = {
    patient_id: string | number;
    patient_name: string;
    phone_number: string;
    status: string;
};

type Feedback = {
    id: number;
    patient_name: string;
    staff_name: string;
    feedback_type: 'Good' | 'Average' | 'Bad';
    patient_status_snapshot: string;
    comments: string;
    created_at: string;
};

export const FeedbackScreen = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    
    // Form State
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const [feedbackType, setFeedbackType] = useState<string>('Good');
    const [status, setStatus] = useState<string>('active');
    const [comments, setComments] = useState('');

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
            const branchId = user?.branch_id || 1;
            const res = await fetch(`${baseUrl}/feedback.php?branch_id=${branchId}`);
            const json = await res.json();
            
            if (json.status === 'success') {
                setPatients(json.patients || []);
                setFeedbacks(json.feedbacks || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Suggestions
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return [];
        return patients.filter(p => 
            p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.phone_number.includes(searchTerm)
        ).slice(0, 5);
    }, [searchTerm, patients]);

    const handleSelectPatient = (p: Patient) => {
        setSelectedPatient(p);
        setSearchTerm(p.patient_name);
        setShowSuggestions(false);
        
        // Auto-set status based on current patient status
        let mappedStatus = 'active';
        if (p.status === 'completed') mappedStatus = 'completed';
        if (p.status === 'inactive') mappedStatus = 'discontinued';
        setStatus(mappedStatus);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) {
            alert("Please select a valid patient");
            return;
        }

        setSubmitting(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
            const branchId = user?.branch_id || 1;
            
            const res = await fetch(`${baseUrl}/feedback.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch_id: branchId,
                    user_id: user?.id || 0,
                    patient_id: selectedPatient.patient_id,
                    feedback_type: feedbackType,
                    patient_status: status,
                    comments: comments
                })
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                // Reset form
                setComments('');
                setSearchTerm('');
                setSelectedPatient(null);
                setFeedbackType('Good');
                fetchData(); // Refresh list
            } else {
                alert(json.message || "Failed to save");
            }
        } catch (err) {
            console.error(err);
            alert("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-5 py-4 pt-[var(--safe-area-inset-top,32px)] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
                    </button>
                    <div>
                         <h1 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest">Feedback</h1>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Patient Experience</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-6">
                
                {/* Form Card */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-white/50 dark:border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        
                        {/* Patient Search */}
                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Patient Name</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); setSelectedPatient(null); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder="Search patient..." 
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border-0 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-gray-400"
                                />
                                {selectedPatient && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 animate-in zoom-in">
                                        <CheckCircle size={18} fill="currentColor" className="text-white" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Suggestions Dropdown */}
                            {showSuggestions && searchTerm && !selectedPatient && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in slide-in-from-top-2">
                                    {filteredPatients.length > 0 ? (
                                        filteredPatients.map(p => (
                                            <div 
                                                key={p.patient_id}
                                                onClick={() => handleSelectPatient(p)}
                                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{p.patient_name}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{p.phone_number}</p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight size={14} className="text-teal-500" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-gray-400">No patients found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Rating Selection */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Experience</label>
                             <div className="grid grid-cols-3 gap-3">
                                 {[
                                     { val: 'Good', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
                                     { val: 'Average', icon: Meh, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
                                     { val: 'Bad', icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' },
                                 ].map((opt) => (
                                     <button
                                         key={opt.val}
                                         type="button"
                                         onClick={() => setFeedbackType(opt.val)}
                                         className={`relative flex flex-col items-center justify-center p-3 h-24 rounded-2xl border-2 transition-all active:scale-95 ${
                                             feedbackType === opt.val 
                                             ? `${opt.bg} ${opt.border} shadow-lg scale-[1.02]` 
                                             : 'bg-gray-50 dark:bg-gray-900/30 border-transparent opacity-60 hover:opacity-100'
                                         }`}
                                     >
                                         <opt.icon size={32} className={`mb-2 ${feedbackType === opt.val ? opt.color : 'text-gray-400'}`} strokeWidth={2} />
                                         <span className={`text-[10px] font-black uppercase ${feedbackType === opt.val ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{opt.val}</span>
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Status Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Treatment Status</label>
                            <div className="relative">
                                <select 
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full appearance-none bg-gray-50 dark:bg-gray-900/50 border-0 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                >
                                    <option value="active">🟢 Ongoing (Active)</option>
                                    <option value="completed">🔵 Treatment Completed</option>
                                    <option value="discontinued">🔴 Discontinued / Stopped</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Comments</label>
                             <textarea 
                                 value={comments}
                                 onChange={e => setComments(e.target.value)}
                                 rows={3}
                                 placeholder="Add details..."
                                 className="w-full bg-gray-50 dark:bg-gray-900/50 border-0 rounded-2xl p-4 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none placeholder:text-gray-400"
                             />
                        </div>

                        <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 rounded-2xl bg-teal-600 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-teal-600/30 hover:shadow-2xl hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {submitting ? <Activity className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            Save Feedback
                        </button>

                    </form>
                </div>

                {/* Recent List */}
                <div>
                     <div className="flex items-center justify-between px-2 mb-3">
                         <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Recent Activity</h3>
                         <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-500">{feedbacks.length} Entries</span>
                     </div>
                     
                     <div className="space-y-3">
                         {feedbacks.length === 0 && !loading && (
                             <div className="text-center py-10 opacity-50">
                                 <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                                 <p className="text-xs font-bold text-gray-400">No feedback yet</p>
                             </div>
                         )}

                         {feedbacks.map(item => (
                             <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                 <div className="flex justify-between items-start">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-300">
                                             {item.patient_name.charAt(0)}
                                         </div>
                                         <div>
                                             <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.patient_name}</h4>
                                             <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                 <Clock size={10} /> 
                                                 {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                             </p>
                                         </div>
                                     </div>
                                     <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                                         item.feedback_type === 'Good' ? 'bg-emerald-100 text-emerald-600' : 
                                         item.feedback_type === 'Bad' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                     }`}>
                                         {item.feedback_type === 'Good' && <Smile size={10} />}
                                         {item.feedback_type === 'Average' && <Meh size={10} />}
                                         {item.feedback_type === 'Bad' && <Frown size={10} />}
                                         {item.feedback_type}
                                     </div>
                                 </div>
                                 
                                 {item.comments && (
                                     <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                         <p className="text-xs text-gray-600 dark:text-gray-300 font-medium italic leading-relaxed">"{item.comments}"</p>
                                     </div>
                                 )}

                                 <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700/50 pt-2">
                                     <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                        item.patient_status_snapshot === 'active' ? 'bg-teal-50 text-teal-600' : 
                                        item.patient_status_snapshot === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500' 
                                     }`}>
                                         {item.patient_status_snapshot}
                                     </span>
                                     <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">By {item.staff_name || 'Staff'}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            </div>
        </div>
    );
};
