
import React, { useState, useRef, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { 
  Menu, 
  Bell, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../src/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('time', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    notifications.filter(n => !n.read).forEach(async (n) => {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <AdminSidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        />
      </div>

      {/* Main Content Wrapper - Dynamic padding based on collapse state */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        
        {/* --- TOP HEADER BAR --- */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotif(!showNotif)}
                className="relative p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800">
                        Tandai dibaca semua
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {notifications.map((notif) => (
                          <div key={notif.id} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <div className="flex gap-3">
                              <div className={`flex-shrink-0 mt-1 h-8 w-8 rounded-full flex items-center justify-center ${
                                notif.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                                notif.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                                'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                              }`}>
                                {notif.type === 'warning' ? <AlertTriangle size={14} /> : 
                                 notif.type === 'success' ? <CheckCircle2 size={14} /> : 
                                 <Info size={14} />}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 line-clamp-2">
                                  {notif.desc}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-300 mt-1.5 font-medium">
                                  {notif.time}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="flex-shrink-0 mt-2">
                                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl text-center">
                    <Link to="/admin/settings" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors">
                      Lihat semua aktivitas
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <img 
                  src="https://ui-avatars.com/api/?name=Admin+PUPR&background=0D8ABC&color=fff" 
                  alt="Admin" 
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
                />
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-800 dark:text-white leading-none">Admin UPT</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium mt-1">Kepala Bagian</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Admin UPT</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 truncate">admin.pupr@banjarmasinkota.go.id</p>
                  </div>
                  
                  <div className="py-1">
                    <Link to="/admin/settings" className="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <User className="mr-3 w-4 h-4 text-slate-400" />
                      Profil Saya
                    </Link>
                    <Link to="/admin/settings" className="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <Settings className="mr-3 w-4 h-4 text-slate-400" />
                      Pengaturan Akun
                    </Link>
                  </div>
                  
                  <div className="py-1 border-t border-slate-100 dark:border-slate-700">
                    <Link to="/" className="flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <LogOut className="mr-3 w-4 h-4" />
                      Keluar
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 animate-in fade-in duration-500">
             {/* Mobile-only Title (since it's hidden in header on small screens) */}
             <h1 className="sm:hidden text-2xl font-bold text-slate-900 dark:text-white mb-6">{title}</h1>
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
