import { useOutletContext } from 'react-router-dom';

import React, { useState, useEffect } from 'react';

import { Material } from '../../types';
import { supabase } from '../../src/supabase';
import { useSupabaseQuery } from '../../src/hooks';
import { logAuditActivity, AuditAction } from '../../src/lib/auditLogger';
import { 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Package, 
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../../components/AuthContext';

const MaterialInventory: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('INVENTORY_CREATE');
  const canUpdate = hasPermission('INVENTORY_UPDATE');
  const canDelete = hasPermission('INVENTORY_DELETE');

  useEffect(() => {
    setPageTitle("Manajemen Stok Material");
  }, [setPageTitle]);

  const { data: materials, refetch: refetchMaterials } = useSupabaseQuery<Material>({
    table: 'materials',
    realtimeMode: 'realtime',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    currentStock: 0,
    minThreshold: 0
  });

  const triggerToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(null), 3000);
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
      // Fixed: Optional chaining for aistudio call
      if (!(await window.aistudio?.hasSelectedApiKey())) {
        setShowApiKeyPrompt(true);
        setIsGeneratingAi(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inventoryData = materials.map(m => `${m.name}: ${m.current_stock} ${m.unit} (Min: ${m.min_threshold})`).join(', ');
      
      // Fixed: Using simplified contents string according to guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this PUPR inventory: ${inventoryData}. Identify critical items and suggest specific order quantities in Indonesian.`,
        config: {
          temperature: 0.7,
          systemInstruction: "You are an AI Logistic Expert for PUPR Banjarmasin. Be concise and professional."
        }
      });

      setAiInsight(response.text || "Gagal menghasilkan analisa.");
    } catch (error: unknown) {
      console.error("AI Error:", error);
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes("Requested entity")) {
        setShowApiKeyPrompt(true);
      } else {
        setAiInsight("Sistem AI sedang sibuk.");
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: '', unit: 'Sak', currentStock: 0, minThreshold: 10 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Material) => {
    setIsEditing(true);
    setCurrentId(item.id || null);
    setFormData({
      name: item.name,
      unit: item.unit,
      currentStock: item.current_stock,
      minThreshold: item.min_threshold
    });
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('materials').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      
      await logAuditActivity(AuditAction.DELETE, 'Stok Material', `Menghapus material ${itemToDelete.name}`);
      
      triggerToast(`Material berhasil dihapus`);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting material:', error);
      triggerToast('Gagal menghapus material');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const materialData = {
      name: formData.name,
      unit: formData.unit,
      current_stock: Number(formData.currentStock),
      min_threshold: Number(formData.minThreshold),
      last_updated: new Date().toISOString().split('T')[0]
    };
    
    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from('materials').update(materialData).eq('id', currentId);
        if (error) throw error;
        await logAuditActivity(AuditAction.UPDATE, 'Stok Material', `Memperbarui material ${materialData.name}`);
      } else {
        const { error } = await supabase.from('materials').insert([materialData]);
        if (error) throw error;
        await logAuditActivity(AuditAction.CREATE, 'Stok Material', `Menambahkan material ${materialData.name}`);
      }
      triggerToast(`Stok berhasil diperbarui`);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving material:', error);
      triggerToast('Gagal menyimpan material');
    }
  };

  const handleExportExcel = () => {
    const dataToExport = materials.map(m => ({
      'Nama Material': m.name,
      'Satuan': m.unit,
      'Stok Saat Ini': m.current_stock,
      'Ambang Batas': m.min_threshold,
      'Terakhir Update': m.last_updated
    }));

    exportToExcel(dataToExport, `Stok_Material_${new Date().toISOString().split('T')[0]}`, 'Stok Material');
  };


  return (
    <>
      {toast?.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* AI Advisor Panel */}
      <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><Sparkles size={100} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Sparkles size={24} /></div>
            <h3 className="text-xl font-black uppercase tracking-tight">AI Stock Analyst</h3>
          </div>
          {!aiInsight && !isGeneratingAi && !showApiKeyPrompt ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest max-w-md">Gemini membantu menganalisa kebutuhan pengadaan material.</p>
              <button onClick={generateAiInsight} className="bg-white text-blue-700 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Generate Analisa</button>
            </div>
          ) : isGeneratingAi ? (
            <div className="flex flex-col items-center py-4"><Loader2 className="animate-spin w-8 h-8 mb-2" /><p className="text-[10px] font-black uppercase animate-pulse">Menganalisa gudang...</p></div>
          ) : showApiKeyPrompt ? (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-blue-50 border border-white/20">
              <p className="text-xs font-bold mb-3">Pilih Kunci API Berbayar untuk menggunakan fitur AI.</p>
              <button onClick={handleSelectApiKey} className="bg-white text-blue-700 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"><ExternalLink className="inline mr-2" size={12}/> Pilih API Key</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-sm leading-relaxed border border-white/20">{aiInsight}</div>
              <button onClick={generateAiInsight} className="text-[10px] flex items-center gap-1.5 opacity-70 hover:opacity-100 font-black uppercase tracking-widest transition-opacity"><RefreshCw size={12} /> Segarkan Analisa</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
           <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Stok Material Konstruksi</h3>
           <div className="flex gap-3">
             <button 
               onClick={handleExportExcel}
               className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-green-600 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
             >
               <FileSpreadsheet size={14} /> Export Excel
             </button>
             {canCreate && (
               <button onClick={openAddModal} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2">
                 <Plus size={14}/> Tambah Stok
               </button>
             )}
           </div>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {materials.map((item) => {
            const isCritical = item.current_stock <= item.min_threshold;
            return (
              <li key={item.id} className={`px-6 py-5 transition-all group ${isCritical ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`text-xs font-black uppercase ${isCritical ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{item.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-200 font-bold uppercase mt-1">Min: {item.min_threshold} {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                       <p className={`text-2xl font-black ${item.current_stock === 0 ? 'text-red-600 animate-pulse' : isCritical ? 'text-orange-600' : 'text-slate-900 dark:text-white'}`}>{item.current_stock}</p>
                       <p className="text-[9px] text-slate-400 dark:text-slate-200 font-black uppercase tracking-widest">{item.unit}</p>
                    </div>
                    <div className="flex gap-2">
                       {canUpdate && (
                         <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14}/></button>
                       )}
                       {canDelete && (
                         <button onClick={() => setItemToDelete({id: item.id, name: item.name})} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                       )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
             <h3 className="text-lg font-black uppercase mb-6 text-slate-900 dark:text-white">{isEditing ? 'Edit' : 'Tambah'} Material</h3>
             <form onSubmit={handleSave} className="p-8 space-y-4">
                <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Nama Material</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Stok</label><input type="number" required value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})} className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/></div>
                  <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Satuan</label><input type="text" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/></div>
                </div>
                {/* Fix: Bind input to minThreshold instead of currentStock */}
                <div><label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase">Batas Minimum</label><input type="number" required value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: Number(e.target.value)})} className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Batal</button><button type="submit" className="flex-1 py-3 text-[10px] font-black uppercase bg-blue-600 text-white rounded-xl shadow-lg">Simpan</button></div>
             </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setItemToDelete(null)}></div>
          <div className="relative w-full max-sm bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
             <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white mb-4">Hapus Material?</h3>
             <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">Anda akan menghapus material "{itemToDelete.name}".</p>
             <div className="flex gap-3"><button onClick={() => setItemToDelete(null)} className="flex-1 py-3 text-[10px] font-black uppercase">Batal</button><button onClick={executeDelete} className="flex-1 py-3 text-[10px] font-black uppercase bg-red-600 text-white rounded-xl">Hapus</button></div>
          </div>
        </div>
      )}
    </>
  );
};

export default MaterialInventory;
