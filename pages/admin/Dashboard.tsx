import React, { useState, useMemo, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../src/supabase';
import { ComplaintStatus, RoadType } from '../../types';
import { parseFirestoreDate, formatIndonesianDate } from '../../src/lib/dateUtils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  CheckSquare, 
  FileText,
  Calendar,
  ChevronDown,
  Filter,
  TrendingUp,
  Map as MapIcon,
  PieChart as PieChartIcon,
  Inbox
} from 'lucide-react';

// Mock data removed, now dynamic from useMemo
const COLORS_STATUS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'];
const COLORS_CATEGORY = ['#0ea5e9', '#6366f1'];

const StatCard = ({ title, value, icon, color, darkColor, textColor, darkTextColor }: any) => (
  <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-md dark:shadow-black/30 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all">
    <div className="p-4 sm:p-5">
      <div className="flex items-center">
        <div className={`flex-shrink-0 rounded-xl p-2.5 sm:p-3 ${color} ${textColor} dark:${darkColor} dark:${darkTextColor}`}>
          {/* Fix: Use React.ReactElement<any> to allow the 'size' prop on cloned elements */}
          {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
        </div>
        <div className="ml-4 sm:ml-5 w-0 flex-1">
          <dt className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest truncate mb-0.5 sm:mb-1">{title}</dt>
          <dd className="flex items-baseline">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
          </dd>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();

  useEffect(() => {
    setPageTitle("Dashboard Operasional");
  }, [setPageTitle]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [trendView, setTrendView] = useState<'7days' | 'month' | 'quarter' | 'year'>('7days');

  const [complaints, setComplaints] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchAll = async () => {
      const [c, m, eq, w, n] = await Promise.all([
        supabase.from('complaints').select('*'),
        supabase.from('materials').select('*'),
        supabase.from('equipment').select('*'),
        supabase.from('workers').select('*'),
        supabase.from('notifications').select('*'),
      ]);
      if (c.data)  setComplaints(c.data);
      if (m.data)  setMaterials(m.data);
      if (eq.data) setEquipment(eq.data);
      if (w.data)  setWorkers(w.data);
      if (n.data)  setNotifications(n.data);
      setLoading(false);
    };

    const refetchComplaints = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const { data } = await supabase.from('complaints').select('*');
        if (data) setComplaints(data);
      }, 400);
    };

    fetchAll();

    // Subscribe sekali. Supabase Realtime akan auto-reconnect saat tab kembali
    // aktif (via reconnectAfterMs config). Tidak ada manual refetch on visibility
    // agar tab switch tidak memicu loading flicker.
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, refetchComplaints)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const trendData = useMemo(() => {
    if (trendView === '7days') {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });

      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

      return last7Days.map(date => {
        const count = complaints.filter(c => {
          const cDate = parseFirestoreDate(c.date_submitted || c.created_at);
          if (!cDate) return false;
          return cDate.toDateString() === date.toDateString();
        }).length;

        return {
          name: dayNames[date.getDay()],
          value: count
        };
      });
    } else if (trendView === 'month') {
      const year = parseInt(selectedYear);
      const month = selectedMonth === 'all' ? new Date().getMonth() + 1 : parseInt(selectedMonth);
      
      const getWeekOfMonth = (date: Date) => {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return Math.ceil((date.getDate() + firstDay) / 7);
      };
      
      const weeksData = [
        { name: 'Pekan 1', value: 0 },
        { name: 'Pekan 2', value: 0 },
        { name: 'Pekan 3', value: 0 },
        { name: 'Pekan 4', value: 0 },
        { name: 'Pekan 5', value: 0 },
      ];
      
      complaints.forEach(c => {
        const cDate = parseFirestoreDate(c.date_submitted || c.created_at);
        if (!cDate) return;
        if (cDate.getFullYear() === year && (cDate.getMonth() + 1) === month) {
          const week = getWeekOfMonth(cDate);
          if (week >= 1 && week <= 5) {
            weeksData[week - 1].value += 1;
          }
        }
      });
      return weeksData;
    } else if (trendView === 'quarter') {
      const year = parseInt(selectedYear);
      const quarterData = [
        { name: 'Q1 (Jan-Mar)', value: 0 },
        { name: 'Q2 (Apr-Jun)', value: 0 },
        { name: 'Q3 (Jul-Sep)', value: 0 },
        { name: 'Q4 (Okt-Des)', value: 0 },
      ];
      
      complaints.forEach(c => {
        const cDate = parseFirestoreDate(c.date_submitted || c.created_at);
        if (!cDate) return;
        if (cDate.getFullYear() === year) {
          const month = cDate.getMonth();
          const quarter = Math.floor(month / 3);
          quarterData[quarter].value += 1;
        }
      });
      return quarterData;
    } else if (trendView === 'year') {
      const year = parseInt(selectedYear);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      const yearData = monthNames.map(name => ({ name, value: 0 }));
      
      complaints.forEach(c => {
        const cDate = parseFirestoreDate(c.date_submitted || c.created_at);
        if (!cDate) return;
        if (cDate.getFullYear() === year) {
          const month = cDate.getMonth();
          yearData[month].value += 1;
        }
      });
      return yearData;
    }
    return [];
  }, [complaints, trendView, selectedYear, selectedMonth]);

  const combinedActivities = useMemo(() => {
    const complaintActivities = complaints.map(c => ({
      id: c.id,
      title: `Aduan Baru: ${c.ticket_number || c.id.substring(0, 8)}`,
      message: `${c.reporter_name} melaporkan kerusakan ${c.category} di ${c.landmark || c.location}`,
      type: c.status === ComplaintStatus.REJECTED ? 'warning' : 'info',
      timestamp: c.date_submitted || c.created_at,
    }));

    const all = [...notifications, ...complaintActivities];
    return all
      .sort((a, b) => {
        const dateA = parseFirestoreDate(a.timestamp);
        const dateB = parseFirestoreDate(b.timestamp);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 15);
  }, [notifications, complaints]);

  const months = [
    { value: 'all', label: 'Sepanjang Tahun' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const years = [
    (currentYear + 1).toString(),
    currentYear.toString(),
    (currentYear - 1).toString(),
  ];

  const dynamicLabel = useMemo(() => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label;
    if (selectedMonth === 'all') {
      return `(${selectedYear})`;
    }
    return `(${monthLabel} ${selectedYear})`;
  }, [selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const isStatusMatch = (cStatus: any, targetStatus: ComplaintStatus) => {
      if (cStatus === targetStatus) return true;
      // Fallback for legacy keys
      const statusKey = Object.keys(ComplaintStatus).find(key => (ComplaintStatus as any)[key] === targetStatus);
      return cStatus === statusKey;
    };

    const filteredComplaints = complaints.filter(c => {
      const date = parseFirestoreDate(c.date_submitted || c.created_at);
      if (!date) return false;
      const yearMatch = date.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === 'all' || (date.getMonth() + 1).toString() === selectedMonth;
      return yearMatch && monthMatch;
    });

    return {
      grandTotal: complaints.length,
      total: filteredComplaints.length,
      diterima: filteredComplaints.filter(c => isStatusMatch(c.status, ComplaintStatus.RECEIVED)).length,
      tidakDiterima: filteredComplaints.filter(c => isStatusMatch(c.status, ComplaintStatus.REJECTED)).length,
      disurvey: filteredComplaints.filter(c => isStatusMatch(c.status, ComplaintStatus.SURVEY)).length,
      selesai: filteredComplaints.filter(c => isStatusMatch(c.status, ComplaintStatus.COMPLETED)).length,
      pending: filteredComplaints.filter(c => isStatusMatch(c.status, ComplaintStatus.PENDING)).length,
      categoryJalan: filteredComplaints.filter(c => c.category === RoadType.JALAN).length,
      categoryJembatan: filteredComplaints.filter(c => c.category === RoadType.JEMBATAN).length,
    };
  }, [complaints, selectedYear, selectedMonth]);

  const statusPieData = useMemo(() => [
    { name: 'Diterima', value: stats.diterima },
    { name: 'Disurvey', value: stats.disurvey },
    { name: 'Selesai', value: stats.selesai },
    { name: 'Tidak diterima', value: stats.tidakDiterima },
    { name: 'Pending', value: stats.pending },
  ], [stats]);

  const categoryDoughnutData = useMemo(() => [
    { name: 'Jalan', value: stats.categoryJalan },
    { name: 'Jembatan', value: stats.categoryJembatan },
  ], [stats]);

  const tooltipStyle = {
    backgroundColor: '#0f172a',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '700',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    zIndex: 1000
  };

  return (
    <>
      
      {/* Interactive Filters Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <Filter size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">Filter Periode Data</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-300 font-medium">Ubah filter untuk memperbarui statistik dashboard.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:min-w-[160px]">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 md:flex-none md:min-w-[100px]">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8 sm:mb-10">
        <StatCard title="Total Semua Aduan" value={stats.grandTotal} icon={<TrendingUp />} color="bg-slate-100" textColor="text-slate-600" darkColor="bg-slate-700/50" darkTextColor="text-slate-300" />
        <StatCard title={`Aduan ${dynamicLabel}`} value={stats.total} icon={<FileText />} color="bg-blue-50" textColor="text-blue-600" darkColor="bg-blue-900/30" darkTextColor="text-blue-400" />
        <StatCard title="Belum Dikerjakan" value={stats.pending} icon={<Clock />} color="bg-orange-50" textColor="text-orange-600" darkColor="bg-orange-900/30" darkTextColor="text-orange-400" />
        <StatCard title="Diterima" value={stats.diterima} icon={<CheckSquare />} color="bg-emerald-50" textColor="text-emerald-600" darkColor="bg-emerald-900/30" darkTextColor="text-emerald-400" />
        <StatCard title="Tidak diterima" value={stats.tidakDiterima} icon={<XCircle />} color="bg-slate-100" textColor="text-slate-600" darkColor="bg-slate-700/50" darkTextColor="text-slate-300" />
        <StatCard title="Disurvey" value={stats.disurvey} icon={<MapIcon />} color="bg-amber-50" textColor="text-amber-600" darkColor="bg-amber-900/30" darkTextColor="text-amber-400" />
        <StatCard title="Selesai" value={stats.selesai} icon={<CheckCircle />} color="bg-indigo-50" textColor="text-indigo-600" darkColor="bg-indigo-900/30" darkTextColor="text-indigo-400" />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
        {/* Trend Chart */}
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
             <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Tren Laporan Masuk</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">
                   {trendView === '7days' ? 'Aktivitas 7 Hari Terakhir' : 
                    trendView === 'month' ? `Aktivitas Bulan ${selectedMonth === 'all' ? 'Ini' : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(selectedMonth) - 1]}` :
                    trendView === 'quarter' ? `Aktivitas Kuartal Tahun ${selectedYear}` :
                    `Aktivitas Tahun ${selectedYear}`}
                </p>
             </div>
             <div className="flex items-center gap-3">
                <select 
                  value={trendView}
                  onChange={(e) => setTrendView(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="month">Bulan</option>
                  <option value="quarter">Kuartal</option>
                  <option value="year">Tahunan</option>
                </select>
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-black text-green-600 uppercase bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                   <TrendingUp size={14} /> +12%
                </div>
             </div>
          </div>
          {trendData.every(d => d.value === 0) ? (
            <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4">
                <TrendingUp className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Data</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">Tidak ada laporan masuk pada periode ini.</p>
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full relative">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                  <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} axisLine={false} />
                  <YAxis tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 flex flex-col min-h-[400px]">
          <div className="mb-6 sm:mb-8">
             <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Sebaran Status</h3>
             <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">Periode {dynamicLabel}</p>
          </div>
          {stats.total === 0 ? (
            <div className="flex-1 w-full h-64 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 mb-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4">
                <PieChartIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Data</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">Tidak ada aduan yang masuk pada periode ini.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 w-full h-64 relative mb-4">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_STATUS[index % COLORS_STATUS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                 {statusPieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                       <span className="block w-2 h-2 rounded-full shrink-0" style={{backgroundColor: COLORS_STATUS[index % COLORS_STATUS.length]}}></span>
                       <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-tight truncate">{entry.name}</span>
                    </div>
                 ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Category Doughnut Chart */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
             <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                <MapIcon size={20} />
             </div>
             <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Kategori Objek</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">Jalan vs Jembatan</p>
             </div>
          </div>
          {stats.total === 0 ? (
            <div className="h-48 sm:h-56 w-full flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4">
                <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Data</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">Tidak ada aduan yang masuk pada periode ini.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
              <div className="h-48 w-48 sm:h-56 sm:w-56 shrink-0 relative">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDoughnutData}
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="95%"
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryDoughnutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_CATEGORY[index % COLORS_CATEGORY.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full space-y-3">
                 {categoryDoughnutData.map((entry, index) => {
                    const percentage = ((entry.value / stats.total) * 100).toFixed(1);
                    return (
                      <div key={index} className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                         <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center">
                               <span className="block w-2.5 h-2.5 rounded-full mr-2.5" style={{backgroundColor: COLORS_CATEGORY[index % COLORS_CATEGORY.length]}}></span>
                               <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{entry.name}</span>
                            </div>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">{percentage}%</span>
                         </div>
                         <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${percentage}%`, backgroundColor: COLORS_CATEGORY[index % COLORS_CATEGORY.length] }}
                            ></div>
                         </div>
                      </div>
                    );
                 })}
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
           <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Aktivitas Terkini</h3>
              <Link to="/admin/activities" className="text-[9px] sm:text-[10px] text-blue-600 font-black uppercase tracking-widest hover:underline">Semua</Link>
           </div>
           <div className="divide-y divide-slate-100 dark:divide-slate-700 h-[320px] overflow-y-auto">
              {combinedActivities.map((notif, i) => (
                 <div key={i} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                       <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{notif.title}</h4>
                       <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          notif.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          notif.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                       }`}>
                          {notif.type}
                       </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-300">
                       {notif.message}
                    </p>
                    <div className="mt-1.5 flex items-center text-[9px] text-slate-400 dark:text-slate-300 font-black uppercase tracking-widest">
                       {formatIndonesianDate(notif.timestamp, true)}
                    </div>
                 </div>
              ))}
              {combinedActivities.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Tidak ada aktivitas
                </div>
              )}
           </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
