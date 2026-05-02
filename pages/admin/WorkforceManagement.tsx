import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Banknote,
  Calendar,
  ChevronDown,
  Plus,
  TrendingUp,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

import { RoadType } from '../../types';
import { useAuth } from '../../components/AuthContext';
import {
  useWorkforceData,
  getWeekDates,
  type WorkerFormData,
  type WorkforceRates,
} from '../../src/hooks/useWorkforceData';

import RateSettings from './workforce/RateSettings';
import HolidayManager from './workforce/HolidayManager';
import AttendanceFormModal from './workforce/AttendanceFormModal';
import ExcelToolbar from './workforce/ExcelToolbar';
import WorkerTable from './workforce/WorkerTable';

// ── Default form state ────────────────────────────────────────────────────────

const DEFAULT_FORM: WorkerFormData = {
  name: '',
  category: RoadType.JALAN,
  monday: 1,
  tuesday: 1,
  wednesday: 1,
  thursday: 1,
  friday: 1,
  saturday: 0,
  sunday: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

const WorkforceManagement: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();
  const { isAdmin, hasPermission, workerId } = useAuth();

  const canCreate       = hasPermission('WORKFORCE_CREATE');
  const canUpdate       = hasPermission('WORKFORCE_UPDATE');
  const canDelete       = hasPermission('WORKFORCE_DELETE');
  const canManageRates  = hasPermission('WORKFORCE_MANAGE_RATES');
  const canManageExcel  = hasPermission('WORKFORCE_MANAGE_EXCEL');
  const canManageHolidays = hasPermission('WORKFORCE_MANAGE_HOLIDAYS');

  /** Non-admin without CREATE → restrict to own worker_id */
  const restrictToOwn = !isAdmin && !canCreate && !!workerId;

  useEffect(() => {
    setPageTitle('Manajemen Tenaga Kerja');
  }, [setPageTitle]);

  // ── Filter / navigation state ─────────────────────────────────────────────

  const [activeTab, setActiveTab]       = useState<RoadType>(RoadType.JALAN);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(1);

  // ── Pagination state ──────────────────────────────────────────────────────

  const [currentPage, setCurrentPage]     = useState(1);
  const [itemsPerPage, setItemsPerPage]   = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedYear, selectedMonth, selectedWeek]);

  // ── Modal / UI state ──────────────────────────────────────────────────────

  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isEditing, setIsEditing]                 = useState(false);
  const [selectedWorkerId, setSelectedWorkerId]   = useState<string | null>(null);
  const [formData, setFormData]                   = useState<WorkerFormData>(DEFAULT_FORM);

  const [deleteConfirm, setDeleteConfirm]                   = useState<{ id: string; name: string } | null>(null);
  const [deleteHolidayConfirm, setDeleteHolidayConfirm]     = useState<{ id: string; name: string } | null>(null);

  // ── Bulk select state ─────────────────────────────────────────────────────

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Clear selection when tab/year/month changes
  useEffect(() => {
    setSelectedWorkerIds(new Set());
  }, [activeTab, selectedYear, selectedMonth]);

  // ── Data hook ─────────────────────────────────────────────────────────────

  const {
    holidays,
    globalRates,
    setGlobalRates,
    isSavingRates,
    filteredWorkers,
    totalWage,
    isHoliday,
    getAttendanceRecordsForWorker,
    calculateTotalWage,
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleSaveRates,
    handleAddHoliday,
    handleDeleteHoliday,
    handleExport,
    handleExportSlip,
    downloadTemplate,
    handleImport,
  } = useWorkforceData({
    restrictToOwn,
    workerId,
    selectedYear,
    selectedMonth,
    selectedWeek,
    activeTab,
    canManageExcel,
    canManageHolidays,
    canManageRates,
  });

  // ── Pagination helpers ────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);

  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkers.slice(start, start + itemsPerPage);
  }, [filteredWorkers, currentPage, itemsPerPage]);

  // ── Current-week dates for header / cell rendering ────────────────────────

  const currentWeekDates = useMemo(() => {
    if (selectedWeek === 'all') return [];
    return getWeekDates(Number(selectedYear), Number(selectedMonth), Number(selectedWeek));
  }, [selectedYear, selectedMonth, selectedWeek]);

  // ── Modal open helpers ────────────────────────────────────────────────────

  const openModal = (worker?: { id: string; name: string; category: RoadType }) => {
    if (worker) {
      setIsEditing(true);
      setSelectedWorkerId(worker.id);
      const records = getAttendanceRecordsForWorker(worker.id);
      const record = records[0];
      setFormData({
        name: worker.name,
        category: worker.category,
        monday:    record?.presence.monday    ?? 0,
        tuesday:   record?.presence.tuesday   ?? 0,
        wednesday: record?.presence.wednesday ?? 0,
        thursday:  record?.presence.thursday  ?? 0,
        friday:    record?.presence.friday    ?? 0,
        saturday:  record?.presence.saturday  ?? 0,
        sunday:    record?.presence.sunday    ?? 0,
      });
    } else {
      setIsEditing(false);
      setSelectedWorkerId(null);
      setFormData({ ...DEFAULT_FORM, category: activeTab });
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const week = selectedWeek === 'all' ? 1 : selectedWeek;
    const ok = await handleSave(formData, isEditing, selectedWorkerId, week);
    if (ok) setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    await handleDelete(deleteConfirm.id, deleteConfirm.name);
    setDeleteConfirm(null);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      await handleBulkDelete(selectedWorkerIds);
      setSelectedWorkerIds(new Set());
    } finally {
      setShowBulkDeleteModal(false);
    }
  };

  // ── Bulk select helpers ───────────────────────────────────────────────────

  const toggleSelectWorker = (id: string) => {
    setSelectedWorkerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllWorkers = (ids: string[]) => {
    setSelectedWorkerIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Holiday Manager Modal ── */}
      {canManageHolidays && (
        <HolidayManager
          show={isHolidayModalOpen}
          onClose={() => setIsHolidayModalOpen(false)}
          holidays={holidays}
          onAddHoliday={handleAddHoliday}
          onDeleteHoliday={handleDeleteHoliday}
          deleteConfirm={deleteHolidayConfirm}
          setDeleteConfirm={setDeleteHolidayConfirm}
        />
      )}

      {/* ── Metric cards + Rate settings ── */}
      <div className={`grid grid-cols-1 ${canManageRates ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 mb-8`}>
        {/* Total wage card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
            <Banknote size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/30 rounded-2xl backdrop-blur-md shadow-inner">
                <Banknote size={24} />
              </div>
              <span className="text-[10px] font-black uppercase bg-white/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                {selectedMonth === 'all' ? selectedYear : `Bulan ${selectedMonth}`} -{' '}
                {selectedWeek === 'all' ? 'Semua Pekan' : `Pekan ${selectedWeek}`}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">
              Total Upah {activeTab}
            </p>
            <h3 className="text-3xl font-black tabular-nums">
              Rp {totalWage.toLocaleString('id-ID')}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-blue-100 text-[10px] font-bold">
              <TrendingUp size={14} /> <span>Penggajian Terotomatisasi</span>
            </div>
          </div>
        </div>

        {/* Rate settings */}
        {canManageRates && (
          <RateSettings
            globalRates={globalRates}
            onRateChange={(key: keyof WorkforceRates, value: number) =>
              setGlobalRates(prev => ({ ...prev, [key]: value }))
            }
            isSavingRates={isSavingRates}
            onSaveRates={handleSaveRates}
          />
        )}
      </div>

      {/* ── Tabs & Filters ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        {/* Tab switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 w-full lg:w-auto overflow-hidden">
          {([RoadType.JALAN, RoadType.JEMBATAN] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pekerja {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Year */}
          <div className="relative flex-1 min-w-[100px]">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full pl-4 pr-10 py-3 text-[11px] font-black uppercase border border-slate-100 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none outline-none shadow-sm"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Month */}
          <div className="relative flex-1 min-w-[140px]">
            <select
              value={selectedMonth}
              onChange={e => {
                setSelectedMonth(e.target.value);
                if (e.target.value === 'all') setSelectedWeek('all');
              }}
              className="w-full pl-4 pr-10 py-3 text-[11px] font-black uppercase border border-slate-100 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none outline-none shadow-sm"
            >
              <option value="all">Semua Bulan</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Bulan {m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Week */}
          <div className="relative flex-1 min-w-[120px]">
            <select
              value={selectedWeek}
              onChange={e =>
                setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              disabled={selectedMonth === 'all'}
              className="w-full pl-4 pr-10 py-3 text-[11px] font-black uppercase border border-slate-100 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none outline-none shadow-sm disabled:opacity-50"
            >
              <option value="all">Semua Pekan</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>Pekan {n}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {canManageHolidays && (
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all w-full lg:w-auto"
            >
              <Calendar size={16} /> Kelola Hari Libur
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => openModal()}
              disabled={selectedMonth === 'all' || selectedWeek === 'all'}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full lg:w-auto disabled:opacity-50"
            >
              <Plus size={16} /> Tambah Pekerja
            </button>
          )}
        </div>
      </div>

      {/* ── Excel Toolbar ── */}
      {canManageExcel && (
        <ExcelToolbar
          onExport={handleExport}
          onImport={handleImport}
          onDownloadTemplate={downloadTemplate}
        />
      )}

      {/* ── Worker Table ── */}
      <WorkerTable
        filteredWorkers={filteredWorkers}
        paginatedWorkers={paginatedWorkers}
        currentWeekDates={currentWeekDates}
        isHoliday={isHoliday}
        getAttendanceRecords={getAttendanceRecordsForWorker}
        calculateTotalWage={calculateTotalWage}
        selectedWeek={selectedWeek}
        selectedMonth={selectedMonth}
        canDelete={canDelete}
        canUpdate={canUpdate}
        canManageExcel={canManageExcel}
        selectedWorkerIds={selectedWorkerIds}
        onToggleWorker={toggleSelectWorker}
        onToggleAllWorkers={toggleSelectAllWorkers}
        onEdit={openModal}
        onDeleteRequest={setDeleteConfirm}
        onExportSlip={handleExportSlip}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={n => { setItemsPerPage(n); setCurrentPage(1); }}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* ── Add / Edit Modal ── */}
      <AttendanceFormModal
        isOpen={isModalOpen}
        isEditing={isEditing}
        formData={formData}
        onChange={setFormData}
        onSubmit={handleFormSubmit}
        onClose={() => setIsModalOpen(false)}
      />

      {/* ── Floating Bulk-Action Bar ── */}
      {canDelete && selectedWorkerIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={18} className="text-blue-400" />
          <span className="text-sm font-bold">{selectedWorkerIds.size} pekerja dipilih</span>
          <div className="w-px h-6 bg-slate-600" />
          <button
            onClick={() => setSelectedWorkerIds(new Set())}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-red-600/30"
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      )}

      {/* ── Bulk Delete Confirmation ── */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowBulkDeleteModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
              Hapus {selectedWorkerIds.size} Pekerja?
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
              Anda akan menghapus{' '}
              <span className="text-slate-900 dark:text-white">
                {selectedWorkerIds.size} pekerja
              </span>{' '}
              beserta data presensinya. Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmBulkDelete}
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

export default WorkforceManagement;
