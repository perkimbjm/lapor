import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { Notification, RoadTypeLabel, ComplaintStatusLabel, PriorityLabel } from '../../types';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';
import { formatIndonesianDate } from '../../src/lib/dateUtils';
import StatusBadge from '../../components/StatusBadge';
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

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

  // Fetch notification detail
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

        // Role-based access check
        const isUserRole = roleName?.toLowerCase() === 'user';
        if (isUserRole && data.user_phone !== userPhone) {
          setError('Anda tidak memiliki akses untuk melihat notifikasi ini');
          return;
        }

        setNotification(data as Notification);
        setError(null);
      } catch (err) {
        console.error('Error fetching notification:', err);
        setError('Gagal memuat notifikasi');
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();

    // Subscribe to real-time updates
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
      console.error('Error marking as read:', err);
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
        <p className="text-red-700 dark:text-red-200">{error || 'Notifikasi tidak ditemukan'}</p>
        <button
          onClick={() => navigate('/admin/notifications')}
          className="mt-4 text-blue-600 hover:text-blue-800 underline"
        >
          Kembali ke daftar notifikasi
        </button>
      </div>
    );
  }

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'gray';
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'yellow',
      high: 'orange',
      critical: 'red',
    };
    return colors[priority] || 'gray';
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return '-';
    return RoadTypeLabel[category as keyof typeof RoadTypeLabel] || category;
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return '-';
    return ComplaintStatusLabel[status as keyof typeof ComplaintStatusLabel] || status;
  };

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return '-';
    return PriorityLabel[priority as keyof typeof PriorityLabel] || priority;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/notifications')}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {notification.ticket_number || 'N/A'}
                </h1>
                {!notification.read && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    Belum dibaca
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {notification.category && (
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                    {getCategoryLabel(notification.category)}
                  </span>
                )}
                {notification.priority && (
                  <span
                    className={`inline-block px-3 py-1 bg-${getPriorityColor(notification.priority)}-100 dark:bg-${getPriorityColor(notification.priority)}-900 text-${getPriorityColor(notification.priority)}-800 dark:text-${getPriorityColor(notification.priority)}-200 text-sm font-medium rounded-full`}
                  >
                    {getPriorityLabel(notification.priority)}
                  </span>
                )}
                {notification.status && (
                  <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm font-medium rounded-full">
                    {getStatusLabel(notification.status)}
                  </span>
                )}
              </div>
            </div>

            {/* Mark as read button */}
            {!notification.read && (
              <button
                onClick={handleMarkAsRead}
                disabled={marking}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Deskripsi Aduan
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {notification.description || '-'}
            </p>
          </div>

          {/* Location */}
          {notification.location && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Lokasi
              </h2>
              <div className="flex items-start gap-2">
                <span className="text-gray-700 dark:text-gray-300">{notification.location}</span>
                {notification.lat && notification.lng && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({notification.lat.toFixed(4)}, {notification.lng.toFixed(4)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reporter Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Nama Pelapor
              </h3>
              <p className="text-gray-900 dark:text-white">{notification.reporter_name || '-'}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informasi Tambahan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Waktu Notifikasi
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {notification.timestamp
                      ? formatIndonesianDate(notification.timestamp, true)
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tipe Notifikasi
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium capitalize">
                    {notification.type || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetail;
