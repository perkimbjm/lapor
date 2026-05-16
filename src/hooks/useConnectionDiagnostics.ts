import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';

/**
 * Development hook to diagnose connection issues on tab/window focus changes
 * Logs detailed info about auth, realtime channel, and query state
 */
export function useConnectionDiagnostics(label: string = 'useConnectionDiagnostics') {
  const loggingRef = useRef(true);

  useEffect(() => {
    if (!loggingRef.current) return;

    const handleVisibilityChange = () => {
      if (!loggingRef.current) return;

      const isVisible = !document.hidden;
      const timestamp = new Date().toISOString();

      console.group(`[${label}] Visibility Change - ${timestamp}`);
      console.log(`🔍 Tab is now: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);

      if (isVisible) {
        // Log auth state
        (async () => {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log(
              `✅ Auth Session:`,
              session ? `Active (user: ${session.user.email})` : 'No session'
            );
            if (sessionError) console.error(`❌ Session Error:`, sessionError);
          } catch (e) {
            console.error(`❌ Failed to get session:`, e);
          }
        })();

        // Log channel state
        const channels = supabase.getChannels();
        console.log(`📡 Active Channels (${channels.length}):`, 
          channels.map(ch => ({
            name: ch.topic,
            state: ch.state,
          }))
        );

        // Log localStorage cache state
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache-'));
        console.log(`💾 LocalStorage Caches (${cacheKeys.length}):`, cacheKeys);

        console.log(`⏰ Network Status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);
      }

      console.groupEnd();
    };

    const handleOnline = () => {
      console.log(`[${label}] 🟢 Network ONLINE`);
    };

    const handleOffline = () => {
      console.log(`[${label}] 🔴 Network OFFLINE`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [label]);
}
