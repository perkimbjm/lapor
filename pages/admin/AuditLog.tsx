import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSupabaseQuery } from '../../src/hooks';
import { Search, Calendar, Filter, X, Activity, User, Database, Clock } from 'lucide-react';

const AuditLog: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (t: string) => void }>();
  useEffect(() => { setPageTitle('Audit Log'); }, [setPageTitle]);

  const { data: logs, loading } = useSupabaseQuery({
    table: 'audit_logs',
    filter: (q) => q.order('timestamp', { ascending: false }),
    realtimeMode: 'realtime',
  });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const parseFirestoreDate = (dateField: unknown): Date | null => {
    if (!dateField) return null;
    const maybeTs = dateField as { toDate?: () => Date };
    if (typeof maybeTs.toDate === 'function') return maybeTs.toDate();
    if (typeof dateField === 'string' || typeof dateField === 'number') return new Date(dateField);
    return null;
  };

  const formatIndonesianDate = (dateField: unknown, includeTime = false) => {
    const date = parseFirestoreDate(dateField);
    if (!date) return '-';
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchKeyword === '' || 
        (log.user_email && log.user_email.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(searchKeyword.toLowerCase()));
      
      let matchesDate = true;
      if (dateFilter) {
        const logDate = parseFirestoreDate(log.timestamp);
        if (logDate) {
          const filterDate = new Date(dateFilter);
          matchesDate = logDate.toDateString() === filterDate.toDateString();
        } else {
          matchesDate = false;
        }
      }

      const matchesModule = moduleFilter === '' || log.module === moduleFilter;

      return matchesSearch && matchesDate && matchesModule;
    });
  }, [logs, searchKeyword, dateFilter, moduleFilter]);

  const uniqueModules = useMemo(() => {
    const modules = new Set(logs.map(log => log.module).filter(Boolean));
    return Array.from(modules);
  }, [logs]);

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Audit Log</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lacak aktivitas CRUD (Create, Read, Update, Delete) dari user terdaftar.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col mb-8">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari user, aksi, atau detail..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
              {searchKeyword && (
                <button 
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="relative w-full sm:w-48">
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white appearance-none"
              >
                <option value="">Semua Modul</option>
                {uniqueModules.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
              <Database className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
            <div className="relative w-full sm:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Waktu</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">User</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Aksi</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Modul</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm font-bold">Memuat data...</td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <Clock size={14} className="mr-2 text-slate-400" />
                          {formatIndonesianDate(log.timestamp, true)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-900 dark:text-white font-bold">
                          <User size={16} className="mr-2 text-slate-400" />
                          {log.user_email || log.user_id || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {log.action || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {log.module || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={log.details}>
                          {log.details || '-'}
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <Activity className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Tidak ada log ditemukan</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada aktivitas yang tercatat atau tidak cocok dengan filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuditLog;
