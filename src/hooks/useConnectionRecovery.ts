import { useEffect, useRef } from 'react';

/**
 * Memanggil onRecover() saat tab kembali aktif (visibilitychange)
 * atau jaringan tersambung kembali (window online event).
 * Menggunakan ref agar callback selalu fresh tanpa re-registrasi event listener.
 */
export function useConnectionRecovery(onRecover: () => void | Promise<void>) {
  const recoverRef = useRef(onRecover);
  recoverRef.current = onRecover;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        recoverRef.current();
      }
    };

    const handleOnline = () => {
      recoverRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}
