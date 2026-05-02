import { useOutletContext } from 'react-router-dom';

import React, { useState, useEffect } from 'react';

import { supabase } from '../../src/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, 
  Wallet, 
  FileSpreadsheet, 
  PieChart as PieChartIcon, 
  ShoppingCart, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Loader2,
  BrainCircuit,
  AlertCircle,
  FileText,
  Clock,
  CalendarDays,
  Download,
  Eye,
  X,
  Plus,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';
import { COST_BY_CATEGORY, CHART_COLORS, formatRupiah } from '../../constants';
import { GoogleGenAI } from "@google/genai";
import { toast } from 'sonner';

const COLORS = CHART_COLORS.GENERAL;

const Reports: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Laporan & Keuangan");
  }, [setPageTitle]);

  const [activeTab, setActiveTab] = useState<'grafik' | 'komitmen' | 'epurchasing' | 'biaya'>('komitmen');
  const [fiscalAnalysis, setFiscalAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [selectedEPDetail, setSelectedEPDetail] = useState<any>(null);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [epurchasing, setEpurchasing] = useState<any[]>([]);
  const [costReports, setCostReports] = useState<any[]>([]);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [isEPurchasingModalOpen, setIsEPurchasingModalOpen] = useState(false);
  const [isCostReportModalOpen, setIsCostReportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [commitmentForm, setCommitmentForm] = useState({
    name: '',
    vendor: '',
    pagu: 0,
    commitment: 0
  });
  const [commitmentError, setCommitmentError] = useState<string | null>(null);

  const [epurchasingForm, setEpurchasingForm] = useState({
    noKontrak: '',
    namaPekerjaan: '',
    nilai: 0,
    waktuPelaksanaan: '',
    tglKontrak: '',
    tglBerakhir: '',
    status: 'Draft'
  });

  const [costReportForm, setCostReportForm] = useState({
    month: new Date().toISOString().substring(0, 7),
    category: 'Material',
    estimasi: 0,
    realisasi: 0,
    description: ''
  });

  useEffect(() => {
    const fetchCommitments = async () => {
      const { data, error } = await supabase.from('commitments').select('*');
      if (error) console.error("Error fetching commitments:", error);
      else if (data) setCommitments(data);
    };

    const fetchEpurchasing = async () => {
      const { data, error } = await supabase.from('epurchasing').select('*');
      if (error) console.error("Error fetching epurchasing:", error);
      else if (data) setEpurchasing(data);
    };

    const fetchCostReports = async () => {
      const { data, error } = await supabase.from('cost_reports').select('*');
      if (error) console.error("Error fetching cost reports:", error);
      else if (data) setCostReports(data);
    };

    fetchCommitments();
    fetchEpurchasing();
    fetchCostReports();

    const interval = setInterval(() => {
      fetchCommitments();
      fetchEpurchasing();
      fetchCostReports();
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const totalPagu = commitments.reduce((acc, curr) => acc + (curr.pagu || 0), 0);
  const totalKomitmen = commitments.reduce((acc, curr) => acc + (curr.commitment || 0), 0);
  const sisaTotal = totalPagu - totalKomitmen;


  const handleSelectApiKey = async () => {
    await window.aistudio?.openSelectKey();
    setShowApiKeyPrompt(false); 
    runFiscalAudit();
  };

  const runFiscalAudit = async () => {
    setIsAnalyzing(true);
    setFiscalAnalysis(null);
    setShowApiKeyPrompt(false);

    try {
      if (!(await window.aistudio?.hasSelectedApiKey())) {
        setShowApiKeyPrompt(true);
        setIsAnalyzing(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const financialContext = commitments.map(d => `${d.name}: Pagu ${d.pagu}, Terkontrak ${d.commitment}`).join('; ');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analisa keuangan proyek PUPR berikut: ${financialContext}. Identifikasi risiko penyerapan rendah dan berikan saran optimasi sisa anggaran Rp ${sisaTotal.toLocaleString('id-ID')}. Gunakan Bahasa Indonesia profesional.`,
        config: {
          temperature: 0.5,
          systemInstruction: "Anda adalah Kepala Bagian Keuangan UPT PJJ Banjarmasin. Analisa Anda harus tajam, berbasis data, dan fokus pada efisiensi anggaran negara."
        }
      });

      setFiscalAnalysis(response.text || "Gagal melakukan audit otomatis.");
    } catch (error: any) {
      console.error("AI Financial Error:", error);
      setFiscalAnalysis("Gagal terhubung ke modul Audit AI. Periksa koneksi atau API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportExcel = () => {
    let dataToExport: any[] = [];
    let sheetName = "";

    if (activeTab === 'komitmen') {
      sheetName = "Buku Komitmen";
      dataToExport = commitments.map(c => ({
        'ID Paket': c.id,
        'Pekerjaan': c.name,
        'Vendor': c.vendor,
        'Pagu': c.pagu,
        'Nilai Kontrak': c.commitment,
        'Serapan (%)': ((c.commitment / c.pagu) * 100).toFixed(2)
      }));
    } else if (activeTab === 'epurchasing') {
      sheetName = "E-Purchasing";
      dataToExport = epurchasing.map(e => ({
        'ID Transaksi': e.id,
        'Item': e.item,
        'Vendor': e.vendor,
        'Tanggal': e.date,
        'Total Harga': e.totalPrice,
        'Status': e.status
      }));
    } else {
      sheetName = "Laporan Biaya";
      dataToExport = costReports.map(cr => ({
        'ID Laporan': cr.id,
        'Kategori': cr.category,
        'Bulan': cr.month,
        'Total Biaya': cr.totalCost,
        'Keterangan': cr.description
      }));
    }

    exportToExcel(dataToExport, `${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`, sheetName);
  };

  const handleOpenEPDetail = (item: any) => {
    setSelectedEPDetail(item);
  };

  const handleAddCommitment = () => {
    setEditingItem(null);
    setCommitmentForm({ name: '', vendor: '', pagu: 0, commitment: 0 });
    setCommitmentError(null);
    setSelectedFile(null);
    setUploadProgress(null);
    setIsCommitmentModalOpen(true);
  };

  const handleEditCommitment = (item: any) => {
    setEditingItem(item);
    setCommitmentForm({
      name: item.name,
      vendor: item.vendor,
      pagu: item.pagu,
      commitment: item.commitment
    });
    setCommitmentError(null);
    setSelectedFile(null);
    setUploadProgress(null);
    setIsCommitmentModalOpen(true);
  };

  const handleDeleteCommitment = async (id: string) => {
    if (!window.confirm('Hapus komitmen ini?')) return;
    try {
      const { error } = await supabase.from('commitments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Komitmen berhasil dihapus');
    } catch (error) {
      console.error('Error deleting commitment:', error);
      toast.error('Gagal menghapus komitmen');
    }
  };

  const handleCommitmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commitmentForm.pagu > 0 && commitmentForm.commitment > commitmentForm.pagu) {
      setCommitmentError(`Nilai Kontrak tidak boleh melebihi Pagu (${formatRupiah(commitmentForm.pagu)})`);
      return;
    }
    setIsSubmitting(true);

    try {
      if (editingItem) {
        const { error } = await supabase.from('commitments').update({
          ...commitmentForm,
          updated_at: new Date().toISOString()
        }).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('commitments').insert([{
          ...commitmentForm,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      }
      setIsCommitmentModalOpen(false);
      toast.success(editingItem ? 'Komitmen berhasil diperbarui' : 'Komitmen berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving commitment:', error);
      toast.error('Gagal menyimpan komitmen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEPurchasing = () => {
    setEditingItem(null);
    setEpurchasingForm({
      noKontrak: '',
      namaPekerjaan: '',
      nilai: 0,
      waktuPelaksanaan: '',
      tglKontrak: '',
      tglBerakhir: '',
      status: 'Draft'
    });
    setSelectedFile(null);
    setUploadProgress(null);
    setIsEPurchasingModalOpen(true);
  };

  const handleEditEPurchasing = (item: any) => {
    setEditingItem(item);
    setEpurchasingForm({
      noKontrak: item.noKontrak,
      namaPekerjaan: item.namaPekerjaan,
      nilai: item.nilai,
      waktuPelaksanaan: item.waktuPelaksanaan,
      tglKontrak: item.tglKontrak,
      tglBerakhir: item.tglBerakhir,
      status: item.status
    });
    setSelectedFile(null);
    setUploadProgress(null);
    setIsEPurchasingModalOpen(true);
  };

  const handleDeleteEPurchasing = async (id: string) => {
    if (!window.confirm('Hapus data e-purchasing ini?')) return;
    try {
      const { error } = await supabase.from('epurchasing').delete().eq('id', id);
      if (error) throw error;
      toast.success('Data e-purchasing berhasil dihapus');
    } catch (error) {
      console.error('Error deleting epurchasing:', error);
      toast.error('Gagal menghapus data e-purchasing');
    }
  };

  const handleEPurchasingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let documentUrl = editingItem?.documentUrl || null;

      if (selectedFile) {
        const filePath = `epurchasing/${Date.now()}_${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
        setUploadProgress(100);

        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath);
        
        documentUrl = publicUrl;
      }

      if (editingItem) {
        const { error } = await supabase.from('epurchasing').update({
          ...epurchasingForm,
          documentUrl,
          updated_at: new Date().toISOString()
        }).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('epurchasing').insert([{
          ...epurchasingForm,
          documentUrl,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      }
      setIsEPurchasingModalOpen(false);
      setSelectedFile(null);
      setUploadProgress(null);
      toast.success(editingItem ? 'Data e-purchasing berhasil diperbarui' : 'Data e-purchasing berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving epurchasing:', error);
      toast.error('Gagal menyimpan data e-purchasing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCostReport = () => {
    setEditingItem(null);
    setCostReportForm({
      month: new Date().toISOString().substring(0, 7),
      category: 'Material',
      estimasi: 0,
      realisasi: 0,
      description: ''
    });
    setIsCostReportModalOpen(true);
  };

  const handleEditCostReport = (item: any) => {
    setEditingItem(item);
    setCostReportForm({
      month: item.month,
      category: item.category,
      estimasi: item.estimasi,
      realisasi: item.realisasi,
      description: item.description || ''
    });
    setIsCostReportModalOpen(true);
  };

  const handleDeleteCostReport = async (id: string) => {
    if (!window.confirm('Hapus laporan biaya ini?')) return;
    try {
      const { error } = await supabase.from('cost_reports').delete().eq('id', id);
      if (error) throw error;
      toast.success('Laporan biaya berhasil dihapus');
    } catch (error) {
      console.error('Error deleting cost report:', error);
      toast.error('Gagal menghapus laporan biaya');
    }
  };

  const handleCostReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase.from('cost_reports').update({
          ...costReportForm,
          updated_at: new Date().toISOString()
        }).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cost_reports').insert([{
          ...costReportForm,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      }
      setIsCostReportModalOpen(false);
      toast.success(editingItem ? 'Laporan biaya berhasil diperbarui' : 'Laporan biaya berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving cost report:', error);
      toast.error('Gagal menyimpan laporan biaya');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectoralAllocation = React.useMemo(() => {
    const allocation: Record<string, number> = {};
    costReports.forEach(report => {
      const cat = report.category || 'Lainnya';
      allocation[cat] = (allocation[cat] || 0) + (report.realisasi || 0);
    });
    return Object.entries(allocation).map(([name, value]) => ({ name, value }));
  }, [costReports]);

  const monthlyTrend = React.useMemo(() => {
    const trend: Record<string, { month: string, estimasi: number, realisasi: number }> = {};
    costReports.forEach(report => {
      const m = report.month;
      if (!trend[m]) {
        trend[m] = { month: m, estimasi: 0, realisasi: 0 };
      }
      trend[m].estimasi += (report.estimasi || 0);
      trend[m].realisasi += (report.realisasi || 0);
    });
    return Object.values(trend).sort((a, b) => a.month.localeCompare(b.month));
  }, [costReports]);

  return (
    <>
      
      {/* AI Fiscal Advisor */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
         <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <BrainCircuit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">AI Fiscal Analyst</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Audit anggaran otomatis berbasis Gemini AI.</p>
               </div>
            </div>
            {!fiscalAnalysis && !isAnalyzing && !showApiKeyPrompt ? (
              <button 
                onClick={runFiscalAudit}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                 <Sparkles size={14} /> Jalankan Audit AI
              </button>
            ) : isAnalyzing ? (
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
                 <Loader2 className="w-4 h-4 animate-spin" /> Menganalisa...
              </div>
            ) : showApiKeyPrompt ? (
              <button 
                onClick={handleSelectApiKey}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
              >
                Pilih API Key
              </button>
            ) : (
              <button onClick={() => setFiscalAnalysis(null)} className="text-xs font-black text-slate-400 dark:text-slate-300 hover:text-slate-600 uppercase tracking-widest">Tutup</button>
            )}
         </div>
         {fiscalAnalysis && (
           <div className="p-6 bg-blue-50/30 dark:bg-blue-900/10 border-b border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4 duration-300">
              <div className="flex gap-4 items-start">
                 <div className="shrink-0 mt-1"><CheckCircle2 className="text-green-600 w-5 h-5" /></div>
                 <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line text-sm leading-relaxed">{fiscalAnalysis}</div>
              </div>
           </div>
         )}
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 inline-flex w-full md:w-auto overflow-x-auto gap-2">
        {[
          { id: 'komitmen', label: 'Buku Komitmen', icon: Wallet },
          { id: 'epurchasing', label: 'E-Purchasing & LKPP', icon: ShoppingCart },
          { id: 'biaya', label: 'Laporan Biaya', icon: FileSpreadsheet },
          { id: 'grafik', label: 'Analisa Grafik', icon: PieChartIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: BUKU KOMITMEN ================= */}
      {activeTab === 'komitmen' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Pagu Kegiatan</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatRupiah(totalPagu)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Terkontrak</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatRupiah(totalKomitmen)}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Sisa Anggaran</p>
                <p className={`text-2xl font-black ${sisaTotal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatRupiah(sisaTotal)}</p>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Daftar Komitmen Kontrak</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={handleAddCommitment}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus size={14} /> Tambah Komitmen
                  </button>
                  <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20"
                  >
                    <FileSpreadsheet size={14} /> Export Excel
                  </button>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-900/30">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">ID Paket</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Pekerjaan</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-right">Pagu</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-right">Nilai Kontrak</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Serapan</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Aksi</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                       {commitments.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                           <td className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-300">{item.id}</td>
                           <td className="px-6 py-4">
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{item.name}</p>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 mt-0.5">{item.vendor}</p>
                           </td>
                           <td className="px-6 py-4 text-right text-xs font-bold text-slate-900 dark:text-white">{formatRupiah(item.pagu)}</td>
                           <td className="px-6 py-4 text-right text-xs font-bold text-blue-600 dark:text-blue-400">{formatRupiah(item.commitment)}</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2 justify-center">
                                 <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(item.commitment/item.pagu)*100}%` }}></div>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-500 dark:text-slate-300">{((item.commitment/item.pagu)*100).toFixed(0)}%</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                 <button 
                                    onClick={() => handleEditCommitment(item)}
                                    className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    title="Edit"
                                 >
                                    <Edit2 size={14} />
                                 </button>
                                 <button 
                                    onClick={() => handleDeleteCommitment(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    title="Hapus"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: E-PURCHASING ================= */}
      {activeTab === 'epurchasing' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
              <ShoppingCart className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform" />
              <div className="relative z-10">
                 <h2 className="text-xl font-black uppercase tracking-tight">Katalog Elektronik (E-Purchasing)</h2>
                 <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-2">Realisasi Pengadaan Melalui LKPP Tahun Anggaran 2024</p>
                 <div className="mt-6 flex flex-wrap gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                       <p className="text-[9px] font-black uppercase text-indigo-200 mb-1">Total Transaksi</p>
                       <p className="text-lg font-black">{epurchasing.length} Paket</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                       <p className="text-[9px] font-black uppercase text-indigo-200 mb-1">Akumulasi Nilai</p>
                       <p className="text-lg font-black">{formatRupiah(epurchasing.reduce((acc, c) => acc + (c.nilai || 0), 0))}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                    <FileText size={16} /> Riwayat Transaksi E-Purchasing
                 </h4>
                 <div className="flex gap-2">
                    <button 
                      onClick={handleAddEPurchasing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Plus size={14} /> Tambah Transaksi
                    </button>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-95 transition-all">
                       <Download size={14} /> Export Table
                    </button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[1200px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/30">
                       <tr>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">ID</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Nomor Kontrak</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Nama Pekerjaan</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-right">Nilai</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Waktu Pelaksanaan</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Tanggal Kontrak</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Tanggal Berakhir</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Status</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Aksi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                       {epurchasing.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                             <td className="px-6 py-5 text-xs font-bold text-slate-400">{item.id}</td>
                             <td className="px-6 py-5">
                                <span className="text-xs font-black text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">{item.noKontrak}</span>
                             </td>
                             <td className="px-6 py-5 max-w-[300px]">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{item.namaPekerjaan}</p>
                             </td>
                             <td className="px-6 py-5 text-right text-xs font-black text-slate-900 dark:text-white tabular-nums">
                                {formatRupiah(item.nilai)}
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex flex-col items-center">
                                   <Clock size={12} className="text-slate-400 dark:text-slate-300 mb-1" />
                                   <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">{item.waktuPelaksanaan}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex flex-col items-center">
                                   <CalendarDays size={12} className="text-blue-500 mb-1" />
                                   <span className="text-[10px] font-black text-slate-800 dark:text-white">{item.tglKontrak}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex flex-col items-center">
                                   <CalendarDays size={12} className="text-red-500 mb-1" />
                                   <span className="text-[10px] font-black text-slate-800 dark:text-white">{item.tglBerakhir}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                   item.status === 'Selesai' ? 'bg-green-100 text-green-700 dark:bg-green-900/40' :
                                   item.status === 'Draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700' :
                                   'bg-blue-100 text-blue-700 dark:bg-blue-900/40'
                                }`}>
                                   {item.status}
                                </span>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                   <button 
                                      onClick={() => handleOpenEPDetail(item)}
                                      className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                      title="Lihat Detail"
                                   >
                                      <Eye size={14} />
                                   </button>
                                   {item.documentUrl && (
                                     <button 
                                        onClick={() => window.open(item.documentUrl, '_blank')}
                                        className="p-2 text-slate-400 hover:text-emerald-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                        title="Download Dokumen"
                                     >
                                        <Download size={14} />
                                     </button>
                                   )}
                                   <button 
                                      onClick={() => handleEditEPurchasing(item)}
                                      className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                      title="Edit"
                                   >
                                      <Edit2 size={14} />
                                   </button>
                                   <button 
                                      onClick={() => handleDeleteEPurchasing(item.id)}
                                      className="p-2 text-slate-400 hover:text-red-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                      title="Hapus"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                   <button 
                                      onClick={() => window.open('https://e-katalog.lkpp.go.id/', '_blank')}
                                      className="p-2 text-slate-400 hover:text-emerald-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                      title="Buka LKPP"
                                   >
                                      <ExternalLink size={14} />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* ================= TAB 3: LAPORAN BIAYA ================= */}
      {activeTab === 'biaya' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Daftar Laporan Biaya Bulanan</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={handleAddCostReport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus size={14} /> Tambah Laporan
                  </button>
                  <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20"
                  >
                    <FileSpreadsheet size={14} /> Export Excel
                  </button>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-900/30">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Bulan</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">Kategori</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-right">Estimasi (Pagu)</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-right">Realisasi</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 text-center">Aksi</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                       {costReports.sort((a,b) => b.month.localeCompare(a.month)).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                           <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white uppercase">{item.month}</td>
                           <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black uppercase tracking-widest">{item.category}</span>
                           </td>
                           <td className="px-6 py-4 text-right text-xs font-bold text-slate-900 dark:text-white">{formatRupiah(item.estimasi)}</td>
                           <td className="px-6 py-4 text-right text-xs font-bold text-blue-600 dark:text-blue-400">{formatRupiah(item.realisasi)}</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                 <button 
                                    onClick={() => handleEditCostReport(item)}
                                    className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    title="Edit"
                                 >
                                    <Edit2 size={14} />
                                 </button>
                                 <button 
                                    onClick={() => handleDeleteCostReport(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    title="Hapus"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: GRAFIK ANALISA ================= */}
      {activeTab === 'grafik' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Realisasi vs Anggaran Bulanan</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} />
                    <XAxis dataKey="month" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip 
                      formatter={(value: any) => formatRupiah(Number(value))}
                      contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'}} />
                    <Bar dataKey="estimasi" name="Pagu" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realisasi" name="Realisasi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Alokasi Belanja Sektoral</h3>
              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={sectoralAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {sectoralAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                    <Legend wrapperStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Report Modal */}
      {isCostReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCostReportModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingItem ? 'Edit Laporan Biaya' : 'Tambah Laporan Biaya'}
              </h3>
              <button onClick={() => setIsCostReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCostReportSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Bulan (YYYY-MM)</label>
                  <input 
                    type="month"
                    required
                    value={costReportForm.month}
                    onChange={(e) => setCostReportForm({...costReportForm, month: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Kategori</label>
                  <select 
                    required
                    value={costReportForm.category}
                    onChange={(e) => setCostReportForm({...costReportForm, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Material">Material</option>
                    <option value="Upah Kerja">Upah Kerja</option>
                    <option value="BBM & Transport">BBM & Transport</option>
                    <option value="Alat Berat">Alat Berat</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Estimasi (Pagu)</label>
                  <input 
                    type="number"
                    required
                    value={costReportForm.estimasi}
                    onChange={(e) => setCostReportForm({...costReportForm, estimasi: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Realisasi</label>
                  <input 
                    type="number"
                    required
                    value={costReportForm.realisasi}
                    onChange={(e) => setCostReportForm({...costReportForm, realisasi: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Keterangan</label>
                <textarea 
                  value={costReportForm.description}
                  onChange={(e) => setCostReportForm({...costReportForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  placeholder="Opsional..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCostReportModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal for E-Purchasing */}
      {selectedEPDetail && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEPDetail(null)}></div>
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Detail Paket E-Purchasing</h3>
                  <button onClick={() => setSelectedEPDetail(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                     <div>
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">ID Paket</p>
                        <p className="font-black text-slate-900 dark:text-white">{selectedEPDetail.id}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Status</p>
                        <p className="font-black text-blue-600 dark:text-blue-400">{selectedEPDetail.status}</p>
                     </div>
                     <div className="col-span-2">
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Nomor Kontrak</p>
                        <p className="font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">{selectedEPDetail.noKontrak}</p>
                     </div>
                     <div className="col-span-2">
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Nama Pekerjaan</p>
                        <p className="font-black text-slate-900 dark:text-white leading-relaxed">{selectedEPDetail.namaPekerjaan}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Nilai Transaksi</p>
                        <p className="font-black text-emerald-600 text-lg">{formatRupiah(selectedEPDetail.nilai)}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Waktu Pelaksanaan</p>
                        <p className="font-black text-slate-900 dark:text-white">{selectedEPDetail.waktuPelaksanaan}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Tanggal Kontrak</p>
                        <p className="font-black text-slate-900 dark:text-white">{selectedEPDetail.tglKontrak}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 dark:text-slate-300 font-bold uppercase mb-1">Tanggal Berakhir</p>
                        <p className="font-black text-slate-900 dark:text-white">{selectedEPDetail.tglBerakhir}</p>
                     </div>
                  </div>
               </div>
               <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                  <button onClick={() => setSelectedEPDetail(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Tutup</button>
               </div>
            </div>
         </div>
      )}
      {/* Commitment Modal */}
      {isCommitmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCommitmentModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingItem ? 'Edit Komitmen' : 'Tambah Komitmen'}
              </h3>
              <button onClick={() => setIsCommitmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCommitmentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nama Pekerjaan</label>
                <input 
                  type="text" 
                  required
                  value={commitmentForm.name}
                  onChange={e => setCommitmentForm({...commitmentForm, name: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Vendor / Pelaksana</label>
                <input 
                  type="text" 
                  required
                  value={commitmentForm.vendor}
                  onChange={e => setCommitmentForm({...commitmentForm, vendor: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Pagu (Rp)</label>
                  <input
                    type="number"
                    required
                    value={commitmentForm.pagu}
                    onChange={e => {
                      const pagu = Number(e.target.value);
                      setCommitmentForm({...commitmentForm, pagu});
                      if (pagu > 0 && commitmentForm.commitment > pagu) {
                        setCommitmentError(`Nilai Kontrak tidak boleh melebihi Pagu (${formatRupiah(pagu)})`);
                      } else {
                        setCommitmentError(null);
                      }
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nilai Kontrak (Rp)</label>
                  <input
                    type="number"
                    required
                    value={commitmentForm.commitment}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setCommitmentForm({...commitmentForm, commitment: val});
                      if (commitmentForm.pagu > 0 && val > commitmentForm.pagu) {
                        setCommitmentError(`Nilai Kontrak tidak boleh melebihi Pagu (${formatRupiah(commitmentForm.pagu)})`);
                      } else {
                        setCommitmentError(null);
                      }
                    }}
                    className={`w-full p-3 rounded-xl border dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${
                      commitmentError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {commitmentError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle size={12} /> {commitmentError}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCommitmentModalOpen(false)}
                  className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!commitmentError}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-Purchasing Modal */}
      {isEPurchasingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEPurchasingModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingItem ? 'Edit Transaksi' : 'Tambah Transaksi'}
              </h3>
              <button onClick={() => setIsEPurchasingModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleEPurchasingSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nomor Kontrak</label>
                <input 
                  type="text" 
                  required
                  value={epurchasingForm.noKontrak}
                  onChange={e => setEpurchasingForm({...epurchasingForm, noKontrak: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nama Pekerjaan</label>
                <input 
                  type="text" 
                  required
                  value={epurchasingForm.namaPekerjaan}
                  onChange={e => setEpurchasingForm({...epurchasingForm, namaPekerjaan: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nilai (Rp)</label>
                  <input 
                    type="number" 
                    required
                    value={epurchasingForm.nilai}
                    onChange={e => setEpurchasingForm({...epurchasingForm, nilai: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Status</label>
                  <select 
                    value={epurchasingForm.status}
                    onChange={e => setEpurchasingForm({...epurchasingForm, status: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Proses">Proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Waktu Pelaksanaan</label>
                <input 
                  type="text" 
                  required
                  value={epurchasingForm.waktuPelaksanaan}
                  onChange={e => setEpurchasingForm({...epurchasingForm, waktuPelaksanaan: e.target.value})}
                  placeholder="Contoh: 30 Hari Kalender"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tgl Kontrak</label>
                  <input 
                    type="date" 
                    required
                    value={epurchasingForm.tglKontrak}
                    onChange={e => setEpurchasingForm({...epurchasingForm, tglKontrak: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tgl Berakhir</label>
                  <input 
                    type="date" 
                    required
                    value={epurchasingForm.tglBerakhir}
                    onChange={e => setEpurchasingForm({...epurchasingForm, tglBerakhir: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dokumen Kontrak (PDF/Gambar)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    accept=".pdf,image/*"
                  />
                  {editingItem?.documentUrl && !selectedFile && (
                    <p className="mt-1 text-[10px] text-blue-500 font-bold">Dokumen saat ini tersedia</p>
                  )}
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <p className="text-[9px] font-black text-blue-600 mt-1 uppercase">Mengupload: {Math.round(uploadProgress)}%</p>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEPurchasingModalOpen(false)}
                  className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Reports;
