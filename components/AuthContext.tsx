import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../src/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  permissions: string[];
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
  const [loading, setLoading] = useState<boolean>(true);

  const checkAdminStatus = async (u: User) => {
    try {
      // Reset permissions
      setPermissions([]);

      // 1. Superadmin check (Hardcoded or Env based)
      if (u.email === 'denip23147@gmail.com') {
        setIsAdmin(true);
        return;
      }

      // 2. Database profile check with Role Name join
      const { data: profile, error } = await supabase
        .from('users')
        .select('role_id, is_banned, roles(name)')
        .eq('id', u.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      if (profile?.is_banned) {
        toast.error('Akun Anda telah diblokir.');
        await supabase.auth.signOut();
        return;
      }

      // Upsert profile if not exists
      if (!profile) {
        // Fetch default role ID dynamically ('user')
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id')
          .ilike('name', 'user');

        let defaultRoleId = rolesData?.[0]?.id;
        
        if (!defaultRoleId) {
          const { data: allRoles } = await supabase.from('roles').select('id').limit(1);
          defaultRoleId = allRoles?.[0]?.id;
        }

        const generatedUsername = u.email ? u.email.split('@')[0] : `user_${Math.floor(Math.random() * 10000)}`;
        
        const { error: upsertError } = await supabase.from('users').upsert({
          id: u.id,
          email: u.email ?? '',
          display_name: u.user_metadata?.full_name ?? '',
          username: generatedUsername,
          role_id: defaultRoleId,
          created_at: new Date().toISOString(),
          is_banned: false
        });
        
        if (upsertError) {
          console.error('CRITICAL: Failed to create user profile:', upsertError);
          toast.error('Gagal sinkronisasi profil.');
        } 
        
        // NEW USERS are NEVER admins by default
        setIsAdmin(false);
      } else {
        // Check if role name contains 'admin'
        const roleName = (profile as any).roles?.name?.toLowerCase() || '';
        const isUserAdmin = roleName.includes('admin') || u.email === 'denip23147@gmail.com';
        setIsAdmin(isUserAdmin);

        // Fetch permissions for the role via role_permissions pivot table
        if (profile.role_id) {
          const { data: rolePerms, error: rpError } = await supabase
            .from('role_permissions')
            .select(`
              permissions (
                code
              )
            `)
            .eq('role_id', profile.role_id);

          if (rpError) {
            console.error('Error fetching role permissions:', rpError);
          } else if (rolePerms) {
            const codes = rolePerms
              .map((rp: any) => rp.permissions?.code)
              .filter(Boolean);
            setPermissions(codes);
          }
        }
      }
    } catch (err) {
      console.error('Admin check failed:', err);
      setIsAdmin(false);
      setPermissions([]);
    }
  };

  useEffect(() => {
    // Safety timeout: jika loading masih true setelah 10 detik, paksa berhenti
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    // Initial session check
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setLoading(true);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // try/finally agar loading tidak stuck jika checkAdminStatus lambat
      const eventTimeout = setTimeout(() => setLoading(false), 8000);
      try {
        if (currentSession?.user) {
          await checkAdminStatus(currentSession.user);
        } else {
          setIsAdmin(false);
        }
      } finally {
        clearTimeout(eventTimeout);
        setLoading(false);
      }
    });

    // Periksa dan pulihkan sesi saat tab kembali aktif
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        // Refresh jika token tersisa < 5 menit (buffer lebih besar karena throttling browser)
        const secondsLeft = (currentSession.expires_at ?? 0) - Math.floor(Date.now() / 1000);
        if (secondsLeft < 300) {
          await supabase.auth.refreshSession();
        }
      } else {
        // Token expired/tidak valid dan tidak bisa diperbarui — bersihkan state lokal
        // Ini penyebab utama "logged in di UI tapi data gagal dimuat"
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setPermissions([]);
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
    try {
      setLoading(true);
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      // Optional: Clear specific Supabase keys if localStorage.clear() is too aggressive
      // Object.keys(localStorage).forEach(key => {
      //   if (key.startsWith('sb-')) localStorage.removeItem(key);
      // });
      toast.success('Berhasil keluar sistem.');
      window.location.href = '/'; // Hard redirect to clear all states reliably
    } catch (err) {
      console.error('Logout failed:', err);
      // If Supabase fail, still try to clear local data
      localStorage.clear();
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await checkAdminStatus(user);
  };

  const hasPermission = (code: string) => {
    if (isAdmin) return true; // Admins have all permissions for now
    return permissions.includes(code);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, permissions, loading, signOut, refreshProfile, hasPermission }}>
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
