
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  Truck, 
  BarChart3, 
  Settings,
  LogOut,
  Map,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Users
} from 'lucide-react';
import { useTheme } from './ThemeContext';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Daftar Aduan', path: '/admin/complaints', icon: <ClipboardList size={20} /> },
    { name: 'Peta Sebaran', path: '/admin/map', icon: <Map size={20} /> },
    { name: 'Stok Material', path: '/admin/inventory', icon: <Package size={20} /> },
    { name: 'Armada & Peralatan', path: '/admin/equipment', icon: <Truck size={20} /> },
    { name: 'Tenaga Kerja', path: '/admin/workforce', icon: <Users size={20} /> },
    { name: 'Laporan & Biaya', path: '/admin/reports', icon: <BarChart3 size={20} /> },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
      
      {/* Sidebar Header & Logo */}
      <div className="flex items-center justify-between h-16 flex-shrink-0 bg-blue-600 dark:bg-slate-950 px-4 border-b border-blue-500 dark:border-slate-800 shadow-sm">
        {!isCollapsed && (
          <h1 className="text-sm font-black tracking-widest text-white uppercase animate-in fade-in duration-300">
            UPT PJJ ADMIN
          </h1>
        )}
        {isCollapsed && (
           <div className="mx-auto bg-white/20 p-1.5 rounded-lg text-white">
             <Hammer size={20} />
           </div>
        )}
        <button 
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ml-2"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4 custom-scrollbar">
        <nav className="mt-2 flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.name : ''}
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'} ${isActive(item.path) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="truncate animate-in fade-in duration-300">
                  {item.name}
                </span>
              )}
            </Link>
          ))}
        </nav>
        
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2 mt-auto">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
             {theme === 'light' ? (
               <>
                 <Moon size={20} className={`${isCollapsed ? 'mx-auto' : 'mr-3'} text-slate-500`} />
                 {!isCollapsed && <span className="animate-in fade-in duration-300">Mode Gelap</span>}
               </>
             ) : (
               <>
                 <Sun size={20} className={`${isCollapsed ? 'mx-auto' : 'mr-3'} text-amber-400`} />
                 {!isCollapsed && <span className="animate-in fade-in duration-300">Mode Terang</span>}
               </>
             )}
          </button>

          <Link to="/admin/settings" className="flex items-center px-3 py-3 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
             <Settings size={20} className={`${isCollapsed ? 'mx-auto' : 'mr-3'} text-slate-500 dark:text-slate-300`} />
             {!isCollapsed && <span>Pengaturan</span>}
          </Link>
          <Link to="/" className="flex items-center px-3 py-3 text-sm font-medium rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
             <LogOut size={20} className={`${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
             {!isCollapsed && <span>Keluar</span>}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
