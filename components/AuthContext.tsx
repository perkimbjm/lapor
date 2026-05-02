import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../src/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SUPERADMIN_EMAIL } from '../constants';

/** Shape returned by `users.select('*, roles(name)')` — Supabase joins inflate the FK
 *  column to a nested object (or array, for many-to-many). */
interface UserProfileWithRole {
  id: string;
  email: string;
  username?: string;
  phone?: string | null;
  display_name?: string | null;
  role_id?: string | null;
  worker_id?: string | null;
  is_banned?: boolean;
  created_at?: string;
  roles?: { name?: string } | { name?: string }[] | null;
}

/** Shape returned by `role_permissions.select('permissions(code)')` */
interface RolePermissionWithCode {
  permissions?: { code?: string } | { code?: string }[] | null;
}

/** Resolve a possibly-array Supabase joined relation to a single record */
const firstRel = <R,>(rel: R | R[] | null | undefined): R | undefined =>
  Array.isArray(rel) ? rel[0] : (rel ?? undefined);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  permissions: string[];
  workerId: string | null;
  userPhone: string | null;
  roleName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAdminStatus = async (u: User) => {
    try {
      // Superadmin check (configurable via VITE_SUPERADMIN_EMAIL env var)
      if (u.email === SUPERADMIN_EMAIL) {
        setIsAdmin(true);
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('role_id, is_banned, worker_id, phone, roles(name)')
        .eq('id', u.id)
        .maybeSingle();

      if (error) console.error('Error fetching profile:', error);

      if (profile?.is_banned) {
        toast.error('Akun Anda telah diblokir.');
        await supabase.auth.signOut();
        return;
      }

      // Buat profil baru jika belum ada
      if (!profile) {
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id')
          .ilike('name', 'user');

        let defaultRoleId = rolesData?.[0]?.id;
        if (!defaultRoleId) {
          const { data: allRoles } = await supabase.from('roles').select('id').limit(1);
          defaultRoleId = allRoles?.[0]?.id;
        }

        const generatedUsername = u.email
          ? u.email.split('@')[0]
          : `user_${Math.floor(Math.random() * 10000)}`;

        const { error: upsertError } = await supabase.from('users').upsert({
          id: u.id,
          email: u.email ?? '',
          display_name: u.user_metadata?.full_name ?? '',
          username: generatedUsername,
          role_id: defaultRoleId,
          created_at: new Date().toISOString(),
          is_banned: false,
        });

        if (upsertError) {
          console.error('CRITICAL: Failed to create user profile:', upsertError);
          toast.error('Gagal sinkronisasi profil.');
        }

        // Pengguna baru tidak pernah admin secara default
        setIsAdmin(false);
        setPermissions([]);
        setWorkerId(null);
        setUserPhone(null);
        setRoleName('user');
        return;
      }

      // Hitung semua nilai TERLEBIH DAHULU sebelum set state
      // agar tidak ada jeda di mana permissions kosong sementara isAdmin sudah false
      // yang menyebabkan ProtectedRoute redirect.
      const profileTyped = profile as UserProfileWithRole;
      const profileRoleName = firstRel(profileTyped.roles)?.name?.toLowerCase() || '';
      const newIsAdmin = profileRoleName.includes('admin') || u.email === SUPERADMIN_EMAIL;

      let newPermissions: string[] = [];
      if (profileTyped.role_id) {
        const { data: rolePerms, error: rpError } = await supabase
          .from('role_permissions')
          .select('permissions(code)')
          .eq('role_id', profileTyped.role_id);

        if (rpError) {
          console.error('Error fetching role permissions:', rpError);
        } else if (rolePerms) {
          newPermissions = (rolePerms as RolePermissionWithCode[])
            .map((rp) => firstRel(rp.permissions)?.code)
            .filter((code): code is string => Boolean(code));
        }
      }

      // Set semua nilai sekaligus — React memproses ini dalam satu batch render
      setIsAdmin(newIsAdmin);
      setPermissions(newPermissions);
      setWorkerId(profileTyped.worker_id ?? null);
      setUserPhone(profileTyped.phone ?? null);
      setRoleName(profileRoleName);
    } catch (err) {
      console.error('Admin check failed:', err);
      setIsAdmin(false);
      // Tidak reset permissions agar tidak memicu redirect sementara
    }
  };

  useEffect(() => {
    // Safety timeout: paksa berhenti loading setelah 10 detik
    const loadingTimeout = setTimeout(() => setLoading(false), 10000);

    // Hanya pakai onAuthStateChange — INITIAL_SESSION event akan otomatis
    // fire saat mount dengan session dari localStorage. TIDAK panggil
    // initAuth() terpisah karena akan double-execute checkAdminStatus.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // === KUNCI: cegah re-render saat token refresh ===
        // TOKEN_REFRESHED memberikan objek user BARU (reference berbeda) tapi
        // user ID tetap sama. Update setUser dengan reference baru memicu
        // semua useEffect dengan dep [user] di komponen anak untuk re-run
        // → cleanup channel → fetch ulang → terlihat seperti "refresh".
        // Solusi: hanya update setUser jika user ID berbeda dari sebelumnya.
        const newUserId = currentSession?.user?.id ?? null;

        // Update session selalu (token data baru)
        setSession(currentSession);

        // Update user HANYA jika ID berubah, untuk menjaga reference stability
        setUser((prev) => {
          const prevUserId = prev?.id ?? null;
          if (prevUserId === newUserId) return prev; // jangan ubah reference
          return currentSession?.user ?? null;
        });

        // SIGNED_OUT: bersihkan semua state
        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          setIsAdmin(false);
          setPermissions([]);
          setWorkerId(null);
          setUserPhone(null);
          setRoleName(null);
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }

        // TOKEN_REFRESHED & USER_UPDATED: silent — tidak panggil checkAdminStatus
        // (role/permissions tidak berubah saat token refresh atau profile update)
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }

        // INITIAL_SESSION (mount) atau SIGNED_IN (login baru): full check
        const eventTimeout = setTimeout(() => setLoading(false), 8000);
        try {
          await checkAdminStatus(currentSession.user);
        } finally {
          clearTimeout(eventTimeout);
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Bulletproof signOut: meskipun supabase.auth.signOut() hang (auth lock
    // tersangkut setelah throttle), localStorage tetap dibersihkan dan
    // user tetap dipaksa redirect ke landing page.
    setLoading(true);

    // Bersihkan storage SEKARANG sebelum await apapun, agar refresh halaman
    // tidak akan auto-login dengan token rusak.
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (e) {
      console.error('Storage clear failed:', e);
    }

    // Coba signOut ke server dengan timeout 3 detik — kalau hang, abaikan
    Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]).catch((err) => console.error('Logout error (ignored):', err));

    toast.success('Berhasil keluar sistem.');
    // Hard redirect — paling reliable untuk reset semua state
    window.location.href = '/';
  };

  const refreshProfile = async () => {
    if (user) await checkAdminStatus(user);
  };

  const hasPermission = (code: string) => {
    if (isAdmin) return true;
    return permissions.includes(code);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, permissions, workerId, userPhone, roleName, loading, signOut, refreshProfile, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
