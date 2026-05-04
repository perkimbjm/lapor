import { useOutletContext } from 'react-router-dom';

import React, { useState, useEffect } from 'react';

import { AppUser, Role, type Worker } from '../../types';
import { supabase } from '../../src/supabase';
import type { User as SupabaseUser, Subscription } from '@supabase/supabase-js';
import { logAuditActivity, AuditAction } from '../../src/lib/auditLogger';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Shield,
  Calendar,
  UserPlus,
  Phone,
  User as UserIcon,
  Lock,
  Ban,
  Unlock,
  Key,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';
import { SUPERADMIN_EMAIL } from '../../constants';

const UserManagement: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Manajemen Pengguna (Users)");
  }, [setPageTitle]);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    username: '',
    phone: '',
    role_id: '',
    worker_id: ''
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserPerms, setCurrentUserPerms] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let authSubscription: Subscription | undefined;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleUserSession(session?.user);

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Skip TOKEN_REFRESHED & USER_UPDATED — event ini fire otomatis saat
        // ganti tab (auto-refresh token). Tidak perlu re-query perms karena
        // role/permission tidak berubah. Tanpa filter ini, setiap pindah tab
        // memicu 3 query DB sequential → terlihat seperti "disconnect".
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
        handleUserSession(session?.user);
      });
      authSubscription = data.subscription;
    };

    const handleUserSession = async (user: SupabaseUser | null) => {
      if (!user) return;
      setIsSuperAdmin(user.email === SUPERADMIN_EMAIL);
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user:", error);
          return;
        }

        if (userData && userData.role_id) {
          const { data: roleData } = await supabase
            .from('roles')
            .select('*')
            .eq('id', userData.role_id)
            .single();

          if (roleData && roleData.permissionIds) {
            const perms: string[] = [];
            for (const pId of roleData.permissionIds) {
              const { data: pDoc } = await supabase
                .from('permissions')
                .select('*')
                .eq('id', pId)
                .single();
              if (pDoc) perms.push(pDoc.code);
            }
            setCurrentUserPerms(Array.from(new Set(perms)));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    initAuth();

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const hasPermission = (code: string) => isSuperAdmin || currentUserPerms.includes(code);

  const handleExportExcel = () => {
    const dataToExport = users.map(u => ({
      'Email': u.email,
      'Nama': u.display_name || '-',
      'Username': u.username || '-',
      'Telepon': u.phone || '-',
      'Role ID': u.role_id || '-',
      'Status': u.is_banned ? 'Banned' : 'Aktif',
      'Terdaftar': new Date(u.created_at).toLocaleDateString('id-ID')
    }));

    exportToExcel(dataToExport, `Daftar_User_${new Date().toISOString().split('T')[0]}`, 'Manajemen User');
  };

  useEffect(() => {
    const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error("Error fetching users:", error);
    } else if (data) {
      setUsers(data as AppUser[]);
    }
    setLoading(false);
  };

    const fetchRoles = async () => {
      const { data, error } = await supabase.from('roles').select('*');
      if (error) {
        console.error("Error fetching roles:", error);
      } else if (data) {
        setRoles(data as Role[]);
      }
    };

    const fetchWorkers = async () => {
      const { data, error } = await supabase.from('workers').select('id, name');
      if (error) {
        console.error("Error fetching workers:", error);
      } else if (data) {
        setWorkers(data as unknown as Worker[]);
      }
    };

    fetchUsers();
    fetchRoles();
    fetchWorkers();

    const interval = setInterval(() => {
      fetchUsers();
      fetchRoles();
      fetchWorkers();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const emailLower = formData.email.toLowerCase();
      const usernameLower = formData.username.toLowerCase();

      // Check email
      const { data: emailData, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower);
      
      if (emailError) {
        console.error("Error checking email:", emailError);
        return;
      }
      if (emailData && emailData.some(doc => doc.id !== currentId)) {
        triggerToast('Email sudah terdaftar', 'error');
        setIsSaving(false);
        return;
      }

      // Check username
      if (formData.username) {
        const { data: usernameData, error: usernameError } = await supabase
          .from('users')
          .select('id')
          .eq('username', usernameLower);
          
        if (usernameError) {
          console.error("Error checking username:", usernameError);
          return;
        }
        if (usernameData && usernameData.some(doc => doc.id !== currentId)) {
          triggerToast('Username sudah terdaftar', 'error');
          setIsSaving(false);
          return;
        }
      }

      // Check phone
      if (formData.phone) {
        const { data: phoneData, error: phoneError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', formData.phone);
          
        if (phoneError) {
          console.error("Error checking phone:", phoneError);
          return;
        }
        if (phoneData && phoneData.some(doc => doc.id !== currentId)) {
          triggerToast('Nomor HP sudah terdaftar', 'error');
          setIsSaving(false);
          return;
        }
      }

      if (isEditing && currentId) {
        const updateData: Partial<AppUser> & { worker_id?: string | null; password?: string } = {
          display_name: formData.display_name,
          username: usernameLower,
          phone: formData.phone,
          role_id: formData.role_id
        };

        if (formData.worker_id) {
          updateData.worker_id = formData.worker_id;
        } else {
          updateData.worker_id = null;
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', currentId);

        if (error) {
          console.error("Update error:", error);
        } else {
          await logAuditActivity(AuditAction.UPDATE, 'Manajemen User', `Memperbarui pengguna ${formData.email}`);
        }
        triggerToast('Pengguna berhasil diperbarui');
      } else {
        const insertData: Partial<AppUser> & { worker_id?: string | null; password?: string } = {
          email: emailLower,
          username: usernameLower,
          phone: formData.phone,
          display_name: formData.display_name,
          role_id: formData.role_id,
          is_banned: false,
          created_at: new Date().toISOString()
        };

        if (formData.worker_id) {
          insertData.worker_id = formData.worker_id;
        }

        const { error } = await supabase
          .from('users')
          .insert([insertData]);

        if (error) {
          console.error("Create error:", error);
        } else {
          await logAuditActivity(AuditAction.CREATE, 'Manajemen User', `Menambahkan pengguna ${emailLower}`);
        }
        triggerToast('Pengguna berhasil ditambahkan');
      }
      setIsModalOpen(false);
      setFormData({ email: '', display_name: '', username: '', phone: '', role_id: '', worker_id: '' });
    } catch (error) {
      console.error('Error saving user:', error);
      triggerToast('Gagal menyimpan pengguna', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !newPassword) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          _tempPassword: newPassword, // For simulation/admin reference
          passwordLastReset: new Date().toISOString()
        })
        .eq('id', resetUserId);
        
      if (error) {
        console.error("Reset password error:", error);
      }
      
      triggerToast('Permintaan reset password berhasil diproses');
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      triggerToast('Gagal mereset password', 'error');
    }
  };

  const toggleBanStatus = async (user: AppUser) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: !user.is_banned
        })
        .eq('id', user.id);
        
      if (error) {
        console.error("Status ban error:", error);
      } else {
        await logAuditActivity(AuditAction.UPDATE, 'Manajemen User', `Mengubah status blokir pengguna ${user.email} menjadi ${!user.is_banned}`);
      }
      triggerToast(`Pengguna berhasil ${user.is_banned ? 'dibuka blokirnya' : 'diblokir'}`);
    } catch (error) {
      console.error('Error toggling ban status:', error);
      triggerToast('Gagal mengubah status blokir', 'error');
    }
  };

  const openEditModal = (user: AppUser) => {
    setIsEditing(true);
    setCurrentId(user.id);
    setFormData({
      email: user.email,
      display_name: user.display_name || '',
      username: user.username || '',
      phone: user.phone || '',
      role_id: user.role_id || '',
      worker_id: user.worker_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deleteConfirm.id);
        
      if (error) {
        console.error("Delete user error:", error);
      } else {
        await logAuditActivity(AuditAction.DELETE, 'Manajemen User', `Menghapus pengguna ${deleteConfirm.email}`);
      }
      
      triggerToast('Pengguna berhasil dihapus');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      triggerToast('Gagal menghapus pengguna', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari pengguna..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setFormData({ email: '', display_name: '', username: '', phone: '', role_id: '', worker_id: '' });
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={18} /> Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Pengguna</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Peran</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Terdaftar</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Users className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada pengguna ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 font-black text-xs uppercase">
                          {user.display_name ? user.display_name.substring(0, 2) : user.email.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.display_name || 'Tanpa Nama'}</p>
                            {user.email === SUPERADMIN_EMAIL && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <Shield size={8} /> Super Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Mail size={10}/> {user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {!user.role_id ? (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-tight">Tanpa Peran</span>
                        ) : (
                          (() => {
                            const r = roles.find(role => role.id === user.role_id);
                            return r ? (
                              <span key={user.role_id} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-tight">
                                {r.name}
                              </span>
                            ) : null;
                          })()
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('USERS_RESET_PASSWORD') && (
                          <button 
                            onClick={() => {
                              setResetUserId(user.id);
                              setIsResetModalOpen(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-all"
                            title="Reset Password"
                          >
                            <Key size={18} />
                          </button>
                        )}
                        {hasPermission('USERS_BAN_USER') && (
                          <button 
                            onClick={() => toggleBanStatus(user)}
                            disabled={user.email === SUPERADMIN_EMAIL}
                            className={`p-2.5 rounded-xl transition-all ${
                              user.is_banned 
                                ? 'text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100' 
                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                            } disabled:opacity-20 disabled:cursor-not-allowed`}
                            title={user.is_banned ? "Buka Blokir" : "Blokir Pengguna"}
                          >
                            {user.is_banned ? <Unlock size={18} /> : <Ban size={18} />}
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: user.id, email: user.email })}
                          disabled={user.email === SUPERADMIN_EMAIL}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Email Pengguna</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="email" 
                        required 
                        disabled={isEditing}
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        placeholder="email@example.com"
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Username</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        required
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        placeholder="username"
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nomor HP</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="08123456789"
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={formData.display_name}
                      onChange={e => setFormData({...formData, display_name: e.target.value})}
                      placeholder="Contoh: Ahmad Fulan"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex justify-between">
                      Peran (Role)
                      <span className="text-blue-600">{formData.role_id ? '1' : '0'} Terpilih</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.role_id}
                        onChange={e => setFormData({...formData, role_id: e.target.value, worker_id: ''})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      >
                        <option value="">Pilih Peran</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const selectedRole = roles.find(r => r.id === formData.role_id);
                    return selectedRole && selectedRole.name && selectedRole.name.toLowerCase() === 'petugas' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Pilih Pekerja</label>
                        <div className="relative">
                          <select
                            value={formData.worker_id}
                            onChange={e => setFormData({...formData, worker_id: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          >
                            <option value="">Pilih Pekerja</option>
                            {workers.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Pengguna')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsResetModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Reset Password</h3>
              <button onClick={() => setIsResetModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:bg-purple-700 active:scale-95 transition-all"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Hapus Pengguna?</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
              Anda akan menghapus pengguna <span className="text-slate-900 dark:text-white">"{deleteConfirm.email}"</span>. Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
