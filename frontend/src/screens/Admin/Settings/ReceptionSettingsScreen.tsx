import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    Settings, Plus, Edit2, Trash2, Power, 
    Stethoscope, MessageCircle, Megaphone, Briefcase, CheckCircle, XCircle 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

interface ConfigItem {
    id: number; // Generic ID mapping
    name: string;
    code: string;
    is_active: number;
    display_order: number;
    [key: string]: any; // For dynamic keys
}

const ReceptionSettingsScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'complaints' | 'sources' | 'consultations' | 'services'>('complaints');
    
    // Data Store
    const [data, setData] = useState<{
        complaints: ConfigItem[],
        sources: ConfigItem[],
        consultations: ConfigItem[],
        services: ConfigItem[]
    }>({
        complaints: [],
        sources: [],
        consultations: [],
        services: []
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', is_active: 1, display_order: 0 });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if(user) fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const empId = (user as any).employee_id || user?.id;
            const res = await fetch(`${API_URL}/admin/reception_settings.php?action=fetch_metadata&user_id=${empId}`);
            const json = await res.json();
            if (json.status === 'success') {
                // Normalize data to generic structure
                const normalized = {
                    complaints: json.data.complaints.map((i: any) => ({ ...i, id: i.complaint_id, name: i.complaint_name, code: i.complaint_code })),
                    sources: json.data.sources.map((i: any) => ({ ...i, id: i.source_id, name: i.source_name, code: i.source_code })),
                    consultations: json.data.consultations.map((i: any) => ({ ...i, id: i.consultation_id, name: i.consultation_name, code: i.consultation_code })),
                    services: json.data.services.map((i: any) => ({ ...i, id: i.service_id, name: i.service_name, code: i.service_code }))
                };
                setData(normalized);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const empId = (user as any).employee_id || user?.id;
            const res = await fetch(`${API_URL}/admin/reception_settings.php?action=save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    user_id: empId,
                    category: activeTab,
                    id: editingItem ? editingItem.id : null,
                    ...formData
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setIsModalOpen(false);
                fetchData();
            } else {
                alert(json.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (item: ConfigItem) => {
        const newStatus = item.is_active === 1 ? 0 : 1;
        // Optimistic update
        const newData = { ...data };
        const idx = newData[activeTab].findIndex(i => i.id === item.id);
        if (idx !== -1) newData[activeTab][idx].is_active = newStatus;
        setData(newData);

        try {
            await fetch(`${API_URL}/admin/reception_settings.php?action=toggle_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeTab, id: item.id, status: newStatus })
            });
        } catch (e) {
            fetchData(); // Revert on error
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/admin/reception_settings.php?action=delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: activeTab, id: id })
            });
            const json = await res.json();
            if (json.status === 'success') fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const openModal = (item: ConfigItem | null = null) => {
        setEditingItem(item);
        if (item) {
            setFormData({ name: item.name, code: item.code, is_active: item.is_active, display_order: item.display_order });
        } else {
            setFormData({ name: '', code: '', is_active: 1, display_order: 0 });
        }
        setIsModalOpen(true);
    };

    // Tab items config
    const tabs = [
        { id: 'complaints', label: 'Complaints', singular: 'Complaint', icon: <Stethoscope size={16} />, color: 'text-blue-500' },
        { id: 'sources', label: 'Sources', singular: 'Source', icon: <Megaphone size={16} />, color: 'text-purple-500' },
        { id: 'consultations', label: 'Consultations', singular: 'Consultation', icon: <Briefcase size={16} />, color: 'text-emerald-500' },
        { id: 'services', label: 'Services', singular: 'Service', icon: <MessageCircle size={16} />, color: 'text-orange-500' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-200">
            {/* Header */}
            <header className="px-6 py-4 pt-11 sticky top-0 z-30 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Configuration</p>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Settings size={20} className="text-gray-400" />
                            Reception Settings
                        </h1>
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm text-gray-900 dark:text-white' 
                                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            <span className={activeTab === tab.id ? tab.color : ''}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 pb-24 overflow-y-auto">
                <div className="space-y-3">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : data[activeTab].length === 0 ? (
                        <div className="py-20 text-center text-gray-400">
                            <p className="text-sm font-bold">No items found</p>
                            <p className="text-xs mt-1">Add a new item to get started</p>
                        </div>
                    ) : (
                        data[activeTab].map((item) => (
                            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-xs font-black text-gray-300">
                                    #{item.display_order}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>
                                    <code className="text-[10px] text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded uppercase">{item.code}</code>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleToggleStatus(item)}
                                        className={`p-2 rounded-lg transition-colors ${item.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <Power size={16} />
                                    </button>
                                    <button 
                                        onClick={() => openModal(item)}
                                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 ${currentTab?.color}`}>{currentTab?.label}</span>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white mt-2">
                                    {editingItem ? `Edit ${currentTab?.singular}` : `New ${currentTab?.singular}`}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Display Name</label>
                                <input 
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Neck Pain"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">System Code</label>
                                <input 
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. neck_pain"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Order</label>
                                    <input 
                                        type="number"
                                        value={formData.display_order}
                                        onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                                        className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex items-end pb-3">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, is_active: formData.is_active ? 0 : 1})}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                            formData.is_active 
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                            : 'bg-gray-50 border-gray-100 text-gray-400'
                                        }`}
                                    >
                                        <CheckCircle size={14} />
                                        {formData.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            </div>

                            <button 
                                disabled={submitting}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all mt-4"
                            >
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceptionSettingsScreen;
