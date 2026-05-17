import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { supabase } from '../supabase';
import { useConnectionRecovery } from '../hooks/useConnectionRecovery';

type RefetchFn = () => void | Promise<void>;

interface ConnectionRecoveryContextValue {
  /** Register a silent refetch callback. Returns an unsubscribe function. */
  register: (fn: RefetchFn) => () => void;
  /** Lightweight check: revive only if the realtime socket is not connected. */
  recoverIfStale: () => void;
}

const ConnectionRecoveryContext =
  createContext<ConnectionRecoveryContextValue | null>(null);

// Refresh the token proactively only when it is about to expire.
const EXPIRY_SKEW_SEC = 60;
// Give the rebuilt socket a moment to rejoin channels before silent refetch.
const REFETCH_DELAY_MS = 400;

async function recoverAuth(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  let token = session.access_token;
  const nowSec = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - nowSec < EXPIRY_SKEW_SEC) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) token = data.session.access_token;
  }

  // Push the fresh JWT into every channel's join payload BEFORE the socket
  // is cycled, so phoenix rejoins authenticated.
  await supabase.realtime.setAuth(token);
}

function recoverRealtime(): void {
  const rt = supabase.realtime;
  // connect() is a no-op while isConnected() is true (even on a zombie
  // socket). Force the dead transport down first, then reconnect on the
  // next tick — channels stay in rt.channels and auto-rejoin (no flicker).
  rt.disconnect();
  setTimeout(() => rt.connect(), 0);
}

export const ConnectionRecoveryProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const callbacks = useRef(new Set<RefetchFn>());
  const recoveringRef = useRef(false);

  const register = useCallback((fn: RefetchFn) => {
    callbacks.current.add(fn);
    return () => {
      callbacks.current.delete(fn);
    };
  }, []);

  const onRecover = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    if (recoveringRef.current) return;
    recoveringRef.current = true;
    try {
      await recoverAuth();
      recoverRealtime();
      setTimeout(() => {
        callbacks.current.forEach((fn) => {
          try {
            void fn();
          } catch (e) {
            console.error('[ConnectionRecovery] refetch failed:', e);
          }
        });
      }, REFETCH_DELAY_MS);
    } catch (e) {
      console.error('[ConnectionRecovery] recover failed:', e);
    } finally {
      // Release the guard after the refetch wave is scheduled.
      setTimeout(() => {
        recoveringRef.current = false;
      }, REFETCH_DELAY_MS + 200);
    }
  }, []);

  const recoverIfStale = useCallback(() => {
    if (!supabase.realtime.isConnected()) {
      void onRecover();
    }
  }, [onRecover]);

  useConnectionRecovery(onRecover, 800);

  return (
    <ConnectionRecoveryContext.Provider value={{ register, recoverIfStale }}>
      {children}
    </ConnectionRecoveryContext.Provider>
  );
};

/** Register a silent refetch that runs whenever the connection recovers. */
export function useRegisterRecoveryRefetch(fn: RefetchFn): void {
  const ctx = useContext(ConnectionRecoveryContext);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!ctx) return;
    return ctx.register(() => fnRef.current());
  }, [ctx]);
}

/** Access recoverIfStale (used by AdminLayout on route change). */
export function useConnectionRecoveryContext(): ConnectionRecoveryContextValue | null {
  return useContext(ConnectionRecoveryContext);
}
