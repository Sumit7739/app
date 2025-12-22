import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, BookOpen, Menu } from 'lucide-react';

const AdminBottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe z-50 transition-colors duration-200 block md:hidden">
      <div className="flex justify-around items-center h-16">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`
          }
        >
          <LayoutDashboard size={24} strokeWidth={2} />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        <NavLink
          to="/admin/chat"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`
          }
        >
          <MessageCircle size={24} strokeWidth={2} />
          <span className="text-[10px] font-medium">Chat</span>
        </NavLink>

        <NavLink
          to="/admin/ledger"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`
          }
        >
          <BookOpen size={24} strokeWidth={2} />
          <span className="text-[10px] font-medium">Ledger</span>
        </NavLink>

        <NavLink
          to="/admin/menu"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`
          }
        >
          <Menu size={24} strokeWidth={2} />
          <span className="text-[10px] font-medium">Menu</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
