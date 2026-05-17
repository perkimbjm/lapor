import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../supabase';
import { useConnectionRecovery } from '../hooks/useConnectionRecovery';

type RefetchFn = () => void | Promise<void>;

interface ConnectionRecoveryContextValue {
  /** Register a silent refetch callback. Returns an unsubscribe function. */
  register: (fn: RefetchFn) => () => void;
  /** Lightweight check: revive only if the realtime socket is dead/stale. */
  recoverIfStale: () => void;
}

const ConnectionRecoveryContext =
  createContext<ConnectionRecoveryContextValue | null>(null);

// Refresh the token proactively only when it is about to expire.
const EXPIRY_SKEW_SEC = 60;
// Max time to wait for the rebuilt socket to reach `open` before releasing
// the re-entrancy guard.
const OPEN_WAIT_MS = 4000;

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

function waitForOpen(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (
        supabase.realtime.connectionState() === 'open' ||
        Date.now() - start > timeoutMs
      ) {
        resolve();
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  });
}

async function recoverRealtime(): Promise<void> {
  const rt = supabase.realtime;

  // A ZOMBIE socket still reports `open` (the browser keeps readyState
  // OPEN on a silently-killed socket) — that IS the bug, so we must NOT
  // trust `open` here and cycle it anyway. Only skip while phoenix is
  // actively `connecting`: tearing that down would produce
  // "WebSocket is closed before the connection is established".
  if (rt.connectionState() === 'connecting') {
    await waitForOpen(OPEN_WAIT_MS);
    return;
  }

  // `disconnect()` is ASYNC: it resolves only after phoenix finishes
  // tearing down the (zombie) socket. `connect()` early-returns while the
  // socket is still `closing`, so we MUST await the teardown before
  // reconnecting. The teardown fires onConnClose → triggerChanError,
  // forcing every channel to `errored` → they auto-rejoin once the new
  // socket opens (no React unmount, no flicker).
  try {
    await rt.disconnect();
  } catch (e) {
    console.error('[ConnectionRecovery] disconnect failed:', e);
  }
  rt.connect();
  // Hold here until the socket is actually open so the caller's guard
  // stays set and concurrent triggers can't close the connecting socket.
  await waitForOpen(OPEN_WAIT_MS);
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
      // 1. Fresh session/token first — REST refetch only needs a valid
      //    token, not the socket.
      await recoverAuth();

      // 2. Refetch immediately so data reappears at once on tab return
      //    (the visible "reconnected" feeling), independent of the WS.
      callbacks.current.forEach((fn) => {
        try {
          void fn();
        } catch (e) {
          console.error('[ConnectionRecovery] refetch failed:', e);
        }
      });

      // 3. Rebuild the realtime socket so live updates resume (only if it
      //    is actually dead — see recoverRealtime guards).
      await recoverRealtime();
    } catch (e) {
      console.error('[ConnectionRecovery] recover failed:', e);
    } finally {
      recoveringRef.current = false;
    }
  }, []);

  const recoverIfStale = useCallback(() => {
    if (recoveringRef.current) return;
    const state = supabase.realtime.connectionState();
    // Only intervene when the socket is genuinely down. While `open` or
    // `connecting`, phoenix's own machinery owns the lifecycle.
    if (state === 'open' || state === 'connecting') return;
    void onRecover();
  }, [onRecover]);

  useConnectionRecovery(onRecover, 800);

  const value = useMemo(
    () => ({ register, recoverIfStale }),
    [register, recoverIfStale],
  );

  return (
    <ConnectionRecoveryContext.Provider value={value}>
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

/** Access the recovery context (used by AdminLayout on route change). */
export function useConnectionRecoveryContext(): ConnectionRecoveryContextValue | null {
  return useContext(ConnectionRecoveryContext);
}
