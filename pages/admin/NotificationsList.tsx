import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Notification,
  RoadTypeLabel,
  PriorityLabel,
} from '../../types';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

const ITEMS_PER_PAGE = 50;

/* ===================== UTIL ===================== */

const getRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
};

const safeLabel = <T extends Record<string, string>>(map: T, key?: string) => {
  if (!key) return '-';
  return map[key as keyof T] ?? key;
};

const getPriorityStyle = (priority?: string) => {
  switch (priority) {
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

/* ===================== COMPONENT ===================== */

const NotificationsList: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();
  const navigate = useNavigate();
  const { userPhone, roleName, user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFiltered] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPageTitle('Daftar Notifikasi');
  }, [setPageTitle]);

  /* ===================== FETCH ===================== */

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      setLoading(true);

      const isUser = roleName?.toLowerCase() === 'user';
      let query = supabase.from('notifications').select('*');

      if (isUser && userPhone) {
        query = query.eq('reporter_phone', userPhone);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setNotifications(data as Notification[]);
      }

      setLoading(false);
      setCurrentPage(1);
    };

    fetch();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, userPhone, roleName]);

  /* ===================== FILTER ===================== */

  useEffect(() => {
    let result = [...notifications];

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.ticket_number?.toLowerCase().includes(t) ||
          n.category?.toLowerCase().includes(t) ||
          n.reporter_name?.toLowerCase().includes(t)
      );
    }

    if (readFilter === 'unread') result = result.filter((n) => !n.read);
    if (readFilter === 'read') result = result.filter((n) => n.read);

    if (categoryFilter !== 'all') result = result.filter((n) => n.category === categoryFilter);
    if (priorityFilter !== 'all') result = result.filter((n) => n.priority === priorityFilter);

    setFiltered(result);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [notifications, searchTerm, readFilter, categoryFilter, priorityFilter]);

  /* ===================== PAGINATION ===================== */

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filteredNotifications.slice(start, start + ITEMS_PER_PAGE);

  /* ===================== ACTION ===================== */

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAllRef.current?.checked) {
      setSelectedIds(new Set(paginated.map((n) => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleMarkRead = async () => {
    if (!selectedIds.size) return;

    setMarking(true);

    const ids = Array.from(selectedIds);

    await Promise.all(
      ids.map((id) =>
        supabase.from('notifications').update({ read: true }).eq('id', id)
      )
    );

    setNotifications((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n))
    );

    setSelectedIds(new Set());
    setMarking(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ===================== UI ===================== */

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* FILTER */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 space-y-4">

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            className="w-full pl-10 py-2.5 px-3 border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
            placeholder="Cari notifikasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">

          <select value={readFilter} onChange={(e) => setReadFilter(e.target.value as any)} className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Semua ({unreadCount} belum dibaca)</option>
            <option value="unread">Belum dibaca</option>
            <option value="read">Sudah dibaca</option>
          </select>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Semua Kategori</option>
            <option value="jalan">Jalan</option>
            <option value="jembatan">Jembatan</option>
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Semua Prioritas</option>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="critical">Darurat</option>
          </select>

          {(searchTerm || readFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setReadFilter('all');
                setCategoryFilter('all');
                setPriorityFilter('all');
              }}
              className="border border-slate-200 dark:border-slate-600 rounded-xl flex items-center gap-2 justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">{selectedIds.size} dipilih</span>
            <button
              onClick={handleMarkRead}
              disabled={marking}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              {marking && <Loader2 className="w-4 h-4 animate-spin" />}
              {marking ? 'Loading...' : 'Tandai dibaca'}
            </button>
          </div>
        )}
      </div>

      {/* LIST */}
      <div className="space-y-3">

        {paginated.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Tidak ada data</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Notifikasi belum tersedia saat ini</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <input
                ref={selectAllRef}
                type="checkbox"
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-blue-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Pilih semua di halaman ini</span>
            </div>

            {paginated.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 cursor-pointer transition-all"
                onClick={() => navigate(`/admin/notifications/${n.id}`)}
              >

                <input
                  type="checkbox"
                  checked={selectedIds.has(n.id)}
                  onChange={() => toggleSelect(n.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-blue-500 cursor-pointer"
                />

                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}

                <div className="flex-1">
                  <div className="flex gap-2 items-center flex-wrap">

                    <b className="text-slate-900 dark:text-white">{n.ticket_number}</b>

                    {n.category && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg">
                        {safeLabel(RoadTypeLabel, n.category)}
                      </span>
                    )}

                    {n.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${getPriorityStyle(n.priority)}`}>
                        {safeLabel(PriorityLabel, n.priority)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                    {n.description}
                  </p>

                  <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {getRelativeTime(n.timestamp)}
                    </span>
                  </div>
                </div>

                {n.read ? (
                  <CheckCircle className="text-green-500 dark:text-green-400 w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="text-blue-500 dark:text-blue-400 w-5 h-5 flex-shrink-0" />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>

          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Halaman <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> dari <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Selanjutnya
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};

export default NotificationsList;