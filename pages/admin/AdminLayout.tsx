
import React, { useState, useRef, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useTheme } from '../../components/ThemeContext';
import { 
  Menu, 
  Bell, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../src/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../../src/lib/firestoreErrorHandler';

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
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is admin
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          return;
        }
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        const isEmailAdmin = currentUser.email === 'denip23147@gmail.com';
        const isRoleAdmin = userData?.role === 'admin' || !!userData?.roleId;
        
        if (userData?.isBanned) {
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
          alert('Akun Anda telah diblokir. Silakan hubungi administrator.');
          setLoading(false);
          return;
        }

        setIsAdmin(isEmailAdmin || isRoleAdmin);

        // If it's the first time, create user doc
        if (!userDoc.exists()) {
          try {
            await setDoc(doc(db, 'users', currentUser.uid), {
              displayName: currentUser.displayName,
              email: currentUser.email,
              roleId: isEmailAdmin ? 'admin' : '', // Default admin role for super user
              createdAt: new Date().toISOString()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, 'notifications'), orderBy('time', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 text-center border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Akses Terbatas</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Halaman ini hanya dapat diakses oleh petugas yang berwenang. Silakan login dengan akun admin Anda.
          </p>
          {!user ? (
            <button 
              onClick={handleLogin}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
              Login dengan Google
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium">
                Akun Anda ({user.email}) tidak memiliki hak akses admin.
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl transition-all"
              >
                Logout & Gunakan Akun Lain
              </button>
            </div>
          )}
          <Link to="/" className="inline-block mt-8 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    notifications.filter(n => !n.read).forEach(async (n) => {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `notifications/${n.id}`);
      }
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
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            >
              {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

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
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20 overflow-hidden ring-2 ring-white dark:ring-slate-800">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-800 dark:text-white leading-none truncate max-w-[120px]">{user?.displayName || 'Admin'}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-300 font-medium mt-1 uppercase tracking-widest">{isAdmin ? 'Administrator' : 'Petugas'}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transform origin-top-right animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{user?.email}</p>
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
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="mr-3 w-4 h-4" />
                      Keluar
                    </button>
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
