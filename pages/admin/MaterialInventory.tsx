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
  FileSpreadsheet,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  LayoutGrid,
  List,
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

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    (localStorage.getItem('mat-view') as 'list' | 'grid') ?? 'list'
  );
  const toggleView = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('mat-view', mode);
  };

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
    stockContracted: 0,
    stockIn: 0,
    stockOut: 0,
    minThreshold: 0,
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
    setFormData({ name: '', unit: 'Sak', stockContracted: 0, stockIn: 0, stockOut: 0, minThreshold: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Material) => {
    setIsEditing(true);
    setCurrentId(item.id || null);
    setFormData({
      name: item.name,
      unit: item.unit,
      stockContracted: item.stock_contracted ?? 0,
      stockIn: item.stock_in ?? 0,
      stockOut: item.stock_out ?? 0,
      minThreshold: item.min_threshold,
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
    const stockIn  = Number(formData.stockIn);
    const stockOut = Number(formData.stockOut);
    const materialData = {
      name: formData.name,
      unit: formData.unit,
      stock_contracted: Number(formData.stockContracted),
      stock_in: stockIn,
      stock_out: stockOut,
      current_stock: Math.max(0, stockIn - stockOut),
      min_threshold: Number(formData.minThreshold),
      last_updated: new Date().toISOString().split('T')[0],
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
      triggerToast('Stok berhasil diperbarui');
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
      'Kuantitas Kontrak': m.stock_contracted ?? 0,
      'Stok Datang': m.stock_in ?? 0,
      'Stok Keluar': m.stock_out ?? 0,
      'Sisa Stok': m.current_stock,
      'Batas Minimum': m.min_threshold,
      'Terakhir Update': m.last_updated,
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

      {/* ── Toolbar ── */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Stok Material Konstruksi</h3>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-black">{materials.length} Item</span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-700 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => toggleView('list')}
                title="Tampilan List"
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              ><List size={15}/></button>
              <button
                onClick={() => toggleView('grid')}
                title="Tampilan Grid"
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              ><LayoutGrid size={15}/></button>
            </div>
            <button onClick={handleExportExcel}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-green-600 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5">
              <FileSpreadsheet size={13}/> Excel
            </button>
            {canCreate && (
              <button onClick={openAddModal}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5">
                <Plus size={13}/> Tambah
              </button>
            )}
          </div>
        </div>

        {materials.length === 0 && (
          <p className="px-6 py-14 text-center text-slate-400 dark:text-slate-500 italic text-sm">Belum ada data material.</p>
        )}

        {/* ══ LIST VIEW ══ */}
        {viewMode === 'list' && materials.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {materials.map((item) => {
              const isCritical = item.current_stock <= item.min_threshold;
              const contracted = item.stock_contracted ?? 0;
              const stockIn    = item.stock_in  ?? 0;
              const stockOut   = item.stock_out ?? 0;
              const inPct  = contracted > 0 ? Math.min(100, Math.round((stockIn  / contracted) * 100)) : 0;
              const outPct = stockIn    > 0 ? Math.min(100, Math.round((stockOut / stockIn)    * 100)) : 0;
              return (
                <li key={item.id} className={`px-5 py-4 transition-all group border-l-4 ${
                  isCritical ? 'border-red-500 bg-red-50/40 dark:bg-red-900/10' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className={`text-xs font-black uppercase truncate ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{item.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        Satuan: <span className="text-slate-600 dark:text-slate-300">{item.unit}</span>&ensp;·&ensp;Min. {item.min_threshold} {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isCritical && <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[9px] font-black uppercase"><AlertTriangle size={10}/> Kritis</span>}
                      {canUpdate && <button onClick={() => openEditModal(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"><Pencil size={13}/></button>}
                      {canDelete && <button onClick={() => setItemToDelete({id: item.id, name: item.name})} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"><Trash2 size={13}/></button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1 text-slate-400 mb-1.5"><FileText size={10}/><span className="text-[9px] font-black uppercase tracking-widest">Kontrak</span></div>
                      <p className="text-lg font-black tabular-nums text-slate-700 dark:text-slate-200 leading-none">{contracted.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.unit}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-1 text-blue-500 mb-1.5"><ArrowDownToLine size={10}/><span className="text-[9px] font-black uppercase tracking-widest">Datang</span></div>
                      <p className="text-lg font-black tabular-nums text-blue-700 dark:text-blue-300 leading-none">{stockIn.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all" style={{width:`${inPct}%`}}/></div>
                        <span className="text-[9px] text-blue-400 font-bold">{inPct}%</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                      <div className="flex items-center gap-1 text-amber-500 mb-1.5"><ArrowUpFromLine size={10}/><span className="text-[9px] font-black uppercase tracking-widest">Keluar</span></div>
                      <p className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-300 leading-none">{stockOut.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-amber-100 dark:bg-amber-900 overflow-hidden"><div className="h-full rounded-full bg-amber-500 transition-all" style={{width:`${outPct}%`}}/></div>
                        <span className="text-[9px] text-amber-400 font-bold">{outPct}%</span>
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 border ${item.current_stock === 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : isCritical ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'}`}>
                      <div className={`flex items-center gap-1 mb-1.5 ${item.current_stock === 0 ? 'text-red-500' : isCritical ? 'text-orange-500' : 'text-emerald-500'}`}><Package size={10}/><span className="text-[9px] font-black uppercase tracking-widest">Sisa</span></div>
                      <p className={`text-lg font-black tabular-nums leading-none ${item.current_stock === 0 ? 'text-red-600 dark:text-red-400 animate-pulse' : isCritical ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-300'}`}>{item.current_stock.toLocaleString()}</p>
                      <p className={`text-[10px] mt-0.5 ${item.current_stock === 0 ? 'text-red-400' : isCritical ? 'text-orange-400' : 'text-emerald-500'}`}>{item.unit}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ══ GRID / CARD VIEW ══ */}
        {viewMode === 'grid' && materials.length > 0 && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {materials.map((item) => {
              const isCritical = item.current_stock <= item.min_threshold;
              const isEmpty    = item.current_stock === 0;
              const contracted = item.stock_contracted ?? 0;
              const stockIn    = item.stock_in  ?? 0;
              const stockOut   = item.stock_out ?? 0;

              // SVG ring: sisa / kontrak ratio (fallback to sisa/stockIn)
              const total     = contracted > 0 ? contracted : stockIn > 0 ? stockIn : 1;
              const sisaPct   = Math.min(100, Math.round((item.current_stock / total) * 100));
              const circumference = 2 * Math.PI * 28; // r=28
              const ringOffset    = circumference - (sisaPct / 100) * circumference;
              const ringColor     = isEmpty ? '#ef4444' : isCritical ? '#f97316' : '#10b981';

              const inPct  = contracted > 0 ? Math.min(100, Math.round((stockIn  / contracted) * 100)) : 0;
              const outPct = stockIn    > 0 ? Math.min(100, Math.round((stockOut / stockIn)    * 100)) : 0;

              return (
                <div key={item.id} className={`relative bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group ${
                  isEmpty    ? 'border-red-200 dark:border-red-800' :
                  isCritical ? 'border-orange-200 dark:border-orange-700' :
                               'border-slate-200 dark:border-slate-700'
                }`}>
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${isEmpty ? 'bg-red-500' : isCritical ? 'bg-orange-400' : 'bg-emerald-500'}`}/>

                  {/* Card header */}
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs font-black uppercase leading-tight truncate ${isEmpty ? 'text-red-600 dark:text-red-400' : isCritical ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}>
                        {item.name}
                      </p>
                      <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {item.unit}
                      </span>
                    </div>
                    {(isEmpty || isCritical) && (
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${isEmpty ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                        <AlertTriangle size={9}/>{isEmpty ? 'Habis' : 'Kritis'}
                      </span>
                    )}
                  </div>

                  {/* SVG Ring + Sisa Stok */}
                  <div className="flex flex-col items-center py-3">
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                        {/* Track */}
                        <circle cx="32" cy="32" r="28" fill="none" strokeWidth="5"
                          className="stroke-slate-100 dark:stroke-slate-700"/>
                        {/* Progress */}
                        <circle cx="32" cy="32" r="28" fill="none" strokeWidth="5"
                          stroke={ringColor}
                          strokeLinecap="round"
                          strokeDasharray={`${circumference}`}
                          strokeDashoffset={`${ringOffset}`}
                          style={{transition:'stroke-dashoffset 0.6s ease'}}/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className={`text-xl font-black tabular-nums leading-none ${isEmpty ? 'text-red-600 dark:text-red-400 animate-pulse' : isCritical ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                          {item.current_stock.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Sisa</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${isEmpty ? 'text-red-400' : isCritical ? 'text-orange-400' : 'text-emerald-500'}`}>{sisaPct}%</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Min. {item.min_threshold} {item.unit}</p>
                  </div>

                  {/* Flow stats */}
                  <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                      <FileText size={11} className="mx-auto mb-1 text-slate-400"/>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kontrak</p>
                      <p className="text-sm font-black tabular-nums text-slate-700 dark:text-slate-200">{contracted.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-100 dark:border-blue-800">
                      <ArrowDownToLine size={11} className="mx-auto mb-1 text-blue-400"/>
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Datang</p>
                      <p className="text-sm font-black tabular-nums text-blue-700 dark:text-blue-300">{stockIn.toLocaleString()}</p>
                      <p className="text-[9px] text-blue-400 font-bold">{inPct}%</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-100 dark:border-amber-800">
                      <ArrowUpFromLine size={11} className="mx-auto mb-1 text-amber-400"/>
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Keluar</p>
                      <p className="text-sm font-black tabular-nums text-amber-700 dark:text-amber-300">{stockOut.toLocaleString()}</p>
                      <p className="text-[9px] text-amber-400 font-bold">{outPct}%</p>
                    </div>
                  </div>

                  {/* Progress bar — Datang vs Kontrak */}
                  {contracted > 0 && (
                    <div className="px-4 pb-3">
                      <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        {/* Datang bar */}
                        <div className="absolute h-full rounded-full bg-blue-400 transition-all" style={{width:`${inPct}%`}}/>
                        {/* Keluar overlay */}
                        <div className="absolute h-full rounded-full bg-amber-400/70 transition-all" style={{width:`${Math.round((stockOut/total)*100)}%`}}/>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-slate-400">0</span>
                        <span className="text-[9px] text-slate-400">{contracted.toLocaleString()} {item.unit}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto border-t border-slate-100 dark:border-slate-700 flex">
                    {canUpdate && (
                      <button onClick={() => openEditModal(item)}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                        <Pencil size={12}/> Edit
                      </button>
                    )}
                    {canUpdate && canDelete && <div className="w-px bg-slate-100 dark:bg-slate-700"/>}
                    {canDelete && (
                      <button onClick={() => setItemToDelete({id: item.id, name: item.name})}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <Trash2 size={12}/> Hapus
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}/>
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                  {isEditing ? 'Edit' : 'Tambah'} Material
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Kontrak → Stok Datang → Stok Keluar</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X size={18}/>
              </button>
            </div>

            {/* Scrollable body */}
            <form id="mat-form" onSubmit={handleSave} className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-5 space-y-4">

                {/* Nama + Satuan */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">Nama Material</label>
                    <input type="text" required value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Contoh: Aspal Curah"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">Satuan</label>
                    <input type="text" required value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Sak, Kg…"/>
                  </div>
                </div>

                {/* Section 1 – Kontrak */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    <FileText size={13} className="text-slate-500"/>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Material Saat Kontrak</span>
                    <span className="text-[9px] text-slate-400 ml-1">— volume sesuai SPK</span>
                  </div>
                  <div className="px-4 py-3">
                    <input type="number" min={0} required value={formData.stockContracted}
                      onChange={e => setFormData({...formData, stockContracted: Number(e.target.value)})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-lg font-black bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-slate-400"/>
                    <p className="text-[10px] text-slate-400 mt-1.5">Jumlah material yang tertera dalam kontrak pengadaan</p>
                  </div>
                </div>

                {/* Section 2 – Stok Datang */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                    <ArrowDownToLine size={13} className="text-blue-500"/>
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Stok Datang</span>
                    <span className="text-[9px] text-blue-400 ml-1">— total diterima di gudang</span>
                  </div>
                  <div className="px-4 py-3">
                    <input type="number" min={0} required value={formData.stockIn}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setFormData({...formData, stockIn: val,
                          minThreshold: formData.minThreshold || Math.ceil(val * 0.15)});
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 text-lg font-black bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-200 outline-none focus:ring-2 focus:ring-blue-500"/>
                    <p className="text-[10px] text-blue-400 mt-1.5">Kumulatif material yang sudah diterima masuk gudang</p>
                  </div>
                </div>

                {/* Section 3 – Stok Keluar */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
                    <ArrowUpFromLine size={13} className="text-amber-500"/>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">Stok Keluar</span>
                    <span className="text-[9px] text-amber-400 ml-1">— total digunakan / dikirim</span>
                  </div>
                  <div className="px-4 py-3">
                    <input type="number" min={0} required value={formData.stockOut}
                      onChange={e => setFormData({...formData, stockOut: Number(e.target.value)})}
                      className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 text-lg font-black bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-500"/>
                    <p className="text-[10px] text-amber-400 mt-1.5">Kumulatif material yang sudah keluar / dipakai di lapangan</p>
                  </div>
                </div>

                {/* Preview sisa stok */}
                {(() => {
                  const sisa = Math.max(0, formData.stockIn - formData.stockOut);
                  const isCrit = sisa <= formData.minThreshold && formData.stockIn > 0;
                  return (
                    <div className={`rounded-xl p-4 border flex items-center gap-4 ${
                      isCrit ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                             : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <div className="flex-1">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isCrit ? 'text-red-400' : 'text-emerald-500'}`}>Sisa Stok (otomatis)</p>
                        <p className={`text-3xl font-black tabular-nums mt-0.5 ${isCrit ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                          {sisa.toLocaleString()}
                          <span className="text-base font-semibold ml-1.5 opacity-60">{formData.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Batas Minimum</p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <input type="number" min={0} value={formData.minThreshold}
                            onChange={e => setFormData({...formData, minThreshold: Number(e.target.value)})}
                            className="w-20 text-right rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"/>
                          <span className="text-[10px] text-slate-400">{formData.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </form>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Batal
              </button>
              <button type="submit" form="mat-form"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors flex items-center justify-center gap-2">
                <Save size={14}/> Simpan
              </button>
            </div>

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
