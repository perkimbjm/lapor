
import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { AppUser, Role } from '../../types';
import { db, auth } from '../../src/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../../src/lib/firestoreErrorHandler';
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

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    username: '',
    phone: '',
    roleId: ''
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsSuperAdmin(user.email === 'denip23147@gmail.com');
        
        // Fetch user doc to get roles
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', user.uid));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          return;
        }
        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUser;
          const roleId = userData.roleId || '';
          
          if (roleId) {
            // Fetch permissions for this role
            const perms: string[] = [];
            const roleDoc = await getDoc(doc(db, 'roles', roleId));
            if (roleDoc.exists()) {
              const roleData = roleDoc.data() as Role;
              const pIds = roleData.permissionIds || [];
              
              for (const pId of pIds) {
                const pDoc = await getDoc(doc(db, 'permissions', pId));
                if (pDoc.exists()) {
                  perms.push(pDoc.data().code);
                }
              }
            }
            setCurrentUserPerms(Array.from(new Set(perms)));
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const hasPermission = (code: string) => isSuperAdmin || currentUserPerms.includes(code);

  const handleExportExcel = () => {
    const dataToExport = users.map(u => ({
      'UID': u.uid,
      'Email': u.email,
      'Nama': u.displayName || '-',
      'Username': u.username || '-',
      'Telepon': u.phone || '-',
      'Role ID': u.roleId || '-',
      'Status': u.isBanned ? 'Banned' : 'Aktif',
      'Terdaftar': new Date(u.createdAt).toLocaleDateString('id-ID')
    }));

    exportToExcel(dataToExport, `Daftar_User_${new Date().toISOString().split('T')[0]}`, 'Manajemen User');
  };

  useEffect(() => {
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    const qRoles = query(collection(db, 'roles'));
    const unsubscribeRoles = onSnapshot(qRoles, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
      setRoles(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roles');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
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
      // Uniqueness checks
      const emailLower = formData.email.toLowerCase();
      const usernameLower = formData.username.toLowerCase();

      // Check email
      const qEmail = query(collection(db, 'users'), where('email', '==', emailLower));
      let snapEmail;
      try {
        snapEmail = await getDocs(qEmail);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return;
      }
      if (snapEmail.docs.some(doc => doc.id !== currentId)) {
        triggerToast('Email sudah terdaftar', 'error');
        setIsSaving(false);
        return;
      }

      // Check username
      if (formData.username) {
        const qUsername = query(collection(db, 'users'), where('username', '==', usernameLower));
        let snapUsername;
        try {
          snapUsername = await getDocs(qUsername);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'users');
          return;
        }
        if (snapUsername.docs.some(doc => doc.id !== currentId)) {
          triggerToast('Username sudah terdaftar', 'error');
          setIsSaving(false);
          return;
        }
      }

      // Check phone
      if (formData.phone) {
        const qPhone = query(collection(db, 'users'), where('phone', '==', formData.phone));
        let snapPhone;
        try {
          snapPhone = await getDocs(qPhone);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'users');
          return;
        }
        if (snapPhone.docs.some(doc => doc.id !== currentId)) {
          triggerToast('Nomor HP sudah terdaftar', 'error');
          setIsSaving(false);
          return;
        }
      }

      if (isEditing && currentId) {
        try {
          await updateDoc(doc(db, 'users', currentId), {
            displayName: formData.displayName,
            username: usernameLower,
            phone: formData.phone,
            roleId: formData.roleId
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${currentId}`);
        }
        triggerToast('Pengguna berhasil diperbarui');
      } else {
        try {
          await addDoc(collection(db, 'users'), {
            email: emailLower,
            username: usernameLower,
            phone: formData.phone,
            displayName: formData.displayName,
            roleId: formData.roleId,
            isBanned: false,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'users');
        }
        triggerToast('Pengguna berhasil ditambahkan');
      }
      setIsModalOpen(false);
      setFormData({ email: '', displayName: '', username: '', phone: '', roleId: '' });
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
      // In a real Firebase app, you'd use Admin SDK or send a reset email.
      // Here we'll simulate it by updating a field or just showing success.
      // Note: We can't actually change the Auth password from frontend for another user.
      try {
        await updateDoc(doc(db, 'users', resetUserId), {
          _tempPassword: newPassword, // For simulation/admin reference
          passwordLastReset: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${resetUserId}`);
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
      try {
        await updateDoc(doc(db, 'users', user.id), {
          isBanned: !user.isBanned
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      }
      triggerToast(`Pengguna berhasil ${user.isBanned ? 'dibuka blokirnya' : 'diblukir'}`);
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
      displayName: user.displayName || '',
      username: user.username || '',
      phone: user.phone || '',
      roleId: user.roleId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      try {
        await deleteDoc(doc(db, 'users', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${deleteConfirm.id}`);
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
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Manajemen Pengguna (Users)">
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
              setFormData({ email: '', displayName: '', username: '', phone: '', roleId: '' });
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
                          {user.displayName ? user.displayName.substring(0, 2) : user.email.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.displayName || 'Tanpa Nama'}</p>
                            {user.email === 'denip23147@gmail.com' && (
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
                        {!user.roleId ? (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-tight">Tanpa Peran</span>
                        ) : (
                          (() => {
                            const r = roles.find(role => role.id === user.roleId);
                            return r ? (
                              <span key={user.roleId} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-tight">
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
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
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
                            disabled={user.email === 'denip23147@gmail.com'}
                            className={`p-2.5 rounded-xl transition-all ${
                              user.isBanned 
                                ? 'text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100' 
                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                            } disabled:opacity-20 disabled:cursor-not-allowed`}
                            title={user.isBanned ? "Buka Blokir" : "Blokir Pengguna"}
                          >
                            {user.isBanned ? <Unlock size={18} /> : <Ban size={18} />}
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
                          disabled={user.email === 'denip23147@gmail.com'}
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
                      value={formData.displayName}
                      onChange={e => setFormData({...formData, displayName: e.target.value})}
                      placeholder="Contoh: Ahmad Fulan"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex justify-between">
                      Peran (Role)
                      <span className="text-blue-600">{formData.roleId ? '1' : '0'} Terpilih</span>
                    </label>
                    <div className="relative">
                      <select 
                        value={formData.roleId}
                        onChange={e => setFormData({...formData, roleId: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      >
                        <option value="">Pilih Peran</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
    </AdminLayout>
  );
};

export default UserManagement;
