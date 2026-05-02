import React from 'react';
import { type WorkforceRates } from '../../../src/hooks/useWorkforceData';

interface RateSettingsProps {
  globalRates: WorkforceRates;
  onRateChange: (key: keyof WorkforceRates, value: number) => void;
  isSavingRates: boolean;
  onSaveRates: () => Promise<void>;
}

const RATE_FIELDS: { key: keyof WorkforceRates; label: string }[] = [
  { key: 'dailyRate', label: 'Upah Harian' },
  { key: 'otRate1',   label: 'Bonus Lembur 1' },
  { key: 'otRate2',   label: 'Bonus Lembur 2' },
  { key: 'otRate3',   label: 'Bonus Lembur 3' },
];

const RateSettings: React.FC<RateSettingsProps> = ({
  globalRates,
  onRateChange,
  isSavingRates,
  onSaveRates,
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 md:col-span-2">
    <div className="flex justify-between items-center mb-4">
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
        Pengaturan Tarif Upah Global
      </h4>
      <button
        onClick={onSaveRates}
        disabled={isSavingRates}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isSavingRates ? 'Menyimpan...' : 'Simpan Tarif'}
      </button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {RATE_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">
            {label}
          </label>
          <input
            type="number"
            value={globalRates[key] ?? 0}
            onChange={e => onRateChange(key, Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}
    </div>
  </div>
);

export default RateSettings;
