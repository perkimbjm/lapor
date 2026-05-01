import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import {
  Notification,
  RoadTypeLabel,
  ComplaintStatusLabel,
  PriorityLabel,
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
        if (isUserRole && data.user_phone !== userPhone) {
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-200">
          {error || 'Notifikasi tidak ditemukan'}
        </p>
        <button
          onClick={() => navigate('/admin/notifications')}
          className="mt-4 text-blue-600 hover:text-blue-800 underline"
        >
          Kembali ke daftar notifikasi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/notifications')}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {notification.ticket_number || 'N/A'}
              </h1>

              <div className="flex flex-wrap gap-2">
                {notification.category && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    {safeLabel(RoadTypeLabel, notification.category)}
                  </span>
                )}

                {notification.priority && (
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${getPriorityStyle(
                      notification.priority
                    )}`}
                  >
                    {safeLabel(PriorityLabel, notification.priority)}
                  </span>
                )}

                {notification.status && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full">
                    {safeLabel(ComplaintStatusLabel, notification.status)}
                  </span>
                )}
              </div>
            </div>

            {!notification.read && (
              <button
                onClick={handleMarkAsRead}
                disabled={marking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Deskripsi</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {notification.description || '-'}
            </p>
          </div>

          {notification.location && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Lokasi</h2>
              <p className="text-gray-700 dark:text-gray-300">
                {notification.location}
              </p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-2">Pelapor</h2>
            <p className="text-gray-900 dark:text-white">
              {notification.reporter_name || '-'}
            </p>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Waktu</p>
                <p className="text-gray-900 dark:text-white">
                  {notification.timestamp
                    ? formatIndonesianDate(notification.timestamp, true)
                    : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Tipe</p>
                <p className="text-gray-900 dark:text-white capitalize">
                  {notification.type || '-'}
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