import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Notification, RoadTypeLabel, PriorityLabel, ComplaintStatusLabel } from '../../types';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';
import { formatIndonesianDate } from '../../src/lib/dateUtils';
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, X,
  AlertTriangle, CheckCircle2, Info, Clock, CheckCircle
} from 'lucide-react';

const ITEMS_PER_PAGE = 50;

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

const NotificationsList: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();
  const navigate = useNavigate();
  const { userPhone, roleName, user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
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

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);

        // Role-based filtering
        const isUserRole = roleName?.toLowerCase() === 'user';
        let query = supabase.from('notifications').select('*');

        if (isUserRole && userPhone) {
          query = query.eq('user_phone', userPhone);
        }

        const { data, error } = await query.order('timestamp', { ascending: false });

        if (error) throw error;

        setNotifications(data as Notification[]);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`notifications-list-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, userPhone, roleName]);

  // Apply filters
  useEffect(() => {
    let result = [...notifications];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.ticket_number?.toLowerCase().includes(term) ||
          n.category?.toLowerCase().includes(term) ||
          n.reporter_name?.toLowerCase().includes(term)
      );
    }

    // Read status filter
    if (readFilter === 'unread') {
      result = result.filter((n) => !n.read);
    } else if (readFilter === 'read') {
      result = result.filter((n) => n.read);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((n) => n.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((n) => n.priority === priorityFilter);
    }

    setFilteredNotifications(result);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [notifications, searchTerm, readFilter, categoryFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedNotifications = filteredNotifications.slice(startIdx, endIdx);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAllRef.current?.checked) {
      setSelectedIds(new Set(paginatedNotifications.map((n) => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle individual select
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mark selected as read
  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      setMarking(true);
      const idsArray = Array.from(selectedIds);

      for (const id of idsArray) {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
      }

      setNotifications(
        notifications.map((n) =>
          selectedIds.has(n.id) ? { ...n, read: true } : n
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error marking as read:', err);
      alert('Gagal menandai sebagai dibaca');
    } finally {
      setMarking(false);
    }
  };

  const getPriorityColor = (priority?: string): string => {
    if (!priority) return 'gray';
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'yellow',
      high: 'orange',
      critical: 'red',
    };
    return colors[priority] || 'gray';
  };

  const getUnreadCount = () => notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nomor tiket, kategori, atau nama pelapor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Read Status */}
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">Semua Status</option>
            <option value="unread">Belum Dibaca ({getUnreadCount()})</option>
            <option value="read">Sudah Dibaca</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">Semua Kategori</option>
            <option value="jalan">Jalan</option>
            <option value="jembatan">Jembatan</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">Semua Prioritas</option>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="critical">Darurat</option>
          </select>

          {/* Clear Filters */}
          {(searchTerm || readFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setReadFilter('all');
                setCategoryFilter('all');
                setPriorityFilter('all');
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        {/* Bulk Action */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {selectedIds.size} item dipilih
            </span>
            <button
              onClick={handleMarkSelectedAsRead}
              disabled={marking}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded transition"
            >
              {marking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Tandai dibaca
            </button>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Menampilkan {paginatedNotifications.length > 0 ? startIdx + 1 : 0}-
        {Math.min(endIdx, filteredNotifications.length)} dari {filteredNotifications.length} notifikasi
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {paginatedNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Tidak ada notifikasi</p>
          </div>
        ) : (
          <>
            {/* Header with checkbox */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={selectedIds.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Pilih
              </span>
            </div>

            {paginatedNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${
                  !notif.read
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(notif.id)}
                  onChange={() => toggleSelect(notif.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded cursor-pointer"
                />

                {/* Unread indicator */}
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                )}

                {/* Content */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/admin/notifications/${notif.id}`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-gray-900 dark:text-white ${!notif.read ? 'font-bold' : ''}`}>
                      {notif.ticket_number || 'N/A'}
                    </h3>
                    {notif.category && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {RoadTypeLabel[notif.category as keyof typeof RoadTypeLabel] || notif.category}
                      </span>
                    )}
                    {notif.priority && (
                      <span
                        className={`text-xs px-2 py-0.5 bg-${getPriorityColor(notif.priority)}-100 dark:bg-${getPriorityColor(notif.priority)}-900 text-${getPriorityColor(notif.priority)}-800 dark:text-${getPriorityColor(notif.priority)}-200 rounded`}
                      >
                        {PriorityLabel[notif.priority as keyof typeof PriorityLabel] || notif.priority}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm text-gray-600 dark:text-gray-400 truncate ${!notif.read ? 'font-semibold' : ''}`}>
                    {notif.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getRelativeTime(notif.timestamp)}
                    </span>
                    {notif.reporter_name && (
                      <span>{notif.reporter_name}</span>
                    )}
                  </div>
                </div>

                {/* Status icon */}
                {notif.read ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300"
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
