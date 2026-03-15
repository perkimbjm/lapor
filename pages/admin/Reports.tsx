
import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
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
  X
} from 'lucide-react';
import { MOCK_COST_REPORTS, COST_BY_CATEGORY } from '../../constants';
import { GoogleGenAI } from "@google/genai";

const COMMITMENT_DATA = [
  { id: 'PKT-001', name: 'Pemeliharaan Rutin Jl. A. Yani', pagu: 200000000, commitment: 185000000, vendor: 'CV. Banjar Aspal' },
  { id: 'PKT-002', name: 'Perbaikan Jembatan Dewi', pagu: 150000000, commitment: 45000000, vendor: 'PT. Konstruksi Utama' },
  { id: 'PKT-003', name: 'Pengadaan Material Cold Mix (Triwulan I)', pagu: 100000000, commitment: 98500000, vendor: 'CV. Indo Bitumen' },
];

const EPURCHASING_DATA = [
  { 
    id: 'EP-2024-001', 
    noKontrak: 'SPK/PL/PJJ/01/2024', 
    namaPekerjaan: 'Pengadaan Aspal Cold Mix Kemasan (Bitumen)', 
    nilai: 125000000, 
    waktuPelaksanaan: '30 Hari Kalender', 
    tglKontrak: '2024-03-01', 
    tglBerakhir: '2024-03-31', 
    status: 'Selesai' 
  },
  { 
    id: 'EP-2024-002', 
    noKontrak: 'SPK/PL/PJJ/02/2024', 
    namaPekerjaan: 'Pekerjaan Drainase Lingkungan Kayu Tangi', 
    nilai: 45000000, 
    waktuPelaksanaan: '14 Hari Kalender', 
    tglKontrak: '2024-03-05', 
    tglBerakhir: '2024-03-19', 
    status: 'Proses' 
  },
  { 
    id: 'EP-2024-003', 
    noKontrak: 'DRAFT/2024/003/UPT', 
    namaPekerjaan: 'Sewa Alat Berat Vibro Roller & Baby Roller', 
    nilai: 15000000, 
    waktuPelaksanaan: '7 Hari Kalender', 
    tglKontrak: '2024-03-15', 
    tglBerakhir: '2024-03-22', 
    status: 'Draft' 
  },
  { 
    id: 'EP-2024-004', 
    noKontrak: 'SPK/PL/PJJ/04/2024', 
    namaPekerjaan: 'Rehabilitasi Pagar Jembatan Mawar', 
    nilai: 78500000, 
    waktuPelaksanaan: '21 Hari Kalender', 
    tglKontrak: '2024-03-10', 
    tglBerakhir: '2024-03-31', 
    status: 'Proses' 
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grafik' | 'komitmen' | 'epurchasing'>('komitmen');
  const [fiscalAnalysis, setFiscalAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [selectedEPDetail, setSelectedEPDetail] = useState<any>(null);

  const totalPagu = COMMITMENT_DATA.reduce((acc, curr) => acc + curr.pagu, 0);
  const totalKomitmen = COMMITMENT_DATA.reduce((acc, curr) => acc + curr.commitment, 0);
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
      const financialContext = COMMITMENT_DATA.map(d => `${d.name}: Pagu ${d.pagu}, Terkontrak ${d.commitment}`).join('; ');
      
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
    alert('Sedang menyiapkan file Excel Laporan Realisasi E-Purchasing...');
  };

  const handleOpenEPDetail = (item: any) => {
    setSelectedEPDetail(item);
  };

  return (
    <AdminLayout title="Laporan & Keuangan">
      
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
                <button onClick={handleExportExcel} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Download CSV</button>
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
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {COMMITMENT_DATA.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                           <td className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-300">{item.id}</td>
                           <td className="px-6 py-4">
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</p>
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
                       <p className="text-lg font-black">{EPURCHASING_DATA.length} Paket</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                       <p className="text-[9px] font-black uppercase text-indigo-200 mb-1">Akumulasi Nilai</p>
                       <p className="text-lg font-black">{formatRupiah(EPURCHASING_DATA.reduce((acc, c) => acc + c.nilai, 0))}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                    <FileText size={16} /> Riwayat Transaksi E-Purchasing
                 </h4>
                 <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                    <Download size={14} /> Export Table
                 </button>
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
                       {EPURCHASING_DATA.map((item) => (
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

      {/* ================= TAB 3: GRAFIK ANALISA ================= */}
      {activeTab === 'grafik' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Realisasi vs Anggaran Bulanan</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_COST_REPORTS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} />
                    <XAxis dataKey="month" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} />
                    <YAxis hide />
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
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={COST_BY_CATEGORY}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {COST_BY_CATEGORY.map((entry, index) => (
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
    </AdminLayout>
  );
};

export default Reports;
