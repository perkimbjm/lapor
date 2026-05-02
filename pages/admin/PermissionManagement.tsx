import { useOutletContext } from 'react-router-dom';

import React, { useState, useEffect } from 'react';

import { Permission, Role, RolePermission } from '../../types';
import { supabase } from '../../src/supabase';
import {
  FEATURES,
  ACTIONS,
  WORKFORCE_ONLY_ACTIONS,
  USERS_ONLY_ACTIONS,
  type FeatureId,
} from '../../constants';
import {
  Bell,
  Shield,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Key,
  Eye,
  Pencil,
  Check,
  ChevronDown,
  Info,
  Users,
  LayoutDashboard,
  ClipboardList,
  Map,
  Package,
  Truck,
  BarChart3,
  Settings,
  FileSpreadsheet,
  Activity,
  Banknote,
  Calendar
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';

/** Icon lookup per feature — keeps JSX out of the shared constants file */
const FEATURE_ICONS: Record<string, React.ReactNode> = {
  DASHBOARD:     <LayoutDashboard size={16} />,
  COMPLAINTS:    <ClipboardList size={16} />,
  MAP:           <Map size={16} />,
  INVENTORY:     <Package size={16} />,
  EQUIPMENT:     <Truck size={16} />,
  WORKFORCE:     <Users size={16} />,
  REPORTS:       <BarChart3 size={16} />,
  CMS:           <Settings size={16} />,
  USERS:         <Users size={16} />,
  ROLES:         <Shield size={16} />,
  PERMISSIONS:   <Key size={16} />,
  NOTIFICATIONS: <Bell size={16} />,
  AUDIT_LOG:     <Activity size={16} />,
};

/** Icon lookup per action */
const ACTION_ICONS: Record<string, React.ReactNode> = {
  read:            <Eye size={14} />,
  create:          <Plus size={14} />,
  update:          <Pencil size={14} />,
  delete:          <Trash2 size={14} />,
  reset_password:  <Key size={14} />,
  ban_user:        <XCircle size={14} />,
  manage_rates:    <Banknote size={14} />,
  manage_excel:    <FileSpreadsheet size={14} />,
  manage_holidays: <Calendar size={14} />,
};

const PermissionManagement: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Manajemen Izin (CRUD Based)");
  }, [setPageTitle]);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(FEATURES[0].id);
  const [selectedActions, setSelectedActions] = useState<string[]>(['read']);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    description: ''
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      const { data } = await supabase.from('permissions').select('*');
      if (data) setPermissions(data as Permission[]);
    };

    const fetchRoles = async () => {
      const { data } = await supabase.from('roles').select('*');
      if (data) setRoles(data as Role[]);
    };

    const fetchRolePermissions = async () => {
      const { data } = await supabase.from('role_permissions').select('*');
      if (data) setRolePermissions(data as RolePermission[]);
    };

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchPermissions(), fetchRoles(), fetchRolePermissions()]);
      setLoading(false);
    };

    fetchData();

    const interval = setInterval(() => {
      fetchPermissions();
      fetchRoles();
      fetchRolePermissions();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isEditing && isModalOpen) {
      const existingActions = permissions
        .filter(p => p.feature === selectedFeature)
        .map(p => p.action);
      
      // Pre-select existing actions + 'read' by default
      setSelectedActions(Array.from(new Set([...existingActions, 'read'])));
    }
  }, [selectedFeature, isModalOpen, isEditing, permissions]);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportExcel = () => {
    const dataToExport = permissions.map(p => ({
      'Nama Izin': p.name,
      'Kode': p.code,
      'Fitur': p.feature,
      'Aksi': p.action,
      'Deskripsi': p.description || '-'
    }));

    exportToExcel(dataToExport, `Daftar_Izin_${new Date().toISOString().split('T')[0]}`, 'Manajemen Izin');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && currentId) {
      try {
        // 1. Update permission details
        const { error: permError } = await supabase
          .from('permissions')
          .update({
            name: editData.name,
            description: editData.description
          })
          .eq('id', currentId);

        if (permError) throw permError;

        // 2. Update role_permissions (the pivot table)
        // First, get currently assigned roles for this permission
        const currentlyAssignedRoleIds = rolePermissions
          .filter(rp => rp.permission_id === currentId)
          .map(rp => rp.role_id);

        // Roles to add
        const toAdd = selectedRoleIds.filter(id => !currentlyAssignedRoleIds.includes(id));
        // Roles to remove
        const toRemove = currentlyAssignedRoleIds.filter(id => !selectedRoleIds.includes(id));

        if (toRemove.length > 0) {
          await supabase
            .from('role_permissions')
            .delete()
            .eq('permission_id', currentId)
            .in('role_id', toRemove);
        }

        if (toAdd.length > 0) {
          await supabase
            .from('role_permissions')
            .insert(toAdd.map(roleId => ({
              role_id: roleId,
              permission_id: currentId
            })));
        }

        triggerToast('Izin dan Peran berhasil diperbarui');
        setIsModalOpen(false);
        setIsEditing(false);
        setCurrentId(null);
        setSelectedRoleIds([]);
      } catch (error) {
        console.error('Error updating permission:', error);
        triggerToast('Gagal memperbarui izin', 'error');
      }
      return;
    }

    if (selectedActions.length === 0) {
      triggerToast('Pilih setidaknya satu aksi', 'error');
      return;
    }

    try {
      const featureObj = FEATURES.find(f => f.id === selectedFeature);
      const newPermIds: string[] = [];
      let alreadyExistsCount = 0;
      
      // 1. Create Permissions
      for (const actionId of selectedActions) {
        const actionObj = ACTIONS.find(a => a.id === actionId);
        const code = `${selectedFeature}_${actionId.toUpperCase()}`;
        
        const existing = permissions.find(p => p.code === code);
        if (existing) {
          newPermIds.push(existing.id);
          alreadyExistsCount++;
          continue;
        }

        const { data: newPerm, error: permError } = await supabase
          .from('permissions')
          .insert([{
            feature: selectedFeature,
            action: actionId,
            code: code,
            name: `${actionObj?.label} - ${featureObj?.name}`,
            description: `Izin untuk ${actionObj?.label.toLowerCase()} pada fitur ${featureObj?.name}`
          }])
          .select()
          .single();

        if (permError) throw permError;
        if (newPerm) newPermIds.push(newPerm.id);
      }

      if (alreadyExistsCount === selectedActions.length) {
        triggerToast('Izin sudah tersedia sebelumnya', 'error');
        return;
      }

      // 2. Assign to selected roles (pivot insert)
      if (selectedRoleIds.length > 0 && newPermIds.length > 0) {
        const pivotInserts = [];
        for (const permId of newPermIds) {
          for (const roleId of selectedRoleIds) {
            pivotInserts.push({
              role_id: roleId,
              permission_id: permId
            });
          }
        }
        
        if (pivotInserts.length > 0) {
          const { error: pivotError } = await supabase
            .from('role_permissions')
            .insert(pivotInserts);
          if (pivotError) throw pivotError;
        }
      }

      triggerToast('Izin berhasil ditambahkan dan diberikan ke peran terpilih');
      setIsModalOpen(false);
      setSelectedActions(['read']);
      setSelectedRoleIds([]);
    } catch (error) {
      console.error('Error saving permissions:', error);
      triggerToast('Gagal menyimpan izin', 'error');
    }
  };

  const openEditModal = (perm: Permission) => {
    setIsEditing(true);
    setCurrentId(perm.id);
    setEditData({
      name: perm.name,
      description: perm.description || ''
    });
    
    // Find roles that have this permission via rolePermissions state
    const roleIdsWithPerm = rolePermissions
      .filter(rp => rp.permission_id === perm.id)
      .map(rp => rp.role_id);
    setSelectedRoleIds(roleIdsWithPerm);
    
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    try {
      // 1. Delete matching role_permissions entries (pivot cleanup)
      const { error: rpError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('permission_id', id);
      
      if (rpError) throw rpError;

      // 2. Delete the permission document
      const { error: deleteError } = await supabase.from('permissions').delete().eq('id', id);
      if (deleteError) throw deleteError;

      triggerToast('Izin berhasil dihapus');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting permission:', error);
      triggerToast('Gagal menghapus izin', 'error');
    }
  };

  const toggleAction = (id: string) => {
    setSelectedActions(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleRole = (id: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  // Group permissions by feature
  const groupedPermissions = FEATURES.map(feature => ({
    ...feature,
    perms: permissions.filter(p => p.feature === feature.id)
  })).filter(f => f.perms.length > 0 && (f.name.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari fitur..." 
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
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Tambah Izin Fitur
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat data...</p>
          </div>
        ) : groupedPermissions.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <Shield className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada izin yang dikonfigurasi</p>
          </div>
        ) : (
          groupedPermissions.map((feature) => (
            <div key={feature.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    {FEATURE_ICONS[feature.id] ?? <Shield size={16} />}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{feature.name}</h4>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{feature.perms.length} Izin Aktif</span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ACTIONS.filter(action => {
                  if (USERS_ONLY_ACTIONS.includes(action.id)) return feature.id === 'USERS';
                  if (WORKFORCE_ONLY_ACTIONS.includes(action.id)) return feature.id === 'WORKFORCE';
                  return true;
                }).map(action => {
                  const perm = feature.perms.find(p => p.action === action.id);
                  return (
                    <div 
                      key={action.id} 
                      className={`relative p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        perm 
                          ? 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm' 
                          : 'border-dashed border-slate-200 dark:border-slate-700 opacity-40 grayscale'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${action.color}`}>
                          {ACTION_ICONS[action.id]}
                        </div>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{action.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        {perm && (
                          <>
                            <button 
                              onClick={() => openEditModal(perm)}
                              className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm({ id: perm.id, name: perm.name })}
                              className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => { setIsModalOpen(false); setIsEditing(false); }}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {isEditing ? 'Edit Izin' : 'Konfigurasi Izin Fitur'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nama Izin</label>
                    <input 
                      type="text" 
                      required 
                      value={editData.name}
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Deskripsi</label>
                    <textarea 
                      rows={3}
                      value={editData.description}
                      onChange={e => setEditData({...editData, description: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Pilih Fitur / Menu</label>
                    <div className="relative">
                      <select 
                        value={selectedFeature}
                        onChange={e => {
                          const newFeature = e.target.value as FeatureId;
                          setSelectedFeature(newFeature);
                        }}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                      >
                        {FEATURES.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Pilih Hak Akses (CRUD)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ACTIONS.filter(action => {
                      if (USERS_ONLY_ACTIONS.includes(action.id)) return selectedFeature === 'USERS';
                      if (WORKFORCE_ONLY_ACTIONS.includes(action.id)) return selectedFeature === 'WORKFORCE';
                      return true;
                    }).map(action => {
                      const isExisting = permissions.some(p => p.feature === selectedFeature && p.action === action.id);
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => toggleAction(action.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            selectedActions.includes(action.id)
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${action.color}`}>
                              {ACTION_ICONS[action.id]}
                            </div>
                            <div className="text-left">
                              <p className={`text-[10px] font-black uppercase tracking-tight ${selectedActions.includes(action.id) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{action.label}</p>
                              {isExisting && (
                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Sudah Ada</span>
                              )}
                            </div>
                          </div>
                          {selectedActions.includes(action.id) && (
                            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/20">
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex justify-between">
                  {isEditing ? 'Pilih Peran untuk Izin Ini' : 'Berikan Izin ke Peran (Opsional)'}
                  <span className="text-blue-600">{selectedRoleIds.length} Terpilih</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.length === 0 ? (
                    <div className="col-span-full py-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada peran tersedia</p>
                    </div>
                  ) : (
                    roles.map(role => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          selectedRoleIds.includes(role.id)
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl">
                            <Users size={14} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tight ${selectedRoleIds.includes(role.id) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{role.name}</span>
                        </div>
                        {selectedRoleIds.includes(role.id) && (
                          <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Check size={12} />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setIsEditing(false); }}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Generate Izin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Hapus Izin?</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
              Anda akan menghapus izin <span className="text-slate-900 dark:text-white">"{deleteConfirm.name}"</span>. Aksi ini tidak dapat dibatalkan.
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

export default PermissionManagement;
