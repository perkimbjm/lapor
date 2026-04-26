
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';

import { supabase } from '../../src/supabase';
import { Material, Equipment } from '../../types';
import { 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Package, 
  Truck, 
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle2
  // Fix: Corrected import source from 'lucide-center' to 'lucide-react'
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const Inventory: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Manajemen Stok & Peralatan");
  }, [setPageTitle]);

  const location = useLocation();
  const navigate = useNavigate();

  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'material' | 'alat'>('material');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      const { data, error } = await supabase.from('materials').select('*');
      if (error) {
        console.error("Error fetching materials:", error);
      } else if (data) {
        setMaterials(data as Material[]);
      }
    };

    const fetchEquipment = async () => {
      const { data, error } = await supabase.from('equipment').select('*');
      if (error) {
        console.error("Error fetching equipment:", error);
      } else if (data) {
        setEquipment(data as Equipment[]);
      }
      setLoading(false);
    };

    fetchMaterials();
    fetchEquipment();

    const interval = setInterval(() => {
      fetchMaterials();
      fetchEquipment();
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Toast State
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);

  // Added category to formData to satisfy Equipment type requirements
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    current_stock: 0,
    min_threshold: 0,
    type: '',
    status: 'Tersedia',
    category: 'Heavy' as 'Heavy' | 'Tool'
  });

  useEffect(() => {
    if (location.pathname.includes('/equipment')) {
      setActiveTab('alat');
    } else {
      setActiveTab('material');
    }
  }, [location.pathname]);

  const triggerToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleSelectApiKey = async () => {
    // assume successful selection to mitigate race condition
    await window.aistudio?.openSelectKey();
    setShowApiKeyPrompt(false); 
    generateAiInsight();
  };

  const generateAiInsight = async () => {
    setIsGeneratingAi(true);
    setAiInsight(null);
    setShowApiKeyPrompt(false);

    try {
      // Use optional chaining for aistudio check
      if (!(await window.aistudio?.hasSelectedApiKey())) {
        setShowApiKeyPrompt(true);
        setIsGeneratingAi(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inventoryData = materials.map(m => `${m.name}: ${m.current_stock} ${m.unit} (Min: ${m.min_threshold})`).join(', ');
      
      // Fixed: simplified contents string and using correct model name
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: `Analyze this inventory for a Public Works (PUPR) department: ${inventoryData}. 
            Identify critical items, suggest specific order quantities for 1 month of operations, and give a short professional advice in Indonesian.`,
        config: {
          temperature: 0.7,
          systemInstruction: "You are an AI Logistic Expert for PUPR Banjarmasin. Be concise, professional, and focus on practical road maintenance needs."
        }
      });

      setAiInsight(response.text || "Gagal menghasilkan analisa.");
    } catch (error: any) {
      console.error("AI Error:", error);
      if (error.message && error.message.includes("Requested entity was not found.")) {
        setShowApiKeyPrompt(true);
        setAiInsight("API Key tidak valid atau belum disetel dari proyek berbayar. Silakan pilih kembali.");
      } else {
        setAiInsight("Maaf, sistem AI sedang sibuk. Silakan coba lagi nanti.");
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleTabChange = (tab: 'material' | 'alat') => {
    setActiveTab(tab);
    navigate(tab === 'material' ? '/admin/inventory' : '/admin/equipment');
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: '',
      unit: 'Sak',
      current_stock: 0,
      min_threshold: 0,
      type: 'Alat Berat',
      status: 'Tersedia',
      category: 'Heavy'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setIsEditing(true);
    setCurrentId(item.id);
    
    if (activeTab === 'material') {
      setFormData({
        name: item.name,
        unit: item.unit,
        current_stock: item.current_stock,
        min_threshold: item.min_threshold,
        type: '',
        status: '',
        category: 'Heavy'
      });
    } else {
      setFormData({
        name: item.name,
        unit: '',
        current_stock: 0,
        min_threshold: 0,
        type: item.type,
        status: item.status,
        category: item.category || 'Heavy'
      });
    }
    setIsModalOpen(true);
  };

  const confirmDelete = (item: any) => {
    setItemToDelete({ id: item.id, name: item.name });
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const collectionName = activeTab === 'material' ? 'materials' : 'equipment';
    const typeLabel = activeTab === 'material' ? 'Material' : 'Peralatan';

    try {
      const { error } = await supabase.from(collectionName).delete().eq('id', itemToDelete.id);
      if (error) throw error;
      triggerToast(`${typeLabel} berhasil dihapus`);
    } catch (error) {
      console.error('Error deleting item:', error);
      triggerToast('Gagal menghapus item');
    }
    setItemToDelete(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel = activeTab === 'material' ? 'Material' : 'Peralatan';

    try {
      if (activeTab === 'material') {
        const materialData = {
          name: formData.name,
          unit: formData.unit,
          current_stock: Number(formData.current_stock),
          min_threshold: Number(formData.min_threshold),
          last_updated: new Date().toISOString().split('T')[0]
        };

        if (isEditing && currentId) {
          const { error } = await supabase.from('materials').update(materialData).eq('id', currentId);
          if (error) throw error;
          triggerToast(`${typeLabel} berhasil diperbarui`);
        } else {
          const { error } = await supabase.from('materials').insert([materialData]);
          if (error) throw error;
          triggerToast(`${typeLabel} berhasil ditambahkan`);
        }
      } else {
        const equipmentData = {
          name: formData.name,
          type: formData.type,
          status: formData.status as 'Tersedia' | 'Perbaikan',
          category: formData.category
        };

        if (isEditing && currentId) {
          const { error } = await supabase.from('equipment').update(equipmentData).eq('id', currentId);
          if (error) throw error;
          triggerToast(`${typeLabel} berhasil diperbarui`);
        } else {
          const { error } = await supabase.from('equipment').insert([equipmentData]);
          if (error) throw error;
          triggerToast(`${typeLabel} berhasil ditambahkan`);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving item:', error);
      triggerToast('Gagal menyimpan item');
    }
  };

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) {
      return {
        id: 'critical',
        label: 'STOK HABIS',
        className: 'text-white bg-red-600 dark:bg-red-500 shadow-lg shadow-red-500/30 animate-pulse px-3',
        icon: <AlertCircle className="h-4 w-4 mr-2" />
      };
    }
    if (current <= min) {
      return {
        id: 'warning',
        label: 'KRITIS: SEGERA BELI',
        className: 'text-white bg-orange-600 dark:bg-orange-500 shadow-lg shadow-orange-500/20 px-3',
        icon: <AlertTriangle className="h-4 w-4 mr-2" />
      };
    }
    return null;
  };

  return (
    <>
      
      {/* Toast Notification */}
      {toast?.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* AI Advisor Panel (Only for Material Tab) */}
      {activeTab === 'material' && (
        <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/20 group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
             <Sparkles size={120} />
           </div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                   <Sparkles className="w-6 h-6 text-blue-200" />
                 </div>
                 <h3 className="text-xl font-bold tracking-tight">AI Inventory Advisor</h3>
              </div>
              
              {!aiInsight && !isGeneratingAi && !showApiKeyPrompt ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-blue-100 text-sm max-w-md">Gemini dapat membantu Anda menganalisa kebutuhan pengadaan material berdasarkan stok saat ini.</p>
                  <button 
                    onClick={generateAiInsight}
                    className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center whitespace-nowrap"
                  >
                    Generate Rekomendasi
                  </button>
                </div>
              ) : isGeneratingAi ? (
                <div className="flex flex-col items-center py-4">
                   <Loader2 className="animate-spin w-8 h-8 text-white mb-2" />
                   <p className="text-sm font-medium animate-pulse">Sedang menganalisa stok gudang...</p>
                </div>
              ) : showApiKeyPrompt ? (
                <div className="animate-in fade-in duration-300 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-sm leading-relaxed text-blue-50">
                   <div className="flex items-center gap-3 mb-3 text-yellow-300">
                     <AlertCircle size={20} />
                     <p className="font-bold">API Key Diperlukan</p>
                   </div>
                   <p className="mb-4">Untuk menggunakan fitur AI ini, Anda perlu memilih kunci API berbayar dari proyek Google Cloud Anda. Ini akan memungkinkan akses ke model Gemini.</p>
                   <button 
                     onClick={handleSelectApiKey}
                     className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center whitespace-nowrap"
                   >
                     <ExternalLink className="mr-2 h-4 w-4" /> Pilih Kunci API
                   </button>
                   {aiInsight && <p className="mt-4 text-red-300 text-xs">{aiInsight}</p>}
                 </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-sm leading-relaxed text-blue-50">
                    {aiInsight}
                  </div>
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={generateAiInsight}
                      className="text-xs flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity font-bold uppercase tracking-wider"
                    >
                      <RefreshCw size={12} /> Refresh Analisa
                    </button>
                    <p className="text-[10px] uppercase font-black text-blue-300">Powered by Gemini AI</p>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('material')}
            className={`${
              activeTab === 'material'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors flex items-center`}
          >
            <Package className="w-4 h-4 mr-2" />
            Stok Material
          </button>
          <button
            onClick={() => handleTabChange('alat')}
            className={`${
              activeTab === 'alat'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors flex items-center`}
          >
            <Truck className="w-4 h-4 mr-2" />
            Armada & Peralatan
          </button>
        </nav>
      </div>

      {activeTab === 'material' ? (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in duration-300">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
             <div className="flex items-center gap-3">
               <h3 className="text-lg leading-6 font-bold text-slate-900 dark:text-white">Gudang Material Utama</h3>
               <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full font-bold">
                 {materials.length} Item
               </span>
             </div>
             <button 
               onClick={openAddModal}
               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
             >
               <Plus className="mr-2 h-4 w-4" /> Tambah Stok
             </button>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {materials.length > 0 ? materials.map((item) => {
              const status = getStockStatus(item.current_stock, item.min_threshold);
              const isCritical = item.current_stock <= item.min_threshold;
              
              return (
              <li key={item.id} className={`px-6 py-5 transition-all group border-l-4 ${
                isCritical 
                  ? 'border-red-500 bg-red-50/40 dark:bg-red-900/10' 
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                     <p className={`text-sm font-bold truncate ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {item.name}
                        {isCritical && <span className="ml-2 inline-flex items-center text-[10px] font-black uppercase text-red-600 dark:text-red-500">⚠️ PERLU PENGADAAN</span>}
                     </p>
                     <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                        Satuan: <span className="font-semibold">{item.unit}</span> | Batas Minimum: <span className="font-bold text-slate-700 dark:text-slate-300">{item.min_threshold}</span>
                     </p>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className={`text-3xl font-black tabular-nums ${item.current_stock === 0 ? 'text-red-600 animate-pulse' : isCritical ? 'text-orange-600' : 'text-slate-900 dark:text-white'}`}>
                          {item.current_stock}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-300 font-black uppercase tracking-widest">Sisa Stok</p>
                     </div>
                     
                     {status && (
                        <div className={`hidden lg:flex items-center py-2 rounded-xl font-bold text-[11px] ${status.className}`}>
                           {status.icon}
                           {status.label}
                        </div>
                     )}

                     <div className="flex items-center gap-1 pl-4 border-l border-slate-200 dark:border-slate-700">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all active:scale-90"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(item)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all active:scale-90"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                </div>
              </li>
            )}) : (
              <li className="px-6 py-12 text-center text-slate-500 dark:text-slate-300 italic">Data material kosong.</li>
            )}
          </ul>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in duration-300">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
             <h3 className="text-lg leading-6 font-bold text-slate-900 dark:text-white">Daftar Alat Berat & Kendaraan</h3>
             <button 
               onClick={openAddModal}
               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
             >
               <Plus className="mr-2 h-4 w-4" /> Tambah Alat
             </button>
          </div>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 p-6">
             {equipment.length > 0 ? equipment.map((item) => (
               <div key={item.id} className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all group">
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-300 truncate mt-1">{item.type}</p>
                 </div>
                 
                 <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      item.status === 'Tersedia' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-transparent' : 
                      item.status === 'Perbaikan' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-transparent' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-transparent'
                    }`}>
                      {item.status}
                    </span>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600"><Pencil size={14}/></button>
                        <button onClick={() => confirmDelete(item)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                 </div>
               </div>
             )) : (
               <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-300 italic">Belum ada data peralatan.</div>
             )}
           </div>
        </div>
      )}

      {/* --- UNIVERSAL ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Data' : 'Tambah Data'} {activeTab === 'material' ? 'Material' : 'Alat'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Nama {activeTab === 'material' ? 'Material' : 'Alat/Kendaraan'}
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={activeTab === 'material' ? 'Contoh: Aspal Curah' : 'Contoh: Excavator Mini'}
                />
              </div>

              {activeTab === 'material' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Stok Saat Ini</label>
                    <input 
                      type="number" 
                      required
                      value={formData.current_stock}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData, 
                          current_stock: val,
                          min_threshold: Math.ceil(val * 0.2)
                        });
                      }}
                      className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Satuan</label>
                      <input 
                        type="text" 
                        required
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Kg, Sak, m3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Batas Minimum</label>
                      <input 
                        type="number" 
                        required
                        value={formData.min_threshold}
                        onChange={(e) => setFormData({...formData, min_threshold: Number(e.target.value)})}
                        className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tipe / Jenis</label>
                    <input 
                      type="text" 
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Transport / Alat Berat / Tools"
                    />
                  </div>
                  {/* Fixed: Added Category selector for Equipment */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Kategori Alat</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value as 'Heavy' | 'Tool'})}
                      className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="Heavy">Alat Berat / Kendaraan</option>
                      <option value="Tool">Peralatan Pekerja (Small Tools)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status Ketersediaan</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="Tersedia">Tersedia</option>
                      <option value="Perbaikan">Dalam Perbaikan (Rusak)</option>
                    </select>
                  </div>
                </>
              )}
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors">Batal</button>
                 <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors flex justify-center items-center"><Save className="w-4 h-4 mr-2" /> Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setItemToDelete(null)}></div>
          <div className="relative w-full max-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
             <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                   <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hapus Item Ini?</h3>
                <p className="text-slate-500 dark:text-slate-300 text-sm">Anda akan menghapus <span className="font-bold text-slate-800 dark:text-slate-200">"{itemToDelete.name}"</span>. Tindakan ini tidak dapat dibatalkan.</p>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Batal</button>
                <button onClick={handleDelete} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition-colors flex items-center justify-center"><Trash2 className="w-4 h-4 mr-2" /> Ya, Hapus</button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inventory;
