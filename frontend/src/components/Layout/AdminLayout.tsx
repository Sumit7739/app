import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../hooks';
import AdminBottomNav from './AdminBottomNav';

export const AdminLayout = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  useTheme(); // Initialize theme

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict Role Check
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex-1 overflow-y-auto relative w-full h-full pb-24 md:pb-0">
        <Outlet />
      </div>
      {!location.pathname.startsWith('/admin/chat/') && <AdminBottomNav />}
    </div>
  );
};

export default AdminLayout;
