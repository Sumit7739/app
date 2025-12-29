
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SplashScreen, LoginScreen } from './screens/Auth';
import ChatScreen from './screens/Chat/ChatScreen';
import { DashboardScreen } from './screens/Dashboard';
import { PatientsScreen, PatientProfileScreen } from './screens/Patients';
import { AppointmentsScreen } from './screens/Appointments';
import { ProfileScreen } from './screens/Profile';
import { MenuScreen } from './screens/Menu';
import { InquiryScreen } from './screens/Inquiry';
import { RegistrationScreen, NewRegistrationScreen } from './screens/Registration';
import { AttendanceScreen } from './screens/Attendance';
import { BillingScreen } from './screens/Billing';
import { TestsScreen, CreateTestScreen } from './screens/Tests';
import { ReportsScreen } from './screens/Reports';
import { ExpensesScreen } from './screens/Expenses/ExpensesScreen';
import { SupportScreen } from './screens/Support/SupportScreen';
import { AboutScreen } from './screens/About/AboutScreen';
import { FeedbackScreen } from './screens/Feedback/FeedbackScreen';
import { AppLayout } from './components/Layout';
import { AdminLayout } from './components/Layout/AdminLayout';
import ComingSoon from './components/ComingSoon';
import { AdminDashboard } from './screens/Admin/Dashboard/AdminDashboard';
import AdminFeedbackScreen from './screens/Admin/Feedback/FeedbackScreen';
import IssueManagementScreen from './screens/Admin/Issues/IssueManagementScreen';
import AdminMenuScreen from './screens/Admin/Menu/AdminMenuScreen';
import LedgerScreen from './screens/Admin/Ledger/LedgerScreen';
import AdminExpensesScreen from './screens/Admin/Expenses/ExpensesScreen';
import AdminNotificationsScreen from './screens/Admin/Notifications/AdminNotificationsScreen';
import AdminProfileScreen from './screens/Admin/Profile/AdminProfileScreen';
import StaffScreen from './screens/Admin/Staff/StaffScreen';
import AttendanceApprovalScreen from './screens/Admin/Attendance/AttendanceApprovalScreen';
import BranchManagementScreen from './screens/Admin/Branches/BranchManagementScreen';
import BranchDetailScreen from './screens/Admin/Branches/BranchDetailScreen';
import ReferralManagementScreen from './screens/Admin/Referrals/ReferralManagementScreen';
import AdminPatientDetailScreen from './screens/Admin/Patients/PatientDetailScreen';
import AdminPatientsScreen from './screens/Admin/Patients/PatientsScreen';
import ReceptionSettingsScreen from './screens/Admin/Settings/ReceptionSettingsScreen';
import UpdateModal from './components/UpdateModal';
import { useAuthStore } from './store/useAuthStore';

// App Version
const CURRENT_VERSION = '2.5.0';
const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://prospine.in/admin/mobile/api';

// Helper for Role-based redirection
const RootRedirect = () => {
    const user = useAuthStore((state) => state.user);
    if (user?.role === 'admin' || user?.role === 'superadmin') {
        return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
};

// Helper component to handle dynamic titles
const ComingSoonWrapper = () => {
    const location = useLocation();
    const title = (location.state as any)?.title || 'Feature';
    return <ComingSoon title={title} />;
};

function App() {
  // Check if we've already shown the splash screen in this session
  const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
  const [showSplash, setShowSplash] = useState(!hasSeenSplash);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Update State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    if (showSplash) {
      // Hide splash screen after 3 seconds
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('hasSeenSplash', 'true');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Check for updates
  useEffect(() => {
      const checkUpdate = async () => {
          try {
              const res = await fetch(`${API_URL}/check_update.php`);
              const json = await res.json();
              
              if (json.status === 'success' && json.data) {
                  const latest = json.data.latest_version;
                  if (compareVersions(latest, CURRENT_VERSION) > 0) {
                      setUpdateInfo(json.data);
                      setShowUpdateModal(true);
                  }
              }
          } catch (error) {
              console.error("Update check failed", error);
          }
      };

      checkUpdate();
  }, []);

  const compareVersions = (v1: string, v2: string) => {
      const p1 = v1.split('.').map(Number);
      const p2 = v2.split('.').map(Number);
      for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
          const n1 = p1[i] || 0;
          const n2 = p2[i] || 0;
          if (n1 > n2) return 1;
          if (n1 < n2) return -1;
      }
      return 0;
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginScreen /> : <RootRedirect />} 
        />

        {/* Protected Routes */}
        {/* Admin Routes */}
        <Route element={<AdminLayout />}>
           <Route path="/admin/dashboard" element={<AdminDashboard />} />
           <Route path="/admin/chat" element={<ChatScreen />} />
           <Route path="/admin/chat/:id" element={<ChatScreen />} />
           <Route path="/admin/ledger" element={<LedgerScreen />} />
           <Route path="/admin/expenses" element={<AdminExpensesScreen />} />
           <Route path="/admin/notifications" element={<AdminNotificationsScreen />} />
           <Route path="/admin/profile" element={<AdminProfileScreen />} />
            <Route path="/admin/staff" element={<StaffScreen />} />
            <Route path="/admin/attendance" element={<AttendanceApprovalScreen />} />
            <Route path="/admin/branches" element={<BranchManagementScreen />} />
            <Route path="/admin/branches/:branchId" element={<BranchDetailScreen />} />
            <Route path="/admin/referrals" element={<ReferralManagementScreen />} />
            <Route path="/admin/patients" element={<AdminPatientsScreen />} />
            <Route path="/admin/patients/:id" element={<AdminPatientDetailScreen />} />
            <Route path="/admin/feedback" element={<AdminFeedbackScreen />} />
            <Route path="/admin/issues" element={<IssueManagementScreen />} />
            <Route path="/admin/settings/reception" element={<ReceptionSettingsScreen />} />
            <Route path="/admin/menu" element={<AdminMenuScreen />} />
        </Route>

        {/* Reception/Staff Routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/chat/:id" element={<ChatScreen />} />
          <Route path="/patients" element={<PatientsScreen />} />
          <Route path="/patients/:id" element={<PatientProfileScreen />} />
          <Route path="/appointments" element={<AppointmentsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/menu" element={<MenuScreen />} />
          <Route path="/inquiry" element={<InquiryScreen />} />
          <Route path="/registration" element={<RegistrationScreen />} />
          <Route path="/registration/new" element={<NewRegistrationScreen />} />
          <Route path="/attendance" element={<AttendanceScreen />} />
          <Route path="/billing" element={<BillingScreen />} />
          <Route path="/tests" element={<TestsScreen />} />
          <Route path="/tests/new" element={<CreateTestScreen />} />
          <Route path="/reports" element={<ReportsScreen />} /> 
          <Route path="/expenses" element={<ExpensesScreen />} />
          <Route path="/support" element={<SupportScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/feedback" element={<FeedbackScreen />} />
          <Route path="/menu-placeholder" element={<ComingSoonWrapper />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Update Modal */}
      {showUpdateModal && updateInfo && (
          <UpdateModal 
              version={updateInfo.latest_version}
              notes={updateInfo.release_notes}
              url={updateInfo.download_url}
              forceUpdate={updateInfo.force_update}
              onClose={() => setShowUpdateModal(false)}
          />
      )}
    </BrowserRouter>
  );
}

export default App;
