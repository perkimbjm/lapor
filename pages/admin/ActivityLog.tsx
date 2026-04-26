import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from '../../src/supabase';
import { ComplaintStatus } from '../../types';
import { Search, Calendar, Filter, X } from 'lucide-react';

const ActivityLog: React.FC = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const fetchComplaints = async () => {
      const { data, error } = await supabase.from('complaints').select('*');
      if (error) console.error("Error fetching complaints:", error);
      else if (data) setComplaints(data);
    };

    const fetchNotifications = async () => {
      const { data, error } = await supabase.from('notifications').select('*');
      if (error) console.error("Error fetching notifications:", error);
      else if (data) setNotifications(data);
      setLoading(false);
    };

    fetchComplaints();
    fetchNotifications();

    const channel = supabase.channel('activity-log-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchComplaints)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const parseFirestoreDate = (dateField: any): Date | null => {
    if (!dateField) return null;
    return new Date(dateField);
  };

  const formatIndonesianDate = (dateField: any, includeTime = false) => {
    const date = parseFirestoreDate(dateField);
    if (!date) return '-';
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const combinedActivities = useMemo(() => {
    const complaintActivities = complaints.map(c => ({
      id: c.id,
      title: `Aduan Baru: ${c.ticket_number || c.id.substring(0, 8)}`,
      message: `${c.reporter_name} melaporkan kerusakan ${c.category} di ${c.landmark || c.location}`,
      type: c.status === ComplaintStatus.REJECTED ? 'warning' : 'info',
      timestamp: c.date_submitted || c.created_at,
    }));

    const all = [...notifications, ...complaintActivities];
    return all
      .sort((a, b) => {
        const dateA = parseFirestoreDate(a.timestamp);
        const dateB = parseFirestoreDate(b.timestamp);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
  }, [complaints, notifications]);

  const filteredActivities = useMemo(() => {
    return combinedActivities.filter(activity => {
      const matchesSearch = searchKeyword === '' || 
        activity.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        activity.message.toLowerCase().includes(searchKeyword.toLowerCase());
      
      let matchesDate = true;
      if (dateFilter) {
        const activityDate = parseFirestoreDate(activity.timestamp);
        if (activityDate) {
          const filterDate = new Date(dateFilter);
          matchesDate = activityDate.toDateString() === filterDate.toDateString();
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [combinedActivities, searchKeyword, dateFilter]);

  return (
    <AdminLayout title="Log Aktivitas">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Log Aktivitas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Daftar lengkap semua aktivitas dan notifikasi sistem.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col mb-8">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari aktivitas..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
              {searchKeyword && (
                <button 
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="relative w-full sm:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm font-bold">Memuat data...</div>
            ) : filteredActivities.length > 0 ? (
              filteredActivities.map((notif, i) => (
                <div key={i} className="px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      notif.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      notif.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {notif.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                    {notif.message}
                  </p>
                  <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 font-bold">
                    <Calendar size={12} className="mr-1.5" />
                    {formatIndonesianDate(notif.timestamp, true)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Filter className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Tidak ada aktivitas ditemukan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Coba ubah kata kunci pencarian atau filter tanggal.</p>
                {(searchKeyword || dateFilter) && (
                  <button 
                    onClick={() => { setSearchKeyword(''); setDateFilter(''); }}
                    className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Hapus Filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActivityLog;
