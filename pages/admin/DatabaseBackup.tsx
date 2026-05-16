
import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';
import { SUPERADMIN_EMAIL } from '../../constants';
import {
  Database,
  Download,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Table2,
  AlertTriangle,
} from 'lucide-react';
import { TEXT_COLOR, ICON_COLOR } from '../../src/lib/colors';

const BACKUP_PASSWORD = 'aktivasi';

const TABLES = [
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'complaints',
  'materials',
  'equipment',
  'workers',
  'holidays',
  'attendance',
  'notifications',
  'audit_logs',
  'epurchasing',
  'cost_reports',
];

type TableStatus = 'idle' | 'loading' | 'done' | 'error';

interface TableResult {
  table: string;
  rows: number;
  status: TableStatus;
  error?: string;
}

function escapeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function rowsToInsertSQL(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `-- ${table}: tidak ada data\n`;
  const cols = Object.keys(rows[0]).join(', ');
  const values = rows
    .map((r) => `  (${Object.values(r).map(escapeValue).join(', ')})`)
    .join(',\n');
  return `INSERT INTO ${table} (${cols}) VALUES\n${values};\n`;
}

const DatabaseBackup: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (t: string) => void }>();
  useEffect(() => { setPageTitle('Backup Database'); }, [setPageTitle]);

  const { user, loading } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [tableResults, setTableResults] = useState<TableResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sqlBlob, setSqlBlob] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return <Navigate to="/admin" replace />;
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === BACKUP_PASSWORD) {
      setUnlocked(true);
      setPasswordError('');
    } else {
      setPasswordError('Password salah. Silakan coba lagi.');
    }
  };

  const generateBackup = async () => {
    setIsGenerating(true);
    setSqlBlob(null);
    setGeneratedAt(null);
    const results: TableResult[] = TABLES.map((t) => ({ table: t, rows: 0, status: 'idle' }));
    setTableResults([...results]);

    let fullSQL = `-- =============================================\n`;
    fullSQL += `-- Backup Database Bepadah\n`;
    fullSQL += `-- Dibuat: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA\n`;
    fullSQL += `-- Oleh  : ${user.email}\n`;
    fullSQL += `-- =============================================\n\n`;
    fullSQL += `SET client_encoding = 'UTF8';\n\n`;

    for (let i = 0; i < TABLES.length; i++) {
      const table = TABLES[i];
      results[i] = { table, rows: 0, status: 'loading' };
      setTableResults([...results]);

      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        const rows = (data ?? []) as Record<string, unknown>[];
        fullSQL += `-- Tabel: ${table} (${rows.length} baris)\n`;
        fullSQL += rowsToInsertSQL(table, rows);
        fullSQL += '\n';
        results[i] = { table, rows: rows.length, status: 'done' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fullSQL += `-- ERROR pada tabel ${table}: ${msg}\n\n`;
        results[i] = { table, rows: 0, status: 'error', error: msg };
      }

      setTableResults([...results]);
    }

    setSqlBlob(fullSQL);
    setGeneratedAt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }));
    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (!sqlBlob) return;
    const blob = new Blob([sqlBlob], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bepadah_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
                <Lock size={28} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Akses Backup Database</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
                Masukkan password khusus untuk melanjutkan
              </p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Password backup"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={14} /> {passwordError}
                </p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Masuk
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const doneCount = tableResults.filter((r) => r.status === 'done').length;
  const errorCount = tableResults.filter((r) => r.status === 'error').length;
  const totalRows = tableResults.reduce((s, r) => s + r.rows, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-1">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Database size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Backup Database</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {TABLES.length} tabel · Ekspor semua data sebagai file SQL
              </p>
              {generatedAt && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Terakhir dibuat: {generatedAt} WITA
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {sqlBlob && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Download size={16} />
                Unduh SQL
              </button>
            )}
            <button
              onClick={generateBackup}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {isGenerating ? 'Memproses...' : sqlBlob ? 'Buat Ulang' : 'Buat Backup'}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {tableResults.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{doneCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tabel Berhasil</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalRows.toLocaleString('id-ID')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Baris</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${errorCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{errorCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Error</p>
            </div>
          </div>
        )}
      </div>

      {/* Table list */}
      {tableResults.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <Table2 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className={`text-sm ${TEXT_COLOR.SECONDARY}`}>Klik "Buat Backup" untuk mulai mengekspor data</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status per Tabel</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {tableResults.map((r) => (
              <li key={r.table} className="flex items-center gap-3 px-5 py-3">
                <span className="flex-shrink-0">
                  {r.status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  {r.status === 'loading' && <Loader2 size={20} className="text-blue-500 animate-spin" />}
                  {r.status === 'done' && <CheckCircle2 size={20} className="text-green-500" />}
                  {r.status === 'error' && <AlertTriangle size={20} className="text-red-500" />}
                </span>
                <span className="flex-1 text-sm font-mono text-slate-700 dark:text-slate-300">{r.table}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 min-w-[80px] text-right">
                  {r.status === 'done' && `${r.rows.toLocaleString('id-ID')} baris`}
                  {r.status === 'loading' && 'Mengambil...'}
                  {r.status === 'error' && (
                    <span className="text-red-500 truncate block max-w-[200px]" title={r.error}>{r.error}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DatabaseBackup;
