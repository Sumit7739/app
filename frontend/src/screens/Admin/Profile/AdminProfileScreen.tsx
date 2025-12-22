import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
    User, 
    MapPin, 
    Calendar, 
    Mail, 
    Shield, 
    Building, 
    Key, 
    Edit2,
    CheckCircle,
    Moon,
    Sun
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';
const ADMIN_URL = 'https://prospine.in/admin';

interface ProfileData {
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title: string;
  phone_number: string;
  address: string;
  date_of_birth: string;
  date_of_joining: string;
  email: string;
  role: string;
  is_active: number;
  photo_path: string;
  branch_name: string;
  city: string;
  address_line_1: string;
}

interface Branch {
    branch_id: number;
    branch_name: string;
}

const AdminProfileScreen: React.FC = () => {
    const { user } = useAuthStore();
    const { theme, toggleTheme } = useTheme();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const empId = (user as any).employee_id || user.id;

            // 1. Fetch Profile
            const profileRes = await fetch(`${API_URL}/profile.php?employee_id=${empId}`);
            const profileJson = await profileRes.json();
            if (profileJson.status === 'success') {
                setProfile(profileJson.data);
            }

            // 2. Fetch Branches (if admin/superadmin)
            // 2. Fetch Branches (if admin/superadmin)
            const branchRes = await fetch(`${API_URL}/admin/my_branches.php?employee_id=${empId}`);
            const branchJson = await branchRes.json();
            if (branchJson.status === 'success') {
                setBranches(branchJson.data);
            }



        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors overflow-y-auto pb-10">
            {/* Header */}
            <div className="px-6 py-5 flex justify-between items-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
                <div>
                   <h1 className="text-2xl font-black text-gray-900 dark:text-white">Profile Settings</h1>
                   <p className="text-xs text-gray-500 dark:text-gray-400">Manage your personal information</p>
                </div>
            </div>

            <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
                
                {/* 1. Main Profile Banner Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative group shrink-0">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-600">
                             <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-900">
                                {profile.photo_path ? (
                                    <img src={`${ADMIN_URL}/${profile.photo_path}`} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-gray-300 dark:text-gray-600">{profile.full_name?.charAt(0)}</span>
                                )}
                             </div>
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg border border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-indigo-600">
                            <Edit2 size={14} />
                        </button>
                    </div>

                    <div className="text-center md:text-left flex-1 min-w-0 z-10">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                            {profile.role}
                        </span>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{profile.full_name}</h2>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Mail size={14} /> {profile.email}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin size={14} /> {profile.city || 'Unknown Location'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Personal Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                                    <User size={18} />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Personal Info</h3>
                            </div>
                            
                            <div className="space-y-5">
                                <InfoField label="Employee ID" value={profile.employee_id} />
                                <InfoField label="Phone" value={profile.phone_number} />
                                <InfoField label="Address" value={profile.address} />
                                <InfoField label="Joined Date" value={profile.date_of_joining} icon={<Calendar size={14} />} />
                            </div>
                        </div>

                        {/* Security */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                                    <Shield size={18} />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Security</h3>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-gray-500">Account Status</span>
                                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                    <CheckCircle size={10} /> Active
                                </span>
                            </div>

                            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group">
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">Change Password</h4>
                                    <p className="text-[10px] text-gray-400">Update your login credentials</p>
                                </div>
                                <Key size={16} className="text-gray-400 group-hover:text-indigo-600" />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Managed Branches */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-lg">
                                    <Building size={18} />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Managed Branches</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {branches.length > 0 ? branches.map(branch => (
                                    <div key={branch.branch_id} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col justify-between h-32 hover:border-teal-200 transition-colors cursor-default">
                                        <div className="flex justify-between items-start">
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-teal-600">
                                                <Building size={20} />
                                            </div>
                                            <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                                                ID: {branch.branch_id}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">{branch.branch_name}</h4>
                                            <p className="text-xs text-gray-500">Active Center</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center py-8 text-gray-400 text-sm">No branches assigned</div>
                                )}
                            </div>
                        </div>

                        {/* App Settings / Theme */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                                    {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">App Appearance</h3>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Dark Mode</h4>
                                    <p className="text-[10px] text-gray-500 font-medium italic">Reduce eye strain in low light</p>
                                </div>
                                <button 
                                    onClick={toggleTheme}
                                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoField = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
    <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">{label}</label>
        <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {icon && <span className="text-gray-400">{icon}</span>}
            {value || 'N/A'}
        </div>
    </div>
);

export default AdminProfileScreen;
