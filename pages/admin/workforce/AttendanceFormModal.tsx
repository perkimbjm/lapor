import React, { type FormEvent } from 'react';
import { XCircle } from 'lucide-react';
import { RoadType } from '../../../types';
import { type WorkerFormData } from '../../../src/hooks/useWorkforceData';

interface AttendanceFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: WorkerFormData;
  onChange: (data: WorkerFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const AttendanceFormModal: React.FC<AttendanceFormModalProps> = ({
  isOpen,
  isEditing,
  formData,
  onChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">
            {isEditing ? 'Update' : 'Tambah'} Pekerja &amp; Presensi
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">
                Nama Pekerja
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => onChange({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="Ahmad ..."
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={e => onChange({ ...formData, category: e.target.value as RoadType })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value={RoadType.JALAN}>Pekerja Jalan</option>
                <option value={RoadType.JEMBATAN}>Pekerja Jembatan</option>
              </select>
            </div>
          </div>

          {/* Daily presence */}
          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-4 block">
              Presensi Harian (Kode: 0=Absen, 1=Hadir, 2=Lembur 1, 3=Lembur 2, 4=Lembur 3)
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map(day => (
                <div key={day} className="text-center">
                  <label className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-300 mb-1 block">
                    {day.substring(0, 3)}
                  </label>
                  <select
                    value={formData[day]}
                    onChange={e => onChange({ ...formData, [day]: Number(e.target.value) })}
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white text-center outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {[0, 1, 2, 3, 4].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceFormModal;
