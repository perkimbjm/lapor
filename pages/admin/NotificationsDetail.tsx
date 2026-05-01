import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import {
  Notification,
  RoadTypeLabel,
  ComplaintStatus,
} from '../../types';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';
import { formatIndonesianDate } from '../../src/lib/dateUtils';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

const NotificationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();
  const { userPhone, roleName } = useAuth();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    setPageTitle('Detail Notifikasi');
  }, [setPageTitle]);

  const safeLabel = <T extends Record<string, string>>(
    map: T,
    key?: string
  ) => {
    if (!key) return '-';
    return map[key as keyof T] ?? key;
  };

  

  useEffect(() => {
    if (!id) return;

    const fetchNotification = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        const isUserRole = roleName?.toLowerCase() === 'user';
        if (isUserRole && data.reporter_phone !== userPhone) {
          setError('Anda tidak memiliki akses untuk melihat notifikasi ini');
          return;
        }

        setNotification(data as Notification);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat notifikasi');
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();

    const channel = supabase
      .channel(`notification-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userPhone, roleName]);

  const handleMarkAsRead = async () => {
    if (!notification || notification.read) return;

    try {
      setMarking(true);

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      if (error) throw error;

      setNotification({ ...notification, read: true });
    } catch (err) {
      console.error(err);
      alert('Gagal menandai sebagai dibaca');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-slate-900 dark:text-white font-medium">
              {error || 'Notifikasi tidak ditemukan'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Mungkin notifikasi telah dihapus atau Anda tidak memiliki akses
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/notifications')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
          >
            Kembali ke daftar notifikasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/notifications')}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Kembali</span>
        </button>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-800 p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
            <div className="space-y-3 flex-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {notification.title || 'N/A'}
              </h1>

              <div className="flex flex-wrap gap-2">
                {notification.category && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-lg font-medium">
                    {safeLabel(RoadTypeLabel, notification.category)}
                  </span>
                )}

                {notification.status && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded-lg font-medium">
                    {safeLabel(ComplaintStatus, notification.status)}
                  </span>
                )}
              </div>
            </div>

            {!notification.read && (
              <button
                onClick={handleMarkAsRead}
                disabled={marking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition flex-shrink-0"
              >
                {marking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Tandai dibaca
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Deskripsi</h2>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {notification.description || '-'}
            </p>
          </div>

          {notification.location && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Lokasi</h2>
              <p className="text-slate-700 dark:text-slate-300">
                {notification.location}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Pelapor</h2>
            <p className="text-slate-900 dark:text-white">
              {notification.reporter_name || '-'} {notification.reporter_phone|| '-'}
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Waktu</p>
                <p className="text-slate-900 dark:text-white">
                  {notification.timestamp
                    ? formatIndonesianDate(notification.timestamp, true)
                    : '-'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetail;