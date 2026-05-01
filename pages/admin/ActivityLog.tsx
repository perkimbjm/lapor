import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../src/supabase';
import { ComplaintStatus } from '../../types';
import { parseFirestoreDate, formatIndonesianDate } from '../../src/lib/dateUtils';
import { exportToExcel } from '../../src/lib/excel';
import {
  Search, Calendar, Filter, X, Download, Activity, Bell,
  FileText, Users, Clock, ChevronDown, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Shield, Plus, Edit, Trash2, Eye,
  AlertTriangle, CheckCircle, Info, SlidersHorizontal
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnifiedActivity {
  id: string;
  source: 'audit' | 'notification' | 'complaint';
  title: string;
  message: string;
  timestamp: Date | null;
  userEmail?: string;
  action?: string;
  module?: string;
  notifType?: string;
  isRead?: boolean;
  complaintStatus?: string;
  category?: string;
}

interface DateGroup {
  label: string;
  items: UnifiedActivity[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

const mapAuditLog = (log: any): UnifiedActivity => {
  const actionLabels: Record<string, string> = {
    CREATE: 'Membuat',
    UPDATE: 'Memperbarui',
    DELETE: 'Menghapus',
    READ: 'Melihat',
  };
  return {
    id: `audit-${log.id}`,
    source: 'audit',
    title: `${actionLabels[log.action] || log.action} ${log.module || 'data'}`,
    message: log.details || 'Tidak ada detail',
    timestamp: parseFirestoreDate(log.timestamp),
    userEmail: log.user_email,
    action: log.action,
    module: log.module,
  };
};

const mapNotification = (notif: any): UnifiedActivity => ({
  id: `notif-${notif.id}`,
  source: 'notification',
  title: notif.title || 'Notifikasi',
  message: notif.desc || notif.message || '',
  timestamp: parseFirestoreDate(notif.timestamp),
  notifType: notif.type,
  isRead: notif.read,
});

const mapComplaint = (c: any): UnifiedActivity => ({
  id: `complaint-${c.id}`,
  source: 'complaint',
  title: `Aduan: ${c.ticket_number || c.id?.substring(0, 8)}`,
  message: `${c.reporter_name || 'Anonim'} melaporkan kerusakan ${c.category || '-'} di ${c.landmark || c.location || '-'}`,
  timestamp: parseFirestoreDate(c.date_submitted || c.created_at),
  complaintStatus: c.status,
  category: c.category,
  userEmail: c.reporter_name,
});

const formatRelativeTime = (date: Date | null): string => {
  if (!date) return '-';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return formatIndonesianDate(date);
};

const getDateLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Hari Ini';
  if (target.getTime() === yesterday.getTime()) return 'Kemarin';
  return formatIndonesianDate(date);
};

const groupByDate = (activities: UnifiedActivity[]): DateGroup[] => {
  const groups: Map<string, UnifiedActivity[]> = new Map();
  activities.forEach(a => {
    const label = a.timestamp ? getDateLabel(a.timestamp) : 'Tanggal Tidak Diketahui';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(a);
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const ActivityStatCard = ({ title, value, icon, bgColor, iconColor }: {
  title: string; value: number; icon: React.ReactNode; bgColor: string; iconColor: string;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-4 sm:p-5">
    <div className="flex items-center gap-3 sm:gap-4">
      <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">{value}</p>
      </div>
    </div>
  </div>
);

const SkeletonTimeline = () => (
  <div className="divide-y divide-slate-100 dark:divide-slate-700">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="px-4 sm:px-6 py-4 sm:py-5 animate-pulse">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-40 sm:w-52" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-16 sm:w-20" />
            </div>
            <div className="h-3.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg w-full max-w-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ title, subtitle, onClearFilters }: {
  title: string; subtitle: string; onClearFilters?: () => void;
}) => (
  <div className="px-6 py-16 text-center flex flex-col items-center justify-center">
    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
      <Activity className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{subtitle}</p>
    {onClearFilters && (
      <button
        onClick={onClearFilters}
        className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        Hapus Semua Filter
      </button>
    )}
  </div>
);

const TimelineItem = ({ activity, isExpanded, onToggle }: {
  activity: UnifiedActivity; isExpanded: boolean; onToggle: () => void;
}) => {
  // Color mapping by source
  const borderColors: Record<string, string> = {
    audit: 'border-l-blue-500',
    notification: 'border-l-amber-500',
    complaint: 'border-l-indigo-500',
  };
  const avatarBg: Record<string, string> = {
    audit: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    notification: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    complaint: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  };

  // Action badge colors (for audit)
  const actionBadge: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    READ: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };

  // Notification type badge colors
  const notifBadge: Record<string, string> = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const getAvatar = () => {
    if (activity.source === 'audit' && activity.userEmail) {
      return <span className="text-xs sm:text-sm font-black">{activity.userEmail.charAt(0).toUpperCase()}</span>;
    }
    if (activity.source === 'notification') return <Bell size={16} />;
    return <FileText size={16} />;
  };

  const getBadge = () => {
    if (activity.source === 'audit' && activity.action) {
      return (
        <span className={`text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${actionBadge[activity.action] || actionBadge.READ}`}>
          {activity.action}
        </span>
      );
    }
    if (activity.source === 'notification' && activity.notifType) {
      return (
        <span className={`text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${notifBadge[activity.notifType] || notifBadge.info}`}>
          {activity.notifType}
        </span>
      );
    }
    if (activity.source === 'complaint') {
      const isRejected = activity.complaintStatus === ComplaintStatus.REJECTED;
      return (
        <span className={`text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${isRejected ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
          {activity.complaintStatus || 'Aduan'}
        </span>
      );
    }
    return null;
  };

  const getActionIcon = () => {
    if (activity.action === 'CREATE') return <Plus size={12} />;
    if (activity.action === 'UPDATE') return <Edit size={12} />;
    if (activity.action === 'DELETE') return <Trash2 size={12} />;
    if (activity.action === 'READ') return <Eye size={12} />;
    return null;
  };

  return (
    <div
      onClick={onToggle}
      className={`px-4 sm:px-6 py-4 sm:py-5 border-l-4 ${borderColors[activity.source]} hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all cursor-pointer ${isExpanded ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${avatarBg[activity.source]}`}>
          {getAvatar()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-none">{activity.title}</h4>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {getBadge()}
              <span className="hidden sm:inline text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{activity.message}</p>

          {/* Mobile: show relative time below message */}
          <span className="sm:hidden text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 block">
            {formatRelativeTime(activity.timestamp)}
          </span>

          {/* Expanded detail */}
          {isExpanded && (
            <div className="mt-3 p-3 sm:p-4 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl text-xs sm:text-sm space-y-2 border border-slate-200/50 dark:border-slate-700/50 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.userEmail && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium">User:</span>
                    <span className="truncate">{activity.userEmail}</span>
                  </div>
                )}
                {activity.module && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Shield size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium">Modul:</span>
                    <span>{activity.module}</span>
                  </div>
                )}
                {activity.action && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    {getActionIcon()}
                    <span className="font-medium">Aksi:</span>
                    <span className="uppercase font-bold">{activity.action}</span>
                  </div>
                )}
                {activity.timestamp && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium">Waktu:</span>
                    <span>{formatIndonesianDate(activity.timestamp, true)}</span>
                  </div>
                )}
                {activity.complaintStatus && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <FileText size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium">Status:</span>
                    <span className="uppercase font-bold">{activity.complaintStatus}</span>
                  </div>
                )}
                {activity.category && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Activity size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium">Kategori:</span>
                    <span>{activity.category}</span>
                  </div>
                )}
              </div>
              {activity.message && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{activity.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ActivityLog: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (t: string) => void }>();
  useEffect(() => { setPageTitle('Pusat Aktivitas'); }, [setPageTitle]);

  // Data
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  // UI
  const [activeTab, setActiveTab] = useState<'all' | 'audit' | 'notification'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const channelRef = useRef<any>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchAuditLogs = useCallback(async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);
    if (data) setAuditLogs(data);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false });
    if (data) setNotifications(data);
  }, []);

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase
      .from('complaints')
      .select('*')
      .order('date_submitted', { ascending: false });
    if (data) setComplaints(data);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchAuditLogs(), fetchNotifications(), fetchComplaints()]);
      setLoading(false);
    };

    fetchAll();

    if (channelRef.current) return; // StrictMode guard

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefetch = (fn: () => Promise<void>) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fn, 400);
    };

    const channelName = `activity-center-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => debouncedRefetch(fetchAuditLogs))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => debouncedRefetch(fetchNotifications))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => debouncedRefetch(fetchComplaints))
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchAuditLogs, fetchNotifications, fetchComplaints]);

  // ─── Data Pipeline ────────────────────────────────────────────────────────

  const allActivities = useMemo(() => {
    const mapped = [
      ...auditLogs.map(mapAuditLog),
      ...notifications.map(mapNotification),
      ...complaints.map(mapComplaint),
    ];
    return mapped.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [auditLogs, notifications, complaints]);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return allActivities;
    if (activeTab === 'audit') return allActivities.filter(a => a.source === 'audit');
    return allActivities.filter(a => a.source === 'notification');
  }, [allActivities, activeTab]);

  const filteredActivities = useMemo(() => {
    return tabFiltered.filter(activity => {
      // Search
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchesSearch =
          activity.title.toLowerCase().includes(kw) ||
          activity.message.toLowerCase().includes(kw) ||
          (activity.userEmail?.toLowerCase().includes(kw));
        if (!matchesSearch) return false;
      }

      // Date range
      if (dateFrom && activity.timestamp) {
        const from = new Date(dateFrom + 'T00:00:00');
        if (activity.timestamp < from) return false;
      }
      if (dateTo && activity.timestamp) {
        const to = new Date(dateTo + 'T23:59:59');
        if (activity.timestamp > to) return false;
      }

      // Source filter (only applies on "all" tab)
      if (sourceFilter && activity.source !== sourceFilter) return false;

      // Action filter (audit only)
      if (actionFilter && activity.action !== actionFilter) return false;

      // Module filter (audit only)
      if (moduleFilter && activity.module !== moduleFilter) return false;

      return true;
    });
  }, [tabFiltered, searchKeyword, dateFrom, dateTo, sourceFilter, actionFilter, moduleFilter]);

  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredActivities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredActivities, currentPage]);

  const dateGroups = useMemo(() => groupByDate(paginatedActivities), [paginatedActivities]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
    weekStart.setHours(0, 0, 0, 0);

    return {
      today: allActivities.filter(a => a.timestamp?.toDateString() === todayStr).length,
      thisWeek: allActivities.filter(a => a.timestamp && a.timestamp >= weekStart).length,
      activeUsers: new Set(
        auditLogs
          .filter(l => {
            const d = parseFirestoreDate(l.timestamp);
            return d && (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
          })
          .map(l => l.user_email)
          .filter(Boolean)
      ).size,
      unreadNotifs: notifications.filter(n => !n.read).length,
    };
  }, [allActivities, auditLogs, notifications]);

  const uniqueModules = useMemo(() => {
    const modules = new Set(auditLogs.map(l => l.module).filter(Boolean));
    return Array.from(modules).sort();
  }, [auditLogs]);

  // ─── Filter helpers ───────────────────────────────────────────────────────

  const activeFilterCount = [searchKeyword, dateFrom, dateTo, sourceFilter, actionFilter, moduleFilter].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchKeyword('');
    setDateFrom('');
    setDateTo('');
    setSourceFilter('');
    setActionFilter('');
    setModuleFilter('');
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'all' | 'audit' | 'notification') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setActionFilter('');
    setModuleFilter('');
    setSourceFilter('');
  };

  // Show audit-specific filters?
  const showAuditFilters = activeTab === 'audit' || (activeTab === 'all' && sourceFilter === 'audit');

  // ─── Export ───────────────────────────────────────────────────────────────

  const handleExport = () => {
    const exportData = filteredActivities.map(a => ({
      'Waktu': a.timestamp ? formatIndonesianDate(a.timestamp, true) : '-',
      'Sumber': a.source === 'audit' ? 'Audit Log' : a.source === 'notification' ? 'Notifikasi' : 'Aduan',
      'Judul': a.title,
      'Pesan': a.message,
      'User': a.userEmail || '-',
      'Aksi': a.action || '-',
      'Modul': a.module || '-',
    }));
    exportToExcel(exportData, `aktivitas-${new Date().toISOString().slice(0, 10)}`, 'Aktivitas');
  };

  // ─── Pagination helpers ───────────────────────────────────────────────────

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // ─── Tab config ───────────────────────────────────────────────────────────

  const tabs = [
    { key: 'all' as const, label: 'Semua', count: allActivities.length },
    { key: 'audit' as const, label: 'Audit Log', count: auditLogs.length },
    { key: 'notification' as const, label: 'Notifikasi', count: notifications.length },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-6xl mx-auto">

        {/* ── [A] Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Pusat Aktivitas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pantau semua aktivitas sistem secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
              isRealtimeConnected
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              {isRealtimeConnected ? (
                <><Wifi size={13} className="hidden sm:inline" /> <span>Live</span></>
              ) : (
                <><WifiOff size={13} className="hidden sm:inline" /> <span>Offline</span></>
              )}
            </div>
            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={filteredActivities.length === 0}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
          </div>
        </div>

        {/* ── [B] Summary Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 sm:p-5 animate-pulse">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              <ActivityStatCard
                title="Aktivitas Hari Ini"
                value={stats.today}
                icon={<Activity size={20} />}
                bgColor="bg-blue-50 dark:bg-blue-900/30"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <ActivityStatCard
                title="Minggu Ini"
                value={stats.thisWeek}
                icon={<Calendar size={20} />}
                bgColor="bg-indigo-50 dark:bg-indigo-900/30"
                iconColor="text-indigo-600 dark:text-indigo-400"
              />
              <ActivityStatCard
                title="User Aktif (7 Hari)"
                value={stats.activeUsers}
                icon={<Users size={20} />}
                bgColor="bg-emerald-50 dark:bg-emerald-900/30"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <ActivityStatCard
                title="Belum Dibaca"
                value={stats.unreadNotifs}
                icon={<Bell size={20} />}
                bgColor="bg-amber-50 dark:bg-amber-900/30"
                iconColor="text-amber-600 dark:text-amber-400"
              />
            </>
          )}
        </div>

        {/* ── [C] Tab Navigation ─────────────────────────────────────── */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="inline-flex bg-slate-100 dark:bg-slate-900/60 rounded-2xl p-1 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  activeTab === tab.key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── [D] Filter Bar ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-6 overflow-hidden">
          {/* Filter toggle (mobile) + search bar (always visible) */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari aktivitas, user, atau detail..."
                value={searchKeyword}
                onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchKeyword && (
                <button
                  onClick={() => { setSearchKeyword(''); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expandable filter panel */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-col sm:flex-row flex-wrap gap-3">
              {/* Date From */}
              <div className="relative flex-1 min-w-[140px]">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Dari Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="relative flex-1 min-w-[140px]">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Sampai Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Source filter (only on "all" tab) */}
              {activeTab === 'all' && (
                <div className="relative flex-1 min-w-[140px]">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Sumber</label>
                  <div className="relative">
                    <select
                      value={sourceFilter}
                      onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="">Semua Sumber</option>
                      <option value="audit">Audit Log</option>
                      <option value="notification">Notifikasi</option>
                      <option value="complaint">Aduan</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
              )}

              {/* Action filter (audit-related) */}
              {showAuditFilters && (
                <div className="relative flex-1 min-w-[140px]">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Aksi</label>
                  <div className="relative">
                    <select
                      value={actionFilter}
                      onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="">Semua Aksi</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="READ">Read</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
              )}

              {/* Module filter (audit-related) */}
              {showAuditFilters && uniqueModules.length > 0 && (
                <div className="relative flex-1 min-w-[140px]">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Modul</label>
                  <div className="relative">
                    <select
                      value={moduleFilter}
                      onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white appearance-none"
                    >
                      <option value="">Semua Modul</option>
                      {uniqueModules.map(mod => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <div className="flex items-end">
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <X size={14} />
                    Hapus Filter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── [E] Activity Timeline ──────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">

          {/* Results count header */}
          {!loading && filteredActivities.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {filteredActivities.length} aktivitas ditemukan
              </span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400">
                  {activeFilterCount} filter aktif
                </span>
              )}
            </div>
          )}

          {/* Timeline content */}
          {loading ? (
            <SkeletonTimeline />
          ) : dateGroups.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {dateGroups.map((group, gi) => (
                <div key={gi}>
                  {/* Date group header */}
                  <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {group.label}
                      </span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-bold">
                        {group.items.length}
                      </span>
                    </div>
                  </div>
                  {/* Items */}
                  <div className="divide-y divide-slate-100/70 dark:divide-slate-700/50">
                    {group.items.map(activity => (
                      <TimelineItem
                        key={activity.id}
                        activity={activity}
                        isExpanded={expandedId === activity.id}
                        onToggle={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Tidak ada aktivitas ditemukan"
              subtitle="Coba ubah filter atau kata kunci pencarian untuk melihat aktivitas."
              onClearFilters={activeFilterCount > 0 ? clearAllFilters : undefined}
            />
          )}

          {/* ── Pagination ───────────────────────────────────────────── */}
          {!loading && totalPages > 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredActivities.length)} dari {filteredActivities.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {getPageNumbers().map((page, i) =>
                  page === '...' ? (
                    <span key={`dots-${i}`} className="px-2 text-xs text-slate-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ActivityLog;
