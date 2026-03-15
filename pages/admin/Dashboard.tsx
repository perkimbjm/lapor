
import React, { useState, useMemo } from 'react';
import AdminLayout from './AdminLayout';
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
  Map as MapIcon
} from 'lucide-react';

// Mock data for the weekly trend chart
const dataTrend = [
  { name: 'Sen', value: 4 },
  { name: 'Sel', value: 7 },
  { name: 'Rab', value: 5 },
  { name: 'Kam', value: 10 },
  { name: 'Jum', value: 6 },
  { name: 'Sab', value: 3 },
  { name: 'Min', value: 2 },
];

const COLORS_STATUS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];
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
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

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

  const stats = useMemo(() => ({
    total: selectedMonth === 'all' ? 458 : 42,
    diterima: selectedMonth === 'all' ? 145 : 12,
    tidakDiterima: selectedMonth === 'all' ? 62 : 4,
    disurvey: selectedMonth === 'all' ? 98 : 10,
    selesai: selectedMonth === 'all' ? 153 : 16,
    categoryJalan: selectedMonth === 'all' ? 320 : 30,
    categoryJembatan: selectedMonth === 'all' ? 138 : 12,
  }), [selectedMonth, selectedYear]);

  const statusPieData = [
    { name: 'Diterima', value: stats.diterima },
    { name: 'Disurvey', value: stats.disurvey },
    { name: 'Selesai', value: stats.selesai },
    { name: 'Tidak diterima', value: stats.tidakDiterima },
  ];

  const categoryDoughnutData = [
    { name: 'Jalan', value: stats.categoryJalan },
    { name: 'Jembatan', value: stats.categoryJembatan },
  ];

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
    <AdminLayout title="Dashboard Operasional">
      
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mb-8 sm:mb-10">
        <StatCard title={`Aduan ${dynamicLabel}`} value={stats.total} icon={<FileText />} color="bg-blue-50" textColor="text-blue-600" darkColor="bg-blue-900/30" darkTextColor="text-blue-400" />
        <StatCard title="Diterima" value={stats.diterima} icon={<CheckSquare />} color="bg-emerald-50" textColor="text-emerald-600" darkColor="bg-emerald-900/30" darkTextColor="text-emerald-400" />
        <StatCard title="Tidak diterima" value={stats.tidakDiterima} icon={<XCircle />} color="bg-slate-100" textColor="text-slate-600" darkColor="bg-slate-700/50" darkTextColor="text-slate-300" />
        <StatCard title="Disurvey" value={stats.disurvey} icon={<Clock />} color="bg-amber-50" textColor="text-amber-600" darkColor="bg-amber-900/30" darkTextColor="text-amber-400" />
        <StatCard title="Selesai" value={stats.selesai} icon={<CheckCircle />} color="bg-indigo-50" textColor="text-indigo-600" darkColor="bg-indigo-900/30" darkTextColor="text-indigo-400" />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
        {/* Trend Chart */}
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
             <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Tren Laporan Masuk</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">Aktivitas 7 Hari Terakhir</p>
             </div>
             <div className="hidden sm:flex items-center gap-1.5 text-xs font-black text-green-600 uppercase">
                <TrendingUp size={14} /> +12%
             </div>
          </div>
          <div className="h-64 sm:h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} axisLine={false} />
                <YAxis tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 flex flex-col min-h-[400px]">
          <div className="mb-6 sm:mb-8">
             <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Sebaran Status</h3>
             <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">Periode {dynamicLabel}</p>
          </div>
          <div className="flex-1 w-full h-64 relative mb-4">
            <ResponsiveContainer width="100%" height="100%">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            <div className="h-48 w-48 sm:h-56 sm:w-56 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
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
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
           <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Aktivitas Terkini</h3>
              <button className="text-[9px] sm:text-[10px] text-blue-600 font-black uppercase tracking-widest hover:underline">Semua</button>
           </div>
           <div className="divide-y divide-slate-100 dark:divide-slate-700 h-[320px] overflow-y-auto">
              {[
                { title: 'Jl. Haryono MT', user: 'Admin', action: 'Update stok', time: '2 jam lalu', status: 'Selesai' },
                { title: 'Jembatan Dewi', user: 'Tim Teknis', action: 'Upload survey', time: '4 jam lalu', status: 'Disurvey' },
                { title: 'Pagar Jembatan', user: 'Sistem', action: 'Aduan masuk', time: '6 jam lalu', status: 'Diterima' },
                { title: 'Cold Mix Q1', user: 'Admin', action: 'PO Baru', time: '1 hari lalu', status: 'Selesai' }
              ].map((activity, i) => (
                 <div key={i} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                       <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{activity.title}</h4>
                       <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          activity.status === 'Selesai' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          activity.status === 'Disurvey' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                       }`}>
                          {activity.status}
                       </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-300">
                       <span className="font-bold text-slate-700 dark:text-slate-200">{activity.user}</span> {activity.action}.
                    </p>
                    <div className="mt-1.5 flex items-center text-[9px] text-slate-400 dark:text-slate-300 font-black uppercase tracking-widest">
                       {activity.time}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
