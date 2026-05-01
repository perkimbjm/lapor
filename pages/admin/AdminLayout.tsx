// pages/admin/AdminLayout.tsx — Supabase v2 stable realtime (strict fix + StrictMode guard)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useTheme } from '../../components/ThemeContext';
import {
  Menu, Bell, ChevronDown, User, LogOut, Settings,
  CheckCircle2, AlertTriangle, Info, Sun, Moon,
} from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title: initialTitle }) => {
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [pageTitle, setPageTitle] = useState(initialTitle);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false });

    if (data) setNotifications(data);
  }, []);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch + subscribe sekali. Tidak ada refetch saat ganti tab —
    // Supabase Realtime auto-reconnect (lihat reconnectAfterMs di src/supabase.ts)
    // dan akan push perubahan baru via websocket saat reconnect.
    fetchNotifications();

    if (channelRef.current) return; // StrictMode guard

    const channel = supabase
      .channel(`admin-layout-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchNotifications]);

  const handleLogout = async () => {
    await signOut();
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);

    for (const n of unread) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', n.id);
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors font-sans">

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <AdminSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      <div className={`flex-1 flex flex-col ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <header className="sticky top-0 z-30 flex justify-between items-center px-6 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu />
            </button>

            <h1 className="text-xl font-bold hidden sm:block text-slate-900 dark:text-white">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1">

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif(v => !v)}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1 leading-4">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-3 w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl z-50">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Notifikasi</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length ? (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => {
                            navigate(`/admin/notifications/${n.id}`);
                            setShowNotif(false);
                          }}
                          className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                            !n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex gap-2">
                            <span className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400">
                              {n.type === 'warning'
                                ? <AlertTriangle size={14} />
                                : n.type === 'success'
                                ? <CheckCircle2 size={14} />
                                : <Info size={14} />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium text-slate-900 dark:text-white ${!n.read ? 'font-bold' : ''}`}>
                                {n.ticket_number || n.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {n.description || n.desc}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
                        Tidak ada notifikasi
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <Link
                      to="/admin/notifications"
                      onClick={() => setShowNotif(false)}
                      className="block w-full px-4 py-2.5 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700 transition-colors"
                    >
                      Lihat semua notifikasi
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfile(v => !v)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <User size={20} />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {user?.email}
                    </div>
                  </div>

                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setShowProfile(false)}
                  >
                    <Settings size={15} />
                    Pengaturan
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-slate-100 dark:border-slate-700"
                  >
                    <LogOut size={15} />
                    Keluar
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children || <Outlet context={{ setPageTitle }} />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;