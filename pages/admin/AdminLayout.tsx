import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { useTheme } from '../../components/ThemeContext';
import {
  Menu, Bell, User, LogOut, Settings,
  CheckCircle2, AlertTriangle, Info, Sun, Moon,
} from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';

interface AdminLayoutProps {
  title: string;
}

/* =========================
   NOTIFICATION ITEM
========================= */
const NotificationItem = ({ n, onClick }: any) => {
  const Icon =
    n.type === 'warning'
      ? AlertTriangle
      : n.type === 'success'
      ? CheckCircle2
      : Info;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
        !n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="flex gap-2">
        <span className="mt-0.5 text-slate-500 dark:text-slate-400">
          <Icon size={14} />
        </span>

        <div className="flex-1 min-w-0">
          <p className={`text-sm text-slate-900 dark:text-white ${!n.read ? 'font-bold' : ''}`}>
            {n.title || n.ticket_number}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {n.desc || n.description}
          </p>
        </div>
      </div>
    </button>
  );
};

/* =========================
   NOTIFICATION DROPDOWN
========================= */
const NotificationDropdown = ({
  notifications,
  unreadCount,
  show,
  setShow,
  onMarkAll,
  onOpen,
  panelRef,
}: any) => {
  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {show && createPortal(
        <div ref={panelRef} className="fixed inset-x-0 top-20 bottom-0 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:w-96 bg-white dark:bg-slate-800 border sm:rounded-xl shadow-xl z-[9998] flex flex-col">
          <div className="p-3 border-b flex justify-between shrink-0">
            <span className="text-sm font-bold dark:text-white">Notifikasi</span>

            {unreadCount > 0 && (
              <button
                onClick={onMarkAll}
                className="text-xs text-blue-500 hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto sm:max-h-[400px]">
            {notifications.length ? (
              notifications.map((n: any) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onClick={() => onOpen(n.id)}
                />
              ))
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">
                Tidak ada notifikasi
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

/* =========================
   PROFILE DROPDOWN
========================= */
const ProfileDropdown = ({ user, show, setShow, onLogout }: any) => {
  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
      >
        <User size={20} />
      </button>

      {show && (
        <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 border rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-bold text-sm">
              {user?.user_metadata?.full_name ||
                user?.email?.split('@')[0]}
            </div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>

          <Link
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            onClick={() => setShow(false)}
          >
            <Settings size={14} />
            Pengaturan
          </Link>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-t"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
};

/* =========================
   MAIN LAYOUT
========================= */
const AdminLayout: React.FC<AdminLayoutProps> = ({ title }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [pageTitle, setPageTitle] = useState(title);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  /* CLOSE OUTSIDE CLICK */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton = notifRef.current?.contains(target);
      const insidePanel = notifPanelRef.current?.contains(target);
      if (!insideButton && !insidePanel) setShowNotif(false);

      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* FETCH NOTIF */
  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false });

    if (data) setNotifications(data);
  }, []);

  /* REALTIME */
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    if (channelRef.current) return;

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);

    await Promise.all(
      unread.map(n =>
        supabase.from('notifications').update({ read: true }).eq('id', n.id)
      )
    );

    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 w-64 ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      } ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <AdminSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(v => !v)}
        />
      </div>

      {/* MAIN */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>

        {/* HEADER */}
        <header className="flex justify-between items-center h-20 px-6 bg-white dark:bg-slate-900 backdrop-blur border-b border-slate-200 dark:border-slate-700">

          <button onClick={() => setSidebarOpen(v => !v)} className="md:hidden text-slate-700 dark:text-slate-300">
            <Menu />
          </button>

          <h1 className="font-bold text-lg text-slate-900 dark:text-white">{pageTitle}</h1>

          <div className="flex items-center gap-2">

            {/* THEME */}
            <button onClick={toggleTheme} className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* NOTIF */}
            <div ref={notifRef}>
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                show={showNotif}
                setShow={setShowNotif}
                onMarkAll={markAllRead}
                panelRef={notifPanelRef}
                onOpen={(id: string) => {
                  navigate(`/admin/notifications/${id}`);
                  setShowNotif(false);
                }}
              />
            </div>

            {/* PROFILE */}
            <div ref={profileRef}>
              <ProfileDropdown
                user={user}
                show={showProfile}
                setShow={setShowProfile}
                onLogout={handleLogout}
              />
            </div>

          </div>
        </header>

        {/* CONTENT */}
        <main className="p-6">
          <Outlet context={{ setPageTitle }} />
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;