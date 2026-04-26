import { useOutletContext } from 'react-router-dom';

import React, { useState, useEffect } from 'react';

import { Equipment } from '../../types';
import { supabase } from '../../src/supabase';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Truck, 
  Wrench,
  Construction,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';

const EquipmentInventory: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Armada & Peralatan");
  }, [setPageTitle]);

  const [activeTab, setActiveTab] = useState<'Heavy' | 'Tool'>('Heavy');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  
  useEffect(() => {
    const fetchEquipment = async () => {
      const { data, error } = await supabase.from('equipment').select('*');
      if (error) {
        console.error("Error fetching equipment:", error);
      } else if (data) {
        setEquipment(data as Equipment[]);
      }
    };

    fetchEquipment();

    const interval = setInterval(() => {
      fetchEquipment();
    }, 9000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: 'Heavy' as 'Heavy' | 'Tool',
    status: 'Tersedia' as 'Tersedia' | 'Perbaikan'
  });

  const triggerToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredItems = equipment.filter(item => item.category === activeTab);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemData = {
      ...formData
    };
    
    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from('equipment').update(itemData).eq('id', currentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipment').insert([itemData]);
        if (error) throw error;
      }
      triggerToast('Data alat berhasil disimpan');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      triggerToast('Gagal menyimpan data alat');
    }
  };

  const handleExportExcel = () => {
    const dataToExport = equipment.map(e => ({
      'Nama Alat': e.name,
      'Tipe': e.type,
      'Kategori': e.category === 'Heavy' ? 'Alat Berat' : 'Peralatan',
      'Status': e.status,
      'ID Pekerjaan': e.assigned_to_job_id || '-'
    }));

    exportToExcel(dataToExport, `Armada_Peralatan_${new Date().toISOString().split('T')[0]}`, 'Armada & Peralatan');
  };

  const openEditModal = (item: Equipment) => {
    setIsEditing(true);
    setCurrentId(item.id || null);
    setFormData({
      name: item.name,
      type: item.type,
      category: item.category,
      status: item.status
    });
    setIsModalOpen(true);
  };

  const executeDelete = async (id: string) => {
    if (!confirm('Hapus data alat ini?')) return;
    try {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
      triggerToast('Data alat dihapus');
    } catch (error) {
      console.error('Error deleting equipment:', error);
      triggerToast('Gagal menghapus data alat');
    }
  };


  return (
    <>
      {toast?.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('Heavy')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Heavy' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Truck size={14} /> Alat Berat & Kendaraan
          </button>
          <button 
            onClick={() => setActiveTab('Tool')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Tool' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Wrench size={14} /> Peralatan Pekerja
          </button>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-green-600 rounded-xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button onClick={() => {
            setIsEditing(false);
            setFormData({ name: '', type: '', category: activeTab, status: 'Tersedia' });
            setIsModalOpen(true);
          }} className="flex-1 md:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20"><Plus className="inline mr-2" size={14}/> Tambah Alat</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-blue-400 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${item.category === 'Heavy' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'}`}>
                  {item.category === 'Heavy' ? <Construction size={24} /> : <Wrench size={24} />}
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                  item.status === 'Tersedia' ? 'bg-green-100 text-green-700 border-transparent' : 
                  item.status === 'Perbaikan' ? 'bg-red-100 text-red-700 border-transparent' : 'bg-amber-100 text-amber-700 border-transparent'
                }`}>
                  {item.status}
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{item.name}</h4>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{item.type}</p>
            </div>
            
            <div className="mt-6 flex gap-2 justify-end border-t border-slate-50 dark:border-slate-700 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-blue-600"><Pencil size={14}/></button>
              <button onClick={() => executeDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
             <h3 className="text-lg font-black uppercase mb-6 text-slate-900 dark:text-white">{isEditing ? 'Edit' : 'Tambah'} Alat</h3>
             <form onSubmit={handleSave} className="space-y-4">
                <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Nama Alat/Kendaraan</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 px-4 py-2.5 rounded-xl border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/></div>
                <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Tipe / Jenis</label><input type="text" required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full mt-1 px-4 py-2.5 rounded-xl border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Contoh: Pemadat Aspal"/></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Kategori</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full mt-1 px-4 py-2.5 rounded-xl border-slate-300 dark:border-slate-600 text-[10px] font-black uppercase tracking-tight h-11 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                         <option value="Heavy">Alat Berat & Mobil</option>
                         <option value="Tool">Peralatan Pekerja</option>
                      </select>
                   </div>
                   <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full mt-1 px-4 py-2.5 rounded-xl border-slate-300 dark:border-slate-600 text-[10px] font-black uppercase tracking-tight h-11 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                         <option value="Tersedia">Tersedia</option>
                         <option value="Perbaikan">Rusak / Servis</option>
                      </select>
                   </div>
                </div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Batal</button><button type="submit" className="flex-1 py-3 text-[10px] font-black uppercase bg-blue-600 text-white rounded-xl shadow-lg">Simpan</button></div>
             </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EquipmentInventory;
