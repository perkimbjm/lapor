import { useEffect, useRef } from 'react';

/**
 * Memanggil onRecover() saat tab kembali aktif (visibilitychange)
 * atau jaringan tersambung kembali (window online event).
 *
 * delayMs (default 600): jeda sebelum memanggil onRecover, memberi waktu
 * AuthContext untuk menyelesaikan token refresh terlebih dahulu.
 */
export function useConnectionRecovery(onRecover: () => void | Promise<void>, delayMs = 600) {
  const recoverRef = useRef(onRecover);
  recoverRef.current = onRecover;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleRecover = () => {
      clearTimeout(timer);
      timer = setTimeout(() => recoverRef.current(), delayMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRecover();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', scheduleRecover);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', scheduleRecover);
    };
  }, [delayMs]);
}
