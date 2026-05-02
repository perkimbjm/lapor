import React, { useRef, useState, type ChangeEvent } from 'react';
import { FileSpreadsheet, Download, UploadCloud, Loader2 } from 'lucide-react';

interface ExcelToolbarProps {
  onExport: () => void;
  onImport: (
    e: ChangeEvent<HTMLInputElement>,
    onComplete: () => void,
    setIsProcessing: (v: boolean) => void,
  ) => void;
  onDownloadTemplate: () => void;
}

const ExcelToolbar: React.FC<ExcelToolbarProps> = ({
  onExport,
  onImport,
  onDownloadTemplate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-600">
          <FileSpreadsheet size={20} />
        </div>
        <div>
          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
            Pengelolaan Data Excel (Multi-Pekan)
          </h5>
          <p className="text-[9px] text-slate-500 dark:text-slate-300 font-bold uppercase">
            Sertakan kolom "Pekan" untuk import banyak data sekaligus
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        {/* Export */}
        <button
          onClick={onExport}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <Download size={14} /> Export Excel
        </button>

        {/* Import */}
        <div className="flex-1 sm:flex-none relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={e => onImport(e, resetInput, setIsProcessing)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UploadCloud size={14} />
            )}{' '}
            Import Excel
          </button>
        </div>

        {/* Template */}
        <button
          onClick={onDownloadTemplate}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
        >
          <FileSpreadsheet size={14} /> Unduh Template
        </button>
      </div>
    </div>
  );
};

export default ExcelToolbar;
