import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Download } from 'lucide-react';

/**
 * PWAUpdatePrompt
 * Ditampilkan otomatis ketika service worker baru tersedia (versi baru app).
 * Pengguna bisa klik "Perbarui" untuk reload ke versi terbaru.
 */
const PWAUpdatePrompt: React.FC = () => {
  const [show, setShow] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Cek update secara periodik setiap 1 jam
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) setShow(true);
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-2xl shadow-xl p-4 flex items-start gap-3">
        {/* Ikon */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Teks */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            Pembaruan Tersedia
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            Versi baru Bepadah siap digunakan. Perbarui sekarang agar mendapatkan fitur terbaru.
          </p>
          <button
            onClick={handleUpdate}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Perbarui Sekarang
          </button>
        </div>

        {/* Tutup */}
        <button
          onClick={() => setShow(false)}
          aria-label="Tutup notifikasi pembaruan"
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
