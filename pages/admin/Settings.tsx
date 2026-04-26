import { useOutletContext } from 'react-router-dom';

import React, { useState, useEffect } from 'react';

import { useTheme } from '../../components/ThemeContext';
import { supabase } from '../../src/supabase';
import {
  User,
  Bell,
  Lock,
  Palette,
  Save,
  Camera,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  Shield,
  Smartphone,
  Loader2
} from 'lucide-react';

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'security';

const Settings: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Pengaturan Sistem");
  }, [setPageTitle]);

  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    nip: '',
    role: '',
    bio: '',
    phone: '',
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    waAlerts: true,
    newReports: true,
    statusUpdates: false,
    lowStock: true,
    weeklyDigest: false
  });

  const [security, setSecurity] = useState({
    newPassword: '',
    confirmPassword: '',
    twoFactor: false
  });

  const [passwordError, setPasswordError] = useState('');

  // Load user data from Supabase
  useEffect(() => {
    const loadUser = async () => {
      setIsFetching(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        // Load from users table
        const { data: userData } = await supabase
          .from('users')
          .select('display_name, phone')
          .eq('id', user.id)
          .single();

        // Load role name
        let roleName = '';
        const { data: userRowFull } = await supabase
          .from('users')
          .select('role_id')
          .eq('id', user.id)
          .single();

        if (userRowFull?.role_id) {
          const { data: roleData } = await supabase
            .from('roles')
            .select('name')
            .eq('id', userRowFull.role_id)
            .single();
          if (roleData) roleName = roleData.name;
        }

        const meta = user.user_metadata || {};

        setProfile({
          name: userData?.display_name || meta.display_name || '',
          email: user.email || '',
          nip: meta.nip || '',
          role: roleName || meta.role || '',
          bio: meta.bio || '',
          phone: userData?.phone || meta.phone || '',
        });

        if (meta.notifications) {
          setNotifications(prev => ({ ...prev, ...meta.notifications }));
        }

        if (meta.twoFactor !== undefined) {
          setSecurity(prev => ({ ...prev, twoFactor: meta.twoFactor }));
        }
      } catch (err) {
        console.error('Gagal memuat data pengguna:', err);
      } finally {
        setIsFetching(false);
      }
    };

    loadUser();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sesi tidak valid');

      if (activeTab === 'profile') {
        // Update display_name dan phone di tabel users
        const { error: dbError } = await supabase
          .from('users')
          .update({ display_name: profile.name, phone: profile.phone })
          .eq('id', user.id);

        if (dbError) throw dbError;

        // Update nip, bio di user_metadata
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            display_name: profile.name,
            nip: profile.nip,
            bio: profile.bio,
            phone: profile.phone,
          }
        });

        if (metaError) throw metaError;
      }

      if (activeTab === 'notifications') {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { notifications }
        });
        if (metaError) throw metaError;
      }

      if (activeTab === 'security') {
        if (security.newPassword) {
          if (security.newPassword !== security.confirmPassword) {
            setPasswordError('Konfirmasi kata sandi tidak cocok.');
            setIsLoading(false);
            return;
          }
          if (security.newPassword.length < 6) {
            setPasswordError('Kata sandi minimal 6 karakter.');
            setIsLoading(false);
            return;
          }
          setPasswordError('');
          const { error: pwError } = await supabase.auth.updateUser({
            password: security.newPassword
          });
          if (pwError) throw pwError;
          setSecurity(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
        }

        const { error: metaError } = await supabase.auth.updateUser({
          data: { twoFactor: security.twoFactor }
        });
        if (metaError) throw metaError;
      }

      showToast('success', 'Perubahan pengaturan berhasil disimpan.');
    } catch (err: any) {
      console.error('Gagal menyimpan pengaturan:', err);
      showToast('error', err.message || 'Gagal menyimpan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabNav = (id: SettingsTab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
        activeTab === id
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const avatarUrl = profile.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0D8ABC&color=fff`
    : `https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff`;

  return (
    <>
      <div className="relative flex flex-col lg:flex-row gap-8 pb-12">

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white shadow-green-900/20'
              : 'bg-red-600 text-white shadow-red-900/20'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
              : <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            }
            <div>
              <p className="font-bold">{toast.type === 'success' ? 'Berhasil Disimpan!' : 'Gagal Menyimpan'}</p>
              <p className="text-xs opacity-90">{toast.message}</p>
            </div>
          </div>
        )}

        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-2 space-y-1 sticky top-4">
            {renderTabNav('profile', 'Profil Pengguna', <User size={18} />)}
            {renderTabNav('notifications', 'Notifikasi', <Bell size={18} />)}
            {renderTabNav('appearance', 'Tampilan', <Palette size={18} />)}
            {renderTabNav('security', 'Keamanan', <Lock size={18} />)}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

            {/* Header Strip */}
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400"></div>

            <div className="p-6 md:p-8">
              {isFetching ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="animate-spin w-6 h-6 mr-3" />
                  <span>Memuat data...</span>
                </div>
              ) : (
              <form onSubmit={handleSave}>

                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-6">
                      <div className="relative group cursor-pointer">
                        <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-600 shadow-lg">
                          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white w-6 h-6" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name || '—'}</h3>
                        <p className="text-slate-500 dark:text-slate-300 text-sm">{profile.role || '—'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">NIP (Nomor Induk Pegawai)</label>
                        <input
                          type="text"
                          value={profile.nip}
                          onChange={(e) => setProfile({...profile, nip: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Dinas</label>
                        <input
                          type="email"
                          value={profile.email}
                          readOnly
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">No. Telepon</label>
                        <input
                          type="text"
                          value={profile.phone}
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Bio Singkat</label>
                        <textarea
                          rows={3}
                          value={profile.bio}
                          onChange={(e) => setProfile({...profile, bio: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- NOTIFICATIONS TAB --- */}
                {activeTab === 'notifications' && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
                        <Bell className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                        <div>
                          <h4 className="font-bold text-blue-900 dark:text-blue-100">Pusat Notifikasi</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Atur bagaimana Anda ingin menerima pembaruan sistem penting.</p>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        <div className="py-4 flex items-center justify-between">
                           <div>
                              <p className="font-semibold text-slate-900 dark:text-white">Notifikasi Email</p>
                              <p className="text-sm text-slate-500 dark:text-slate-300">Terima ringkasan harian ke email dinas.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={notifications.emailAlerts} onChange={() => setNotifications({...notifications, emailAlerts: !notifications.emailAlerts})} className="sr-only peer" />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                           </label>
                        </div>

                        <div className="py-4 flex items-center justify-between">
                           <div>
                              <p className="font-semibold text-slate-900 dark:text-white">WhatsApp Gateway</p>
                              <p className="text-sm text-slate-500 dark:text-slate-300">Notifikasi realtime untuk kejadian darurat.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={notifications.waAlerts} onChange={() => setNotifications({...notifications, waAlerts: !notifications.waAlerts})} className="sr-only peer" />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                           </label>
                        </div>

                        <div className="pt-6">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-4">Jenis Peringatan</p>
                          <div className="space-y-3">
                             {[
                               { id: 'newReports', label: 'Laporan Masuk Baru', desc: 'Saat warga mengirim aduan baru.' },
                               { id: 'lowStock', label: 'Stok Material Menipis', desc: 'Peringatan inventaris dibawah batas minimum.' },
                               { id: 'statusUpdates', label: 'Perubahan Status', desc: 'Saat tim lapangan memperbarui progres.' }
                             ].map((item) => (
                               <div key={item.id} className="flex items-start">
                                  <div className="flex items-center h-5">
                                    <input
                                      id={item.id}
                                      type="checkbox"
                                      // @ts-ignore
                                      checked={notifications[item.id]}
                                      // @ts-ignore
                                      onChange={() => setNotifications({...notifications, [item.id]: !notifications[item.id]})}
                                      className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                                    />
                                  </div>
                                  <div className="ml-3 text-sm">
                                    <label htmlFor={item.id} className="font-medium text-slate-900 dark:text-slate-100">{item.label}</label>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{item.desc}</p>
                                  </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      </div>
                   </div>
                )}

                {/* --- APPEARANCE TAB --- */}
                {activeTab === 'appearance' && (
                   <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div>
                         <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tema Aplikasi</h4>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div
                              onClick={() => theme === 'dark' && toggleTheme()}
                              className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                               <div className="p-3 bg-white rounded-full shadow-sm">
                                  <Sun className="text-amber-500" />
                               </div>
                               <span className="font-semibold text-slate-900 dark:text-white">Terang (Light)</span>
                            </div>

                            <div
                              onClick={() => theme === 'light' && toggleTheme()}
                              className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                               <div className="p-3 bg-slate-900 rounded-full shadow-sm">
                                  <Moon className="text-blue-300" />
                               </div>
                               <span className="font-semibold text-slate-900 dark:text-white">Gelap (Dark)</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                         <p className="text-sm text-slate-600 dark:text-slate-300">
                            <strong>Catatan:</strong> Pilihan tema akan disimpan di perangkat ini. Admin lain mungkin memiliki preferensi tampilan yang berbeda.
                         </p>
                      </div>
                   </div>
                )}

                {/* --- SECURITY TAB --- */}
                {activeTab === 'security' && (
                   <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                               <Shield className="text-green-600 dark:text-green-400 w-6 h-6" />
                               <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white">Otentikasi Dua Faktor (2FA)</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">Tambahkan lapisan keamanan ekstra.</p>
                               </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={security.twoFactor} onChange={() => setSecurity({...security, twoFactor: !security.twoFactor})} className="sr-only peer" />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                         </div>
                         {security.twoFactor && (
                            <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg flex items-center gap-3 text-sm border border-slate-200 dark:border-slate-700">
                               <Smartphone className="text-slate-400" size={16} />
                               <span className="text-slate-600 dark:text-slate-300">Kode akan dikirim ke <strong>{profile.phone || '+62 8XX-XXXX-XXXX'}</strong></span>
                            </div>
                         )}
                      </div>

                      <div className="space-y-4">
                         <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">Ubah Kata Sandi</h4>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kata Sandi Baru</label>
                              <input
                                type="password"
                                value={security.newPassword}
                                onChange={(e) => setSecurity({...security, newPassword: e.target.value})}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Konfirmasi Kata Sandi Baru</label>
                              <input
                                type="password"
                                value={security.confirmPassword}
                                onChange={(e) => setSecurity({...security, confirmPassword: e.target.value})}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              />
                           </div>
                         </div>
                         {passwordError && (
                           <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                             <AlertCircle size={14} /> {passwordError}
                           </p>
                         )}
                         <p className="text-xs text-slate-500 dark:text-slate-400">Kosongkan jika tidak ingin mengubah kata sandi.</p>
                      </div>
                   </div>
                )}

                {/* --- ACTION BUTTONS --- */}
                {activeTab !== 'appearance' && (
                  <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-end gap-4">
                     <button
                       type="button"
                       onClick={() => window.location.reload()}
                       className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                     >
                       Batalkan
                     </button>
                     <button
                       type="submit"
                       disabled={isLoading}
                       className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                     >
                       {isLoading ? (
                          <>
                            <Loader2 className="animate-spin mr-2 w-5 h-5" />
                            Menyimpan...
                          </>
                       ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Simpan Perubahan
                          </>
                       )}
                     </button>
                  </div>
                )}

              </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
