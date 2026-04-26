import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Role, Permission, RolePermission } from '../../types';
import { supabase } from '../../src/supabase';
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Info,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';

const FEATURES = [
  { id: 'DASHBOARD', name: 'Dashboard' },
  { id: 'COMPLAINTS', name: 'Daftar Aduan' },
  { id: 'MAP', name: 'Peta Sebaran' },
  { id: 'INVENTORY', name: 'Stok Material' },
  { id: 'EQUIPMENT', name: 'Armada & Peralatan' },
  { id: 'WORKFORCE', name: 'Tenaga Kerja' },
  { id: 'REPORTS', name: 'Laporan & Biaya' },
  { id: 'CMS', name: 'CMS Landing Page' },
  { id: 'USERS', name: 'Manajemen User' },
  { id: 'ROLES', name: 'Manajemen Role' },
  { id: 'PERMISSIONS', name: 'Manajemen Izin' },
  { id: 'AUDIT_LOG', name: 'Audit Log' },
];

const ACTIONS = [
  { id: 'read', label: 'R', fullLabel: 'Melihat Data', icon: <Eye size={10} /> },
  { id: 'create', label: 'C', fullLabel: 'Menambahkan Data', icon: <Plus size={10} /> },
  { id: 'update', label: 'U', fullLabel: 'Update/Edit Data', icon: <Pencil size={10} /> },
  { id: 'delete', label: 'D', fullLabel: 'Menghapus Data', icon: <Trash2 size={10} /> },
];

const RoleManagement: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (t: string) => void }>();
  useEffect(() => { setPageTitle('Manajemen Peran (Roles)'); }, [setPageTitle]);

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissionIds: [] as string[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  
  const fetchRoles = async () => {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) {
      console.error('Error fetching roles:', error);
      return;
    }
    if (data) setRoles(data as Role[]);
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) {
      console.error('Error fetching permissions:', error);
      return;
    }
    if (data) setPermissions(data as Permission[]);
  };

  const fetchRolePermissions = async () => {
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error) {
      console.error('Error fetching role_permissions:', error);
      throw error;
    }
    if (data) setRolePermissions(data as RolePermission[]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRoles(), fetchPermissions(), fetchRolePermissions()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime: sync when roles, permissions, or role_permissions change from any page
    const channel = supabase
      .channel('role-management-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'permissions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportExcel = () => {
    const dataToExport = roles.map(r => {
      const rolePermIds = rolePermissions
        .filter(rp => rp.role_id === r.id)
        .map(rp => rp.permission_id);
      
      const rolePerms = permissions.filter(p => rolePermIds.includes(p.id));
      
      return {
        'Nama Role': r.name,
        'Deskripsi': r.description,
        'Jumlah Izin': rolePermIds.length,
        'Daftar Izin': rolePerms.map(p => p.name).join(', ')
      };
    });

    exportToExcel(dataToExport, `Daftar_Role_${new Date().toISOString().split('T')[0]}`, 'Manajemen Role');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let roleId = currentId;

      if (isEditing && currentId) {
        const { error } = await supabase
          .from('roles')
          .update({ name: formData.name, description: formData.description })
          .eq('id', currentId);
        if (error) throw error;
      } else {
        const { data: newRole, error: roleError } = await supabase
          .from('roles')
          .insert([{ name: formData.name, description: formData.description }])
          .select()
          .single();
        if (roleError) throw roleError;
        roleId = newRole.id;
      }

      // Sync role_permissions using diff — avoids duplicate-key errors if RLS
      // blocks the DELETE (Supabase returns no error but deletes 0 rows)
      if (roleId) {
        const { data: currentRPs, error: fetchErr } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', roleId);
        if (fetchErr) throw fetchErr;

        const currentIds = (currentRPs ?? []).map((r: any) => r.permission_id as string);
        const nextIds    = formData.selectedPermissionIds;
        const toRemove   = currentIds.filter(id => !nextIds.includes(id));
        const toAdd      = nextIds.filter(id => !currentIds.includes(id));

        if (toRemove.length > 0) {
          const { error: delErr } = await supabase
            .from('role_permissions')
            .delete()
            .eq('role_id', roleId)
            .in('permission_id', toRemove);
          if (delErr) throw delErr;
        }

        if (toAdd.length > 0) {
          const { error: addErr } = await supabase
            .from('role_permissions')
            .insert(toAdd.map(pId => ({ role_id: roleId as string, permission_id: pId })));
          if (addErr) throw addErr;
        }
      }

      triggerToast(isEditing ? 'Peran berhasil diperbarui' : 'Peran berhasil ditambahkan');
      setIsModalOpen(false);
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', description: '', selectedPermissionIds: [] });
      await fetchData();
    } catch (error: any) {
      console.error('Error saving role:', error);
      triggerToast(`Gagal menyimpan: ${error?.message ?? 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissionIds: prev.selectedPermissionIds.includes(id)
        ? prev.selectedPermissionIds.filter(pId => pId !== id)
        : [...prev.selectedPermissionIds, id]
    }));
  };

  const openEditModal = (role: Role) => {
    setIsEditing(true);
    setCurrentId(role.id);
    
    const rolePermIds = rolePermissions
      .filter(rp => rp.role_id === role.id)
      .map(rp => rp.permission_id);

    setFormData({
      name: role.name,
      description: role.description || '',
      selectedPermissionIds: rolePermIds
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus peran ini?')) return;
    try {
      // 1. Delete from role_permissions first (pivot cleanup)
      const { error: rpError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', id);
      
      if (rpError) throw rpError;

      // 2. Delete the role
      const { error: roleError } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);
      
      if (roleError) throw roleError;

      triggerToast('Peran berhasil dihapus');
      await fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
      triggerToast('Gagal menghapus peran', 'error');
    }
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Cari peran..." 
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
              setFormData({ name: '', description: '', selectedPermissionIds: [] });
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Tambah Peran
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat data...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Shield className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada peran ditemukan</p>
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div key={role.id} className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Shield size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(role)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(role.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{role.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 line-clamp-2">{role.description || 'Tidak ada deskripsi'}</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Izin Terpasang</span>
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black">
                    {rolePermissions.filter(rp => rp.role_id === role.id).length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rolePermissions
                    .filter(rp => rp.role_id === role.id)
                    .slice(0, 3)
                    .map(rp => {
                      const p = permissions.find(perm => perm.id === rp.permission_id);
                      return p ? (
                        <span key={rp.permission_id} className="px-2 py-1 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-tight">
                          {p.name}
                        </span>
                      ) : null;
                    })}
                  {rolePermissions.filter(rp => rp.role_id === role.id).length > 3 && (
                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-lg text-[9px] font-bold uppercase tracking-tight">
                      +{rolePermissions.filter(rp => rp.role_id === role.id).length - 3} Lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {isEditing ? 'Edit Peran' : 'Tambah Peran Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nama Peran</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Contoh: Admin Gudang"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Deskripsi</label>
                    <textarea 
                      rows={4}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Jelaskan tanggung jawab peran ini..."
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-4 flex gap-4">
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
                      className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {isSaving && <Loader2 size={14} className="animate-spin" />}
                      {isEditing ? 'Simpan' : 'Tambah'}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex justify-between">
                    Izin Akses (Matriks CRUD)
                    <span className="text-blue-600">{formData.selectedPermissionIds.length} Terpilih</span>
                  </label>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900">
                            <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500">Fitur</th>
                            {ACTIONS.map(action => (
                              <th key={action.id} className="px-2 py-3 text-center" title={action.fullLabel}>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[9px] font-black text-slate-500">{action.label}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {FEATURES.map(feature => (
                            <tr key={feature.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{feature.name}</span>
                              </td>
                              {ACTIONS.map(action => {
                                const perm = permissions.find(p => p.feature === feature.id && p.action === action.id);
                                return (
                                  <td key={action.id} className="px-2 py-3 text-center">
                                    {perm ? (
                                      <button
                                        type="button"
                                        onClick={() => togglePermission(perm.id)}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all mx-auto ${
                                          formData.selectedPermissionIds.includes(perm.id)
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-blue-100'
                                        }`}
                                      >
                                        {formData.selectedPermissionIds.includes(perm.id) ? <Check size={12} /> : action.icon}
                                      </button>
                                    ) : (
                                      <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-900/30 mx-auto opacity-20"></div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    {ACTIONS.map(a => (
                      <div key={a.id} className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">{a.label}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{a.fullLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RoleManagement;
