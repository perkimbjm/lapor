import React, { type FormEvent } from 'react';
import { Calendar, Plus, Trash2, XCircle } from 'lucide-react';
import { type Holiday } from '../../../types';

interface HolidayManagerProps {
  show: boolean;
  onClose: () => void;
  holidays: Holiday[];
  onAddHoliday: (e: FormEvent) => Promise<void>;
  onDeleteHoliday: (id: string, name: string) => Promise<void>;
  deleteConfirm: { id: string; name: string } | null;
  setDeleteConfirm: (v: { id: string; name: string } | null) => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({
  show,
  onClose,
  holidays,
  onAddHoliday,
  onDeleteHoliday,
  deleteConfirm,
  setDeleteConfirm,
}) => {
  if (!show) return null;

  return (
    <>
      {/* ── Holiday Manager Modal ── */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-in fade-in duration-300">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Kelola Hari Libur
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <XCircle size={24} className="text-slate-400" />
            </button>
          </div>

          {/* Add form */}
          <form
            onSubmit={onAddHoliday}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Tanggal
              </label>
              <input
                name="date"
                type="date"
                required
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Nama Hari Libur
              </label>
              <input
                name="name"
                type="text"
                placeholder="Contoh: Idul Fitri"
                required
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Tipe
              </label>
              <div className="flex gap-2">
                <select
                  name="type"
                  className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="National">Nasional</option>
                  <option value="Cuti Bersama">Cuti Bersama</option>
                </select>
                <button
                  type="submit"
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </form>

          {/* Holiday list */}
          <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-3">
              {[...holidays]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(holiday => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-xl ${
                          holiday.type === 'National'
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                            : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                        }`}
                      >
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {holiday.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase">
                          {new Date(holiday.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          • {holiday.type}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm({ id: holiday.id, name: holiday.name })}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              {holidays.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Belum ada hari libur yang ditambahkan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Holiday Confirmation ── */}
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
              Hapus Hari Libur?
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
              Anda akan menghapus hari libur{' '}
              <span className="text-slate-900 dark:text-white">"{deleteConfirm.name}"</span>.
              Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteHoliday(deleteConfirm.id, deleteConfirm.name);
                  setDeleteConfirm(null);
                }}
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

export default HolidayManager;
