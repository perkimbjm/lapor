import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../src/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
      // Superadmin hardcoded
      if (u.email === 'denip23147@gmail.com') {
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
      const profileRoleName = (profile as any).roles?.name?.toLowerCase() || '';
      const newIsAdmin = profileRoleName.includes('admin') || u.email === 'denip23147@gmail.com';

      let newPermissions: string[] = [];
      if (profile.role_id) {
        const { data: rolePerms, error: rpError } = await supabase
          .from('role_permissions')
          .select('permissions(code)')
          .eq('role_id', profile.role_id);

        if (rpError) {
          console.error('Error fetching role permissions:', rpError);
        } else if (rolePerms) {
          newPermissions = rolePerms
            .map((rp: any) => rp.permissions?.code)
            .filter(Boolean);
        }
      }

      // Set semua nilai sekaligus — React memproses ini dalam satu batch render
      setIsAdmin(newIsAdmin);
      setPermissions(newPermissions);
      setWorkerId((profile as any).worker_id ?? null);
      setUserPhone((profile as any).phone ?? null);
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

    const initAuth = async () => {
      setLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await checkAdminStatus(initialSession.user);
      }

      clearTimeout(loadingTimeout);
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // USER_UPDATED: user menyimpan profil sendiri — role tidak berubah,
        // skip checkAdminStatus agar permissions tidak dikosongkan sesaat.
        if (event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          return;
        }

        // TOKEN_REFRESHED: token diperbarui otomatis — role tidak berubah,
        // tidak perlu re-check admin status (menghindari flicker redirect).
        if (event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          return;
        }

        // SIGNED_IN: login baru — perlu check admin + loading spinner
        if (event === 'SIGNED_IN') {
          setLoading(true);
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Safety: maksimal 8 detik loading per event
        const eventTimeout = setTimeout(() => setLoading(false), 8000);
        try {
          if (currentSession?.user) {
            await checkAdminStatus(currentSession.user);
          } else {
            setIsAdmin(false);
            setPermissions([]);
          }
        } finally {
          clearTimeout(eventTimeout);
          setLoading(false);
        }
      }
    );

    // Visibility handler: pasif — hanya "membangunkan" supabase auth client
    // agar memeriksa token yang mungkin perlu diperbarui.
    // Hasilnya ditangani otomatis via onAuthStateChange (TOKEN_REFRESHED/SIGNED_OUT).
    // Tidak ada signOut manual di sini untuk mencegah logout palsu saat ganti tab.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession(); // fire-and-forget: wake up auth client
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
