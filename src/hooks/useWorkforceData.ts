import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import {
  type Worker,
  type AttendanceRecord,
  type Holiday,
  RoadType,
  type AttendanceRow,
} from '../../types';
import { supabase } from '../supabase';
import { DEFAULT_WORKFORCE_RATES } from '../../constants';
import { logAuditActivity, AuditAction } from '../lib/auditLogger';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// ── Shared types ────────────────────────────────────────────────────────────

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface WorkforceRates {
  dailyRate: number;
  otRate1: number;
  otRate2: number;
  otRate3: number;
}

export interface WorkerFormData {
  name: string;
  category: RoadType;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface ChartEntry {
  name: string;
  count: number;
}

// ── Utility ─────────────────────────────────────────────────────────────────

/** Returns the 7 Date objects for the given ISO-week (1-based) of a month/year. */
export function getWeekDates(year: number, month: number, weekIndex: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  const dow = firstDay.getDay();
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstMonday.getDate() - diffToMonday);
  const weekStart = new Date(firstMonday);
  weekStart.setDate(weekStart.getDate() + (weekIndex - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ── Hook options ────────────────────────────────────────────────────────────

interface UseWorkforceDataOptions {
  restrictToOwn: boolean;
  workerId?: string | null;
  selectedYear: string;
  selectedMonth: string;
  selectedWeek: number | 'all';
  activeTab: RoadType;
  canManageExcel: boolean;
  canManageHolidays: boolean;
  canManageRates: boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkforceData({
  restrictToOwn,
  workerId,
  selectedYear,
  selectedMonth,
  selectedWeek,
  activeTab,
  canManageExcel,
  canManageHolidays,
  canManageRates,
}: UseWorkforceDataOptions) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [globalRates, setGlobalRates] = useState<WorkforceRates>({ ...DEFAULT_WORKFORCE_RATES });
  const [isSavingRates, setIsSavingRates] = useState(false);

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchWorkers = useCallback(async () => {
    let query = supabase.from('workers').select('*');
    if (restrictToOwn && workerId) query = query.eq('id', workerId);
    const { data } = await query;
    if (data) setWorkers(data as Worker[]);
  }, [restrictToOwn, workerId]);

  const fetchAttendance = useCallback(async () => {
    let query = supabase.from('attendance').select('*');
    if (restrictToOwn && workerId) query = query.eq('worker_id', workerId);
    const { data } = await query;
    if (data) {
      setAttendance(
        data.map((row: AttendanceRow) => ({
          id: row.id,
          worker_id: row.worker_id,
          month: row.month,
          week: row.week,
          presence: {
            monday: row.monday ?? 0,
            tuesday: row.tuesday ?? 0,
            wednesday: row.wednesday ?? 0,
            thursday: row.thursday ?? 0,
            friday: row.friday ?? 0,
            saturday: row.saturday ?? 0,
            sunday: row.sunday ?? 0,
          },
        })),
      );
    }
  }, [restrictToOwn, workerId]);

  const fetchHolidays = useCallback(async () => {
    const { data } = await supabase.from('holidays').select('*');
    if (data) setHolidays(data as Holiday[]);
  }, []);

  const fetchRates = useCallback(async () => {
    const { data } = await supabase
      .from('cms')
      .select('*')
      .eq('id', 'workforce_rates')
      .single();
    if (data?.data) {
      const d = data.data as Partial<WorkforceRates>;
      setGlobalRates({
        dailyRate: d.dailyRate ?? DEFAULT_WORKFORCE_RATES.dailyRate,
        otRate1: d.otRate1 ?? DEFAULT_WORKFORCE_RATES.otRate1,
        otRate2: d.otRate2 ?? DEFAULT_WORKFORCE_RATES.otRate2,
        otRate3: d.otRate3 ?? DEFAULT_WORKFORCE_RATES.otRate3,
      });
    }
  }, []);

  // ── Realtime subscriptions (replaces 6s polling) ───────────────────────────

  useEffect(() => {
    fetchWorkers();
    fetchAttendance();
    fetchHolidays();
    fetchRates();

    const workersChannel = supabase
      .channel('workforce-workers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, fetchWorkers)
      .subscribe();

    const attendanceChannel = supabase
      .channel('workforce-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchAttendance)
      .subscribe();

    const holidaysChannel = supabase
      .channel('workforce-holidays')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, fetchHolidays)
      .subscribe();

    const cmsChannel = supabase
      .channel('workforce-cms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms' }, fetchRates)
      .subscribe();

    return () => {
      supabase.removeChannel(workersChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(holidaysChannel);
      supabase.removeChannel(cmsChannel);
    };
  }, [fetchWorkers, fetchAttendance, fetchHolidays, fetchRates]);

  // ── Derived / computed values ──────────────────────────────────────────────

  const filteredWorkers = useMemo(
    () => workers.filter(w => w.category === activeTab),
    [workers, activeTab],
  );

  const isHoliday = useCallback(
    (date: Date): Holiday | undefined => {
      const dateStr = date.toISOString().split('T')[0];
      return holidays.find(h => h.date === dateStr);
    },
    [holidays],
  );

  const calculateWage = useCallback(
    (record: AttendanceRecord): number => {
      const vals = Object.values(record.presence);
      return (
        vals.filter(d => d === 1).length * globalRates.dailyRate +
        vals.filter(d => d === 2).length * globalRates.otRate1 +
        vals.filter(d => d === 3).length * globalRates.otRate2 +
        vals.filter(d => d === 4).length * globalRates.otRate3
      );
    },
    [globalRates],
  );

  const getAttendanceRecordsForWorker = useCallback(
    (worker_id: string): AttendanceRecord[] =>
      attendance.filter(a => {
        const [year, month] = a.month.split('-');
        return (
          year === selectedYear &&
          (selectedMonth === 'all' || Number(month) === Number(selectedMonth)) &&
          (selectedWeek === 'all' || a.week === selectedWeek) &&
          a.worker_id === worker_id
        );
      }),
    [attendance, selectedYear, selectedMonth, selectedWeek],
  );

  const calculateTotalWage = useCallback(
    (records: AttendanceRecord[]) =>
      records.reduce((acc, r) => acc + calculateWage(r), 0),
    [calculateWage],
  );

  const totalWage = useMemo(
    () =>
      filteredWorkers.reduce(
        (acc, w) => acc + calculateTotalWage(getAttendanceRecordsForWorker(w.id)),
        0,
      ),
    [filteredWorkers, calculateTotalWage, getAttendanceRecordsForWorker],
  );

  const chartData = useMemo((): ChartEntry[] => {
    if (selectedMonth === 'all') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return months.map((name, idx) => ({
        name,
        count: attendance.filter(a => {
          const [y, m] = a.month.split('-');
          return (
            y === selectedYear &&
            Number(m) === idx + 1 &&
            filteredWorkers.some(w => w.id === a.worker_id)
          );
        }).length,
      }));
    }

    if (selectedWeek === 'all') {
      return [1, 2, 3, 4, 5].map(wk => ({
        name: `W${wk}`,
        count: attendance.filter(a => {
          const [y, m] = a.month.split('-');
          return (
            y === selectedYear &&
            Number(m) === Number(selectedMonth) &&
            a.week === wk &&
            filteredWorkers.some(w => w.id === a.worker_id)
          );
        }).length,
      }));
    }

    const dayKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
    return dayKeys.map((day, idx) => ({
      name: dayNames[idx],
      count: attendance.filter(a => {
        const [y, m] = a.month.split('-');
        return (
          y === selectedYear &&
          Number(m) === Number(selectedMonth) &&
          a.week === selectedWeek &&
          filteredWorkers.some(w => w.id === a.worker_id) &&
          (a.presence as Record<DayKey, number>)[day] > 0
        );
      }).length,
    }));
  }, [attendance, selectedYear, selectedMonth, selectedWeek, filteredWorkers]);

  // ── CRUD operations ────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (
      formData: WorkerFormData,
      isEditing: boolean,
      selectedWorkerId: string | null,
      week: number,
    ): Promise<boolean> => {
      const presenceData = {
        monday: formData.monday,
        tuesday: formData.tuesday,
        wednesday: formData.wednesday,
        thursday: formData.thursday,
        friday: formData.friday,
        saturday: formData.saturday,
        sunday: formData.sunday,
      };
      const month = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

      try {
        if (isEditing && selectedWorkerId) {
          const { error: wErr } = await supabase
            .from('workers')
            .update({ name: formData.name, category: formData.category })
            .eq('id', selectedWorkerId);
          if (wErr) throw wErr;
          await logAuditActivity(
            AuditAction.UPDATE,
            'Tenaga Kerja',
            `Memperbarui tenaga kerja ${formData.name}`,
          );

          const records = getAttendanceRecordsForWorker(selectedWorkerId);
          const existing = records.find(a => a.month === month && a.week === week);
          if (existing) {
            const { error } = await supabase
              .from('attendance')
              .update(presenceData)
              .eq('id', existing.id);
            if (error) throw error;
            await logAuditActivity(
              AuditAction.UPDATE,
              'Presensi',
              `Memperbarui presensi ${formData.name} (Pekan ${week}, ${month})`,
            );
          } else {
            const { error } = await supabase
              .from('attendance')
              .insert([{ worker_id: selectedWorkerId, month, week, ...presenceData }]);
            if (error) throw error;
            await logAuditActivity(
              AuditAction.CREATE,
              'Presensi',
              `Menambahkan presensi ${formData.name} (Pekan ${week}, ${month})`,
            );
          }
        } else {
          const { data: newWorker, error: wErr } = await supabase
            .from('workers')
            .insert([{ name: formData.name, category: formData.category }])
            .select()
            .single();
          if (wErr) throw wErr;
          await logAuditActivity(
            AuditAction.CREATE,
            'Tenaga Kerja',
            `Menambahkan tenaga kerja ${formData.name}`,
          );

          const { error } = await supabase
            .from('attendance')
            .insert([{ worker_id: newWorker.id, month, week, ...presenceData }]);
          if (error) throw error;
          await logAuditActivity(
            AuditAction.CREATE,
            'Presensi',
            `Menambahkan presensi ${formData.name} (Pekan ${week}, ${month})`,
          );
        }

        toast.success(isEditing ? 'Data pekerja berhasil diupdate' : 'Data pekerja berhasil ditambahkan');
        return true;
      } catch (err) {
        console.error('Error saving worker:', err);
        toast.error('Gagal menyimpan data pekerja');
        return false;
      }
    },
    [selectedYear, selectedMonth, getAttendanceRecordsForWorker],
  );

  const handleDelete = useCallback(async (id: string, name: string): Promise<void> => {
    try {
      const { error: wErr } = await supabase.from('workers').delete().eq('id', id);
      if (wErr) console.error('Error deleting worker:', wErr);
      else await logAuditActivity(AuditAction.DELETE, 'Tenaga Kerja', `Menghapus tenaga kerja ${name}`);

      const { error: aErr } = await supabase.from('attendance').delete().eq('worker_id', id);
      if (aErr) console.error('Error deleting attendance:', aErr);

      toast.success('Pekerja berhasil dihapus');
    } catch (err) {
      console.error('Error deleting worker:', err);
      toast.error('Gagal menghapus data pekerja');
    }
  }, []);

  const handleBulkDelete = useCallback(async (ids: Set<string>): Promise<void> => {
    const count = ids.size;
    if (!count) return;
    try {
      const { error: wErr } = await supabase.from('workers').delete().in('id', [...ids]);
      if (wErr) throw wErr;
      const { error: aErr } = await supabase.from('attendance').delete().in('worker_id', [...ids]);
      if (aErr) console.error('Error deleting attendance:', aErr);
      await logAuditActivity(
        AuditAction.DELETE,
        'Tenaga Kerja',
        `Menghapus ${count} tenaga kerja secara massal`,
      );
      toast.success(`${count} pekerja berhasil dihapus`);
    } catch (err) {
      console.error('Error bulk deleting:', err);
      toast.error('Gagal menghapus data pekerja');
      throw err;
    }
  }, []);

  const handleSaveRates = useCallback(async (): Promise<void> => {
    if (!canManageRates) return;
    setIsSavingRates(true);
    try {
      const { error } = await supabase.from('cms').upsert({
        id: 'workforce_rates',
        data: globalRates,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      await logAuditActivity(AuditAction.UPDATE, 'Tenaga Kerja', 'Memperbarui tarif upah global');
      toast.success('Tarif upah berhasil disimpan');
    } catch (err) {
      console.error('Save rates error:', err);
      toast.error('Gagal menyimpan tarif upah');
    } finally {
      setIsSavingRates(false);
    }
  }, [canManageRates, globalRates]);

  const handleAddHoliday = useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      if (!canManageHolidays) return;
      const form = e.target as HTMLFormElement;
      const date = (form.elements.namedItem('date') as HTMLInputElement).value;
      const name = (form.elements.namedItem('name') as HTMLInputElement).value;
      const type = (form.elements.namedItem('type') as HTMLSelectElement).value as Holiday['type'];
      if (!date || !name) return;
      try {
        const { error } = await supabase.from('holidays').insert([{ date, name, type }]);
        if (error) console.error('Add holiday error:', error);
        else form.reset();
      } catch (err) {
        console.error('Error adding holiday:', err);
      }
    },
    [canManageHolidays],
  );

  const handleDeleteHoliday = useCallback(
    async (id: string, _name: string): Promise<void> => {
      if (!canManageHolidays) return;
      try {
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (error) console.error('Holiday delete error:', error);
        else toast.success('Hari libur berhasil dihapus');
      } catch (err) {
        console.error('Error deleting holiday:', err);
        toast.error('Gagal menghapus hari libur');
      }
    },
    [canManageHolidays],
  );

  // ── Excel operations ───────────────────────────────────────────────────────

  const handleExport = useCallback((): void => {
    if (!canManageExcel) return;
    const rows = filteredWorkers.map((w, i) => {
      const records = getAttendanceRecordsForWorker(w.id);
      return {
        Tahun: selectedYear,
        Bulan: selectedMonth === 'all' ? 'Semua' : selectedMonth,
        Pekan: selectedWeek === 'all' ? 'Semua' : selectedWeek,
        No: i + 1,
        'Nama Pekerja': w.name,
        'Hadir Biasa': records.reduce(
          (acc, r) => acc + Object.values(r.presence).filter(d => d === 1).length,
          0,
        ),
        'Hadir Lembur': records.reduce(
          (acc, r) => acc + Object.values(r.presence).filter(d => d > 1).length,
          0,
        ),
        'Total Upah': calculateTotalWage(records),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi');
    XLSX.writeFile(wb, `Rekap_Tenaga_Kerja_${selectedYear}_M${selectedMonth}_W${selectedWeek}.xlsx`);
  }, [canManageExcel, filteredWorkers, getAttendanceRecordsForWorker, calculateTotalWage, selectedYear, selectedMonth, selectedWeek]);

  const handleExportSlip = useCallback(
    (worker: Worker): void => {
      const records = getAttendanceRecordsForWorker(worker.id);
      if (!records.length) {
        toast.error(`Data presensi untuk ${worker.name} tidak ditemukan.`);
        return;
      }
      const wage = calculateTotalWage(records);
      const totalPresence = records.reduce(
        (acc, r) => acc + Object.values(r.presence).filter(d => d === 1).length,
        0,
      );
      const totalOT = records.reduce(
        (acc, r) => acc + Object.values(r.presence).filter(d => d > 1).length,
        0,
      );
      const data = [
        {
          'SLIP GAJI': 'UPT PJJ BANJARMASIN',
          Periode: `${selectedYear} - Bulan ${selectedMonth} - Pekan ${selectedWeek}`,
          'Nama Pekerja': worker.name,
          Jabatan: worker.category,
          'Upah Harian': globalRates.dailyRate,
          'Bonus Lembur 1': globalRates.otRate1,
          'Bonus Lembur 2': globalRates.otRate2,
          'Bonus Lembur 3': globalRates.otRate3,
          'Total Hadir Biasa': totalPresence,
          'Total Hadir Lembur': totalOT,
          'TOTAL UPAH': wage,
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Slip Gaji');
      XLSX.writeFile(
        wb,
        `SlipGaji_${worker.name.replace(/\s+/g, '_')}_${selectedYear}_M${selectedMonth}.xlsx`,
      );
    },
    [getAttendanceRecordsForWorker, calculateTotalWage, globalRates, selectedYear, selectedMonth, selectedWeek],
  );

  const downloadTemplate = useCallback((): void => {
    if (!canManageExcel) return;
    const template = [
      {
        Pekan: 1,
        'Nama Pekerja': 'Ahmad Fulan',
        Kategori: 'Jalan',
        Senin: 1, Selasa: 1, Rabu: 1, Kamis: 1, Jumat: 1, Sabtu: 2, Minggu: 0,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import');
    XLSX.writeFile(wb, 'Template_MultiPekan_Tenaga_Kerja.xlsx');
  }, [canManageExcel]);

  const handleImport = useCallback(
    (
      e: ChangeEvent<HTMLInputElement>,
      onComplete: () => void,
      setIsProcessing: (v: boolean) => void,
    ): void => {
      if (!canManageExcel) return;
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const bstr = event.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

          const workersMap = new Map<string, Worker>();
          const newRecords: AttendanceRecord[] = [];

          rows.forEach((row, i) => {
            const name = (row['Nama Pekerja'] as string | undefined) || `Pekerja-${i}`;
            const cat = (row['Kategori'] as string | undefined)
              ?.toLowerCase()
              .includes('jembatan')
              ? RoadType.JEMBATAN
              : RoadType.JALAN;
            const weekFromRow = Number(row['Pekan']) || (selectedWeek === 'all' ? 1 : selectedWeek);

            if (!workersMap.has(name)) {
              workersMap.set(name, {
                id: `imp-${name.replace(/\s+/g, '-').toLowerCase()}`,
                name,
                category: cat,
                daily_rate: DEFAULT_WORKFORCE_RATES.dailyRate,
                ot_rate_1: DEFAULT_WORKFORCE_RATES.otRate1,
                ot_rate_2: DEFAULT_WORKFORCE_RATES.otRate2,
                ot_rate_3: DEFAULT_WORKFORCE_RATES.otRate3,
              });
            }

            const currentWorker = workersMap.get(name)!;
            newRecords.push({
              id: `rec-${Date.now()}-${i}`,
              worker_id: currentWorker.id,
              month: `${selectedYear}-${selectedMonth.padStart(2, '0')}`,
              week: weekFromRow,
              presence: {
                monday: Number(row['Senin']) || 0,
                tuesday: Number(row['Selasa']) || 0,
                wednesday: Number(row['Rabu']) || 0,
                thursday: Number(row['Kamis']) || 0,
                friday: Number(row['Jumat']) || 0,
                saturday: Number(row['Sabtu']) || 0,
                sunday: Number(row['Minggu']) || 0,
              },
            });
          });

          setWorkers(prev => {
            const existing = new Set(prev.map(w => w.name));
            return [...prev, ...Array.from(workersMap.values()).filter(w => !existing.has(w.name))];
          });

          setAttendance(prev => {
            const arr = [...prev];
            newRecords.forEach(nr => {
              const idx = arr.findIndex(
                a => a.worker_id === nr.worker_id && a.month === nr.month && a.week === nr.week,
              );
              if (idx > -1) arr[idx] = nr;
              else arr.push(nr);
            });
            return arr;
          });

          toast.success('Berhasil mengimpor data dari file.');
        } catch (err) {
          console.error(err);
          toast.error('Gagal membaca file Excel.');
        } finally {
          setIsProcessing(false);
          onComplete();
        }
      };
      reader.readAsBinaryString(file);
    },
    [canManageExcel, selectedYear, selectedMonth, selectedWeek],
  );

  return {
    // State
    workers,
    attendance,
    holidays,
    globalRates,
    setGlobalRates,
    isSavingRates,
    // Derived
    filteredWorkers,
    chartData,
    totalWage,
    // Helpers
    isHoliday,
    calculateWage,
    getAttendanceRecordsForWorker,
    calculateTotalWage,
    // CRUD
    handleSave,
    handleDelete,
    handleBulkDelete,
    handleSaveRates,
    handleAddHoliday,
    handleDeleteHoliday,
    // Excel
    handleExport,
    handleExportSlip,
    downloadTemplate,
    handleImport,
  };
}
