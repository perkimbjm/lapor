import React, { useRef, useEffect } from 'react';
import { Pencil, Trash2, FileText, Check, Clock, X, AlertTriangle } from 'lucide-react';
import { type Worker, type AttendanceRecord, type Holiday } from '../../../types';
import { type DayKey } from '../../../src/hooks/useWorkforceData';

// ── Cell renderer ─────────────────────────────────────────────────────────────

function renderCell(val: number): React.ReactNode {
  if (val === 1)
    return (
      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400" title="Hadir">
        <Check size={16} strokeWidth={3} />
      </div>
    );
  if (val === 2)
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400" title="Lembur">
        <Clock size={16} strokeWidth={3} />
      </div>
    );
  if (val === 3)
    return (
      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-400 font-black text-xs">
        3
      </div>
    );
  if (val === 4)
    return (
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-black text-xs">
        4
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400" title="Absen">
      <X size={16} strokeWidth={3} />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WorkerTableProps {
  // Data
  filteredWorkers: Worker[];
  paginatedWorkers: Worker[];
  currentWeekDates: Date[];
  isHoliday: (date: Date) => Holiday | undefined;
  getAttendanceRecords: (id: string) => AttendanceRecord[];
  calculateTotalWage: (records: AttendanceRecord[]) => number;
  // Filters
  selectedWeek: number | 'all';
  selectedMonth: string;
  // Permissions
  canDelete: boolean;
  canUpdate: boolean;
  canManageExcel: boolean;
  // Bulk select
  selectedWorkerIds: Set<string>;
  onToggleWorker: (id: string) => void;
  onToggleAllWorkers: (ids: string[]) => void;
  // Row actions
  onEdit: (worker: Worker) => void;
  onDeleteRequest: (item: { id: string; name: string }) => void;
  onExportSlip: (worker: Worker) => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
  // Delete confirmation (shown below table)
  deleteConfirm: { id: string; name: string } | null;
  setDeleteConfirm: (v: { id: string; name: string } | null) => void;
  onConfirmDelete: () => Promise<void>;
}

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// ── Component ─────────────────────────────────────────────────────────────────

const WorkerTable: React.FC<WorkerTableProps> = ({
  filteredWorkers,
  paginatedWorkers,
  currentWeekDates,
  isHoliday,
  getAttendanceRecords,
  calculateTotalWage,
  selectedWeek,
  selectedMonth,
  canDelete,
  canUpdate,
  canManageExcel,
  selectedWorkerIds,
  onToggleWorker,
  onToggleAllWorkers,
  onEdit,
  onDeleteRequest,
  onExportSlip,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  deleteConfirm,
  setDeleteConfirm,
  onConfirmDelete,
}) => {
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Indeterminate state for "select all" checkbox
  useEffect(() => {
    if (!selectAllRef.current) return;
    const pageIds = paginatedWorkers.map(w => w.id);
    const selectedCount = pageIds.filter(id => selectedWorkerIds.has(id)).length;
    selectAllRef.current.indeterminate =
      selectedCount > 0 && selectedCount < pageIds.length;
  }, [selectedWorkerIds, paginatedWorkers]);

  const showDayColumns = selectedWeek !== 'all';
  const showDateHeaders = showDayColumns && currentWeekDates.length > 0;

  return (
    <>
      {/* ── Main Table ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-left relative">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 shadow-sm">
                {canDelete && (
                  <th className="px-4 py-4 w-12 bg-slate-50 dark:bg-slate-900">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 cursor-pointer"
                      checked={
                        paginatedWorkers.length > 0 &&
                        paginatedWorkers.every(w => selectedWorkerIds.has(w.id))
                      }
                      onChange={() => onToggleAllWorkers(paginatedWorkers.map(w => w.id))}
                    />
                  </th>
                )}
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 w-16 bg-slate-50 dark:bg-slate-900">
                  No
                </th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 bg-slate-50 dark:bg-slate-900">
                  Nama Pekerja
                </th>

                {/* Day / total columns */}
                {showDayColumns ? (
                  showDateHeaders ? (
                    DAY_SHORT.map((day, idx) => {
                      const date = currentWeekDates[idx];
                      const holiday = isHoliday(date);
                      const isCurrentMonth = date.getMonth() + 1 === Number(selectedMonth);
                      return (
                        <th
                          key={day}
                          className={`px-4 py-4 text-xs font-black uppercase tracking-widest text-center bg-slate-50 dark:bg-slate-900 ${
                            !isCurrentMonth
                              ? 'opacity-30'
                              : holiday
                              ? 'text-red-500'
                              : 'text-slate-500 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{day}</span>
                            <span className="text-[10px] mt-0.5">{date.getDate()}</span>
                            {holiday && (
                              <span className="text-[8px] mt-0.5 truncate max-w-[40px]">
                                {holiday.name}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })
                  ) : (
                    DAY_SHORT.map(day => (
                      <th
                        key={day}
                        className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center bg-slate-50 dark:bg-slate-900"
                      >
                        {day}
                      </th>
                    ))
                  )
                ) : (
                  <>
                    <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center bg-slate-50 dark:bg-slate-900">
                      Total Hadir
                    </th>
                    <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center bg-slate-50 dark:bg-slate-900">
                      Total Lembur
                    </th>
                  </>
                )}

                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-right bg-slate-50 dark:bg-slate-900">
                  Upah{' '}
                  {selectedWeek === 'all'
                    ? selectedMonth === 'all'
                      ? 'Tahun'
                      : 'Bulan'
                    : `Pekan ${selectedWeek}`}
                </th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center bg-slate-50 dark:bg-slate-900">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedWorkers.map((worker, index) => {
                const records = getAttendanceRecords(worker.id);
                const totalWageVal = calculateTotalWage(records);
                const totalPresence = records.reduce(
                  (acc, r) => acc + Object.values(r.presence).filter(d => d === 1).length,
                  0,
                );
                const totalOT = records.reduce(
                  (acc, r) => acc + Object.values(r.presence).filter(d => d > 1).length,
                  0,
                );
                const record = records[0];
                const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr
                    key={worker.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group ${
                      selectedWorkerIds.has(worker.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {canDelete && (
                      <td className="px-4 py-4 w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 cursor-pointer"
                          checked={selectedWorkerIds.has(worker.id)}
                          onChange={() => onToggleWorker(worker.id)}
                        />
                      </td>
                    )}

                    <td className="px-4 py-4 text-xs font-bold text-slate-400 dark:text-slate-300">
                      {actualIndex}
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {worker.name}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase mt-0.5 tracking-wider">
                        Rp {(worker.daily_rate || 0).toLocaleString()} / Hari
                      </div>
                    </td>

                    {showDayColumns ? (
                      DAY_KEYS.map((day, idx) => {
                        const date = currentWeekDates[idx];
                        const holiday = isHoliday(date);
                        return (
                          <td
                            key={day}
                            className={`px-4 py-4 text-center ${
                              holiday ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                            }`}
                          >
                            <div className="flex justify-center">
                              {renderCell(
                                (record?.presence as Record<DayKey, number> | undefined)?.[day] ?? 0,
                              )}
                            </div>
                          </td>
                        );
                      })
                    ) : (
                      <>
                        <td className="px-4 py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                          {totalPresence} Hari
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                          {totalOT} Hari
                        </td>
                      </>
                    )}

                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                        Rp {totalWageVal.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {canManageExcel && (
                          <button
                            onClick={() => onExportSlip(worker)}
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                            title="Cetak Slip Gaji"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        {canUpdate && (
                          <button
                            onClick={() => onEdit(worker)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                            title="Edit Presensi"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() =>
                              onDeleteRequest({ id: worker.id, name: worker.name })
                            }
                            className="p-2 text-slate-400 hover:text-red-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredWorkers.length === 0 && (
                <tr>
                  <td
                    colSpan={canDelete ? 12 : 11}
                    className="px-6 py-12 text-center text-slate-400 dark:text-slate-300 text-xs italic"
                  >
                    Belum ada data pekerja untuk kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: Pagination + Legend ── */}
        <div className="px-6 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
          {(selectedMonth === 'all' || filteredWorkers.length > 5) && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-300">
                  Tampilkan
                </span>
                <select
                  value={itemsPerPage}
                  onChange={e => onItemsPerPageChange(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[5, 10, 25, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-300">
                  Data per halaman
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1 px-4">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                    {currentPage}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-300">/</span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-300">
                    {totalPages || 1}
                  </span>
                </div>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300">
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /> 1 = Hadir</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> 2 = Lembur 1</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> 3 = Lembur 2</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> 4 = Lembur 3</div>
            </div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
              <AlertTriangle size={10} />
              <span>Total upah dihitung otomatis dari presensi harian per pekan.</span>
            </div>
            <p className="hidden md:block text-slate-400 dark:text-slate-300">
              *Banjarmasin Maju Sejahtera
            </p>
          </div>
        </div>
      </div>

      {/* ── Delete Worker Confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
              Hapus Tenaga Kerja?
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
              Anda akan menghapus data pekerja{' '}
              <span className="text-slate-900 dark:text-white">"{deleteConfirm.name}"</span> beserta
              data presensinya. Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Batal
              </button>
              <button
                onClick={onConfirmDelete}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerTable;
