
import React, { useState, useMemo, useRef, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Worker, AttendanceRecord, RoadType, Holiday } from '../../types';
import { db, auth } from '../../src/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../src/lib/firestoreErrorHandler';
import { 
  Users, 
  Calendar, 
  Plus, 
  Pencil, 
  Trash2, 
  Banknote, 
  ChevronDown,
  XCircle,
  TrendingUp,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileText,
  Trash
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const WorkforceManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RoadType>(RoadType.JALAN);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(1);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'cms', 'connection-test'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firebase connection test failed: client is offline. Check configuration.");
        }
      }
    };
    testConnection();

    const qWorkers = query(collection(db, 'workers'));
    const unsubscribeWorkers = onSnapshot(qWorkers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Worker));
      setWorkers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));

    const qAttendance = query(collection(db, 'attendance'));
    const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord));
      setAttendance(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

    const qHolidays = query(collection(db, 'holidays'));
    const unsubscribeHolidays = onSnapshot(qHolidays, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Holiday));
      setHolidays(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'holidays'));

    return () => {
      unsubscribeWorkers();
      unsubscribeAttendance();
      unsubscribeHolidays();
    };
  }, []);

  const getWeekDates = (year: number, month: number, weekIndex: number) => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const firstMonday = new Date(firstDayOfMonth);
    firstMonday.setDate(firstMonday.getDate() - diffToMonday);
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(weekStart.getDate() + (weekIndex - 1) * 7);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const currentWeekDates = useMemo(() => {
    if (selectedWeek === 'all') return [];
    return getWeekDates(Number(selectedYear), Number(selectedMonth), Number(selectedWeek));
  }, [selectedYear, selectedMonth, selectedWeek]);

  const isHoliday = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.find(h => h.date === dateStr);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedYear, selectedMonth, selectedWeek]);


  const [formData, setFormData] = useState({
    name: '',
    category: RoadType.JALAN,
    dailyRate: 170000,
    otRate1: 70000,
    otRate2: 120000,
    otRate3: 170000,
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0
  });

  // --- Calculations ---
  const filteredWorkers = useMemo(() => workers.filter(w => w.category === activeTab), [workers, activeTab]);

  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredWorkers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWorkers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);

  const calculateWage = (record: AttendanceRecord, worker: Worker) => {
    const presence = record.presence;
    const days = Object.values(presence);
    const standardDays = days.filter(d => d === 1).length;
    const overtime1Days = days.filter(d => d === 2).length;
    const overtime2Days = days.filter(d => d === 3).length;
    const overtime3Days = days.filter(d => d === 4).length;
    
    return (standardDays * worker.dailyRate) + 
           (overtime1Days * (worker.otRate1 || 0)) + 
           (overtime2Days * (worker.otRate2 || 0)) + 
           (overtime3Days * (worker.otRate3 || 0));
  };

  const getAttendanceRecordsForWorker = (workerId: string) => {
    return attendance.filter(a => {
      const [year, month] = a.month.split('-');
      const yearMatch = year === selectedYear;
      const monthMatch = selectedMonth === 'all' || Number(month) === Number(selectedMonth);
      const weekMatch = selectedWeek === 'all' || a.week === selectedWeek;
      return yearMatch && monthMatch && weekMatch && a.workerId === workerId;
    });
  };

  const calculateTotalWage = (records: AttendanceRecord[], worker: Worker) => {
    return records.reduce((total, record) => total + calculateWage(record, worker), 0);
  };

  const totalWage = useMemo(() => {
    return filteredWorkers.reduce((acc, worker) => {
      const records = getAttendanceRecordsForWorker(worker.id);
      return acc + calculateTotalWage(records, worker);
    }, 0);
  }, [filteredWorkers, attendance, selectedYear, selectedMonth, selectedWeek]);

  const chartData = useMemo(() => {
    if (selectedMonth === 'all') {
      // Show Months of the Year
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      return months.map((monthName, idx) => {
        const monthNum = idx + 1;
        const count = attendance.filter(a => {
          const [year, month] = a.month.split('-');
          const isWorkerInTab = filteredWorkers.some(w => w.id === a.workerId);
          return year === selectedYear && Number(month) === monthNum && isWorkerInTab;
        }).length;
        return { name: monthName, count };
      });
    }

    if (selectedWeek === 'all') {
      // Show Weeks of the Month
      const weeks = [1, 2, 3, 4, 5];
      return weeks.map(weekNum => {
        const count = attendance.filter(a => {
          const [year, month] = a.month.split('-');
          const isWorkerInTab = filteredWorkers.some(w => w.id === a.workerId);
          return year === selectedYear && Number(month) === Number(selectedMonth) && a.week === weekNum && isWorkerInTab;
        }).length;
        return { name: `W${weekNum}`, count };
      });
    }

    // Show Days of the Week (Default)
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
    return days.map((day, idx) => {
      const count = attendance.filter(a => {
        const [year, month] = a.month.split('-');
        const yearMatch = year === selectedYear;
        const monthMatch = Number(month) === Number(selectedMonth);
        const weekMatch = a.week === selectedWeek;
        const isWorkerInTab = filteredWorkers.some(w => w.id === a.workerId);
        return yearMatch && monthMatch && weekMatch && isWorkerInTab && (a.presence as any)[day] > 0;
      }).length;
      return { name: dayNames[idx], count };
    });
  }, [attendance, selectedYear, selectedMonth, selectedWeek, filteredWorkers]);

  // --- Excel Operations ---
  const handleExport = () => {
    const dataToExport = filteredWorkers.map((worker, index) => {
      const records = getAttendanceRecordsForWorker(worker.id);
      const totalPresence = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 1).length, 0);
      const totalOT1 = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 2).length, 0);
      const totalOT2 = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 3).length, 0);
      const totalOT3 = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 4).length, 0);
      const totalOT = totalOT1 + totalOT2 + totalOT3;
      
      return {
        'Tahun': selectedYear,
        'Bulan': selectedMonth === 'all' ? 'Semua' : selectedMonth,
        'Pekan': selectedWeek === 'all' ? 'Semua' : selectedWeek,
        'No': index + 1,
        'Nama Pekerja': worker.name,
        'Hadir Biasa': totalPresence,
        'Hadir Lembur': totalOT,
        'Total Upah': calculateTotalWage(records, worker)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi');
    const fileName = `Rekap_Tenaga_Kerja_${selectedYear}_M${selectedMonth}_W${selectedWeek}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportIndividualSlip = (worker: Worker) => {
    const records = getAttendanceRecordsForWorker(worker.id);
    if (records.length === 0) {
      toast.error(`Data presensi untuk ${worker.name} tidak ditemukan.`);
      return;
    }

    const wage = calculateTotalWage(records, worker);
    const totalPresence = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 1).length, 0);
    const totalOT1 = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 2).length, 0);
    const totalOT2 = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 3).length, 0);
    const totalOT3 = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 4).length, 0);
    const totalOT = totalOT1 + totalOT2 + totalOT3;

    const data = [
      { 
        'SLIP GAJI': 'UPT PJJ BANJARMASIN',
        'Periode': `${selectedYear} - Bulan ${selectedMonth} - Pekan ${selectedWeek}`,
        'Nama Pekerja': worker.name,
        'Jabatan': worker.category,
        'Upah Harian': worker.dailyRate,
        'Bonus Lembur 1': worker.otRate1,
        'Bonus Lembur 2': worker.otRate2,
        'Bonus Lembur 3': worker.otRate3,
        'Total Hadir Biasa': totalPresence,
        'Total Hadir Lembur': totalOT,
        'TOTAL UPAH': wage
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Slip Gaji');
    XLSX.writeFile(workbook, `SlipGaji_${worker.name.replace(/\s+/g, '_')}_${selectedYear}_M${selectedMonth}.xlsx`);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Pekan': 1,
        'Nama Pekerja': 'Ahmad Fulan',
        'Kategori': 'Jalan',
        'Upah Harian': 170000,
        'Bonus Lembur 1': 70000,
        'Bonus Lembur 2': 120000,
        'Bonus Lembur 3': 170000,
        'Senin': 1, 'Selasa': 1, 'Rabu': 1, 'Kamis': 1, 'Jumat': 1, 'Sabtu': 2, 'Minggu': 0
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import');
    XLSX.writeFile(workbook, 'Template_MultiPekan_Tenaga_Kerja.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newWorkersMap = new Map<string, Worker>();
        const newRecords: AttendanceRecord[] = [];

        data.forEach((row, i) => {
          const name = row['Nama Pekerja'] || `Pekerja-${i}`;
          const cat = row['Kategori']?.toLowerCase().includes('jembatan') ? RoadType.JEMBATAN : RoadType.JALAN;
          const weekFromRow = Number(row['Pekan']) || (selectedWeek === 'all' ? 1 : selectedWeek);
          
          if (!newWorkersMap.has(name)) {
            newWorkersMap.set(name, {
              id: `imp-${name.replace(/\s+/g, '-').toLowerCase()}`,
              name: name,
              category: cat,
              dailyRate: Number(row['Upah Harian']) || 170000,
              otRate1: Number(row['Bonus Lembur 1']) || 70000,
              otRate2: Number(row['Bonus Lembur 2']) || 120000,
              otRate3: Number(row['Bonus Lembur 3']) || 170000
            });
          }

          const currentWorker = newWorkersMap.get(name)!;

          newRecords.push({
            id: `rec-${Date.now()}-${i}`,
            workerId: currentWorker.id,
            month: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`,
            week: weekFromRow,
            presence: {
              monday: Number(row['Senin']) || 0,
              tuesday: Number(row['Selasa']) || 0,
              wednesday: Number(row['Rabu']) || 0,
              thursday: Number(row['Kamis']) || 0,
              friday: Number(row['Jumat']) || 0,
              saturday: Number(row['Sabtu']) || 0,
              sunday: Number(row['Minggu']) || 0
            }
          });
        });

        setWorkers(prev => {
          const existingNames = new Set(prev.map(w => w.name));
          const trulyNewWorkers = Array.from(newWorkersMap.values()).filter(w => !existingNames.has(w.name));
          return [...prev, ...trulyNewWorkers];
        });

        setAttendance(prev => {
          const existing = [...prev];
          newRecords.forEach(nr => {
            const idx = existing.findIndex(e => e.workerId === nr.workerId && e.month === nr.month && e.week === nr.week);
            if (idx > -1) existing[idx] = nr;
            else existing.push(nr);
          });
          return existing;
        });

        toast.success(`Berhasil mengimpor data dari file.`);
      } catch (err) {
        console.error(err);
        toast.error('Gagal membaca file Excel.');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- CRUD Handlers ---
  const openModal = (worker?: Worker) => {
    if (worker) {
      setIsEditing(true);
      setSelectedWorkerId(worker.id);
      const records = getAttendanceRecordsForWorker(worker.id);
      const record = records[0]; // Just take the first one found for editing if in specific view
      setFormData({
        name: worker.name,
        category: worker.category,
        dailyRate: worker.dailyRate,
        otRate1: worker.otRate1 || 70000,
        otRate2: worker.otRate2 || 120000,
        otRate3: worker.otRate3 || 170000,
        monday: record?.presence.monday || 0,
        tuesday: record?.presence.tuesday || 0,
        wednesday: record?.presence.wednesday || 0,
        thursday: record?.presence.thursday || 0,
        friday: record?.presence.friday || 0,
        saturday: record?.presence.saturday || 0,
        sunday: record?.presence.sunday || 0
      });
    } else {
      setIsEditing(false);
      setSelectedWorkerId(null);
      setFormData({
        name: '',
        category: activeTab,
        dailyRate: 170000,
        otRate1: 70000,
        otRate2: 120000,
        otRate3: 170000,
        monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus data pekerja ini?')) {
      try {
        try {
          await deleteDoc(doc(db, 'workers', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `workers/${id}`);
        }
        // Also delete attendance records for this worker
        const workerAttendance = attendance.filter(a => a.workerId === id);
        for (const record of workerAttendance) {
          try {
            await deleteDoc(doc(db, 'attendance', record.id));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `attendance/${record.id}`);
          }
        }
      } catch (error) {
        console.error('Error deleting worker:', error);
        toast.error('Gagal menghapus data pekerja');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const workerId = selectedWorkerId || `w-${Date.now()}`;
    const workerData = {
      name: formData.name,
      category: formData.category,
      dailyRate: Number(formData.dailyRate),
      otRate1: Number(formData.otRate1),
      otRate2: Number(formData.otRate2),
      otRate3: Number(formData.otRate3)
    };

    const attendanceData = {
      workerId: workerId,
      month: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`,
      week: selectedWeek === 'all' ? 1 : selectedWeek,
      presence: {
        monday: formData.monday,
        tuesday: formData.tuesday,
        wednesday: formData.wednesday,
        thursday: formData.thursday,
        friday: formData.friday,
        saturday: formData.saturday,
        sunday: formData.sunday
      }
    };

    try {
      if (isEditing && selectedWorkerId) {
        try {
          await setDoc(doc(db, 'workers', selectedWorkerId), { id: selectedWorkerId, ...workerData }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `workers/${selectedWorkerId}`);
        }
        // Update attendance record if exists
        const existingRecord = attendance.find(a => a.workerId === selectedWorkerId && a.month === attendanceData.month && a.week === attendanceData.week);
        if (existingRecord) {
          try {
            await setDoc(doc(db, 'attendance', existingRecord.id), attendanceData, { merge: true });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `attendance/${existingRecord.id}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'attendance'), attendanceData);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'attendance');
          }
        }
      } else {
        try {
          await setDoc(doc(db, 'workers', workerId), { id: workerId, ...workerData });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'workers');
        }
        try {
          await addDoc(collection(db, 'attendance'), attendanceData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'attendance');
        }
      }
      setIsModalOpen(false);
      toast.success(isEditing ? 'Data pekerja berhasil diupdate' : 'Data pekerja berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving worker:', error);
      toast.error('Gagal menyimpan data pekerja');
    }
  };


  const renderCell = (val: number) => {
    if (val === 1) return <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 font-black text-xs">1</div>;
    if (val === 2) return <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-xs">2</div>;
    if (val === 3) return <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-400 font-black text-xs">3</div>;
    if (val === 4) return <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-black text-xs">4</div>;
    return <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 font-black text-xs">-</div>;
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Hapus hari libur ini?')) return;
    try {
      try {
        await deleteDoc(doc(db, 'holidays', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `holidays/${id}`);
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value as 'National' | 'Cuti Bersama';

    if (!date || !name) return;

    try {
      try {
        await addDoc(collection(db, 'holidays'), { date, name, type });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'holidays');
      }
      form.reset();
    } catch (error) {
      console.error("Error adding holiday:", error);
    }
  };

  return (
    <AdminLayout title="Manajemen Tenaga Kerja">
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsHolidayModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Kelola Hari Libur</h3>
              <button onClick={() => setIsHolidayModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tanggal</label>
                <input name="date" type="date" required className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nama Hari Libur</label>
                <input name="name" type="text" placeholder="Contoh: Idul Fitri" required className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipe</label>
                <div className="flex gap-2">
                  <select name="type" className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="National">Nasional</option>
                    <option value="Cuti Bersama">Cuti Bersama</option>
                  </select>
                  <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </form>

            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {holidays.sort((a,b) => a.date.localeCompare(b.date)).map(holiday => (
                  <div key={holiday.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${holiday.type === 'National' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{holiday.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase">{new Date(holiday.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {holiday.type}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteHoliday(holiday.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
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
      )}

      
      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><Banknote size={80} /></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/30 rounded-2xl backdrop-blur-md shadow-inner"><Banknote size={24}/></div>
              <span className="text-[10px] font-black uppercase bg-white/30 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                {selectedMonth === 'all' ? selectedYear : `Bulan ${selectedMonth}`} - {selectedWeek === 'all' ? 'Semua Pekan' : `Pekan ${selectedWeek}`}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">Total Upah {activeTab}</p>
            <h3 className="text-3xl font-black tabular-nums">Rp {totalWage.toLocaleString('id-ID')}</h3>
            <div className="mt-4 flex items-center gap-2 text-blue-100 text-[10px] font-bold">
              <TrendingUp size={14}/> <span>Penggajian Terotomatisasi</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 md:col-span-2">
           <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                Statistik Kehadiran {selectedMonth === 'all' ? 'Tahunan' : selectedWeek === 'all' ? 'Bulanan' : 'Mingguan'}
              </h4>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"></span><span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-300">Pekerja Hadir</span></div>
              </div>
           </div>
            <div className="h-28 w-full min-w-0 min-h-0">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={chartData}>
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} hide />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '10px', borderRadius: '8px'}} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 w-full lg:w-auto overflow-hidden">
          <button 
            onClick={() => setActiveTab(RoadType.JALAN)}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === RoadType.JALAN ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Pekerja Jalan
          </button>
          <button 
            onClick={() => setActiveTab(RoadType.JEMBATAN)}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === RoadType.JEMBATAN ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Pekerja Jembatan
          </button>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[100px]">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full pl-4 pr-10 py-3 text-[11px] font-black uppercase border border-slate-100 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none outline-none shadow-sm"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-[140px]">
            <select 
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (e.target.value === 'all') setSelectedWeek('all');
              }}
              className="w-full pl-4 pr-10 py-3 text-[11px] font-black uppercase border border-slate-100 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none outline-none shadow-sm"
            >
              <option value="all">Semua Bulan</option>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m.toString()}>Bulan {m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-[120px]">
            <select 
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              disabled={selectedMonth === 'all'}
              className="w-full pl-4 pr-10 py-3 text-[11px] font-black uppercase border border-slate-100 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 appearance-none outline-none shadow-sm disabled:opacity-50"
            >
              <option value="all">Semua Pekan</option>
              <option value={1}>Pekan 1</option>
              <option value={2}>Pekan 2</option>
              <option value={3}>Pekan 3</option>
              <option value={4}>Pekan 4</option>
              <option value={5}>Pekan 5</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button 
            onClick={() => setIsHolidayModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all w-full lg:w-auto"
          >
            <Calendar size={16}/> Kelola Hari Libur
          </button>
          <button 
            onClick={() => openModal()}
            disabled={selectedMonth === 'all' || selectedWeek === 'all'}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full lg:w-auto disabled:opacity-50"
          >
            <Plus size={16}/> Tambah Pekerja
          </button>
        </div>
      </div>

      {/* Data Operations Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Pengelolaan Data Excel (Multi-Pekan)</h5>
               <p className="text-[9px] text-slate-500 dark:text-slate-300 font-bold uppercase">Sertakan kolom "Pekan" untuk import banyak data sekaligus</p>
            </div>
         </div>
         <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleExport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
               <Download size={14} /> Export Excel
            </button>
            <div className="flex-1 sm:flex-none relative">
               <input 
                 type="file" 
                 ref={fileInputRef}
                 onChange={handleImport}
                 accept=".xlsx, .xls"
                 className="hidden"
               />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isProcessing}
                 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
               >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Import Excel
               </button>
            </div>
            <button 
              onClick={downloadTemplate}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
            >
               <FileSpreadsheet size={14} /> Unduh Template
            </button>
         </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 w-16">No</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200">Nama Pekerja</th>
                {selectedWeek !== 'all' && currentWeekDates.length > 0 ? (
                  <>
                    {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
                      const date = currentWeekDates[idx];
                      const holiday = isHoliday(date);
                      const isCurrentMonth = date.getMonth() + 1 === Number(selectedMonth);
                      return (
                        <th key={day} className={`px-3 py-5 text-[10px] font-black uppercase tracking-widest text-center ${!isCurrentMonth ? 'opacity-30' : holiday ? 'text-red-500' : 'text-slate-500 dark:text-slate-200'}`}>
                          <div className="flex flex-col items-center">
                            <span>{day}</span>
                            <span className="text-[9px] mt-0.5">{date.getDate()}</span>
                            {holiday && <span className="text-[7px] mt-0.5 truncate max-w-[40px]">{holiday.name}</span>}
                          </div>
                        </th>
                      );
                    })}
                  </>
                ) : selectedWeek !== 'all' ? (
                  <>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Sen</th>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Sel</th>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Rab</th>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Kam</th>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Jum</th>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Sab</th>
                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Min</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Total Hadir</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Total Lembur</th>
                  </>
                )}
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-right">
                  Upah {selectedWeek === 'all' ? (selectedMonth === 'all' ? 'Tahun' : 'Bulan') : `Pekan ${selectedWeek}`}
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-200 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedWorkers.map((worker, index) => {
                const records = getAttendanceRecordsForWorker(worker.id);
                const totalWageVal = calculateTotalWage(records, worker);
                const totalPresence = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d === 1).length, 0);
                const totalOT = records.reduce((acc, r) => acc + Object.values(r.presence).filter(d => d > 1).length, 0);
                const record = records[0]; // For daily view
                const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-6 py-5 text-xs font-bold text-slate-400 dark:text-slate-300">{actualIndex}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{worker.name}</div>
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase mt-0.5 tracking-wider">Rp {worker.dailyRate.toLocaleString()} / Hari</div>
                    </td>
                    {selectedWeek !== 'all' ? (
                      <>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, idx) => {
                          const date = currentWeekDates[idx];
                          const holiday = isHoliday(date);
                          return (
                            <td key={day} className={`px-3 py-5 text-center ${holiday ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                              {renderCell((record?.presence as any)?.[day] || 0)}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300">{totalPresence} Hari</td>
                        <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300">{totalOT} Hari</td>
                      </>
                    )}
                    <td className="px-6 py-5 text-right">
                       <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">Rp {totalWageVal.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                         <button 
                            onClick={() => handleExportIndividualSlip(worker)} 
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm" 
                            title="Cetak Slip Gaji"
                         >
                            <FileText size={14}/>
                         </button>
                         <button 
                            onClick={() => openModal(worker)} 
                            className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm" 
                            title="Edit Presensi"
                         >
                            <Pencil size={14}/>
                         </button>
                         <button 
                            onClick={() => handleDelete(worker.id)} 
                            className="p-2 text-slate-400 hover:text-red-600 transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm" 
                            title="Hapus"
                         >
                            <Trash2 size={14}/>
                         </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredWorkers.length === 0 && (
                <tr>
                   <td colSpan={11} className="px-6 py-12 text-center text-slate-400 dark:text-slate-300 text-xs italic">Belum ada data pekerja untuk kategori ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination & Footer Info */}
        <div className="px-6 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
           {/* Pagination Controls - Only show when "Semua Bulan" or many data */}
           {(selectedMonth === 'all' || filteredWorkers.length > 5) && (
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-300">Tampilkan</span>
                   <select 
                     value={itemsPerPage}
                     onChange={(e) => setItemsPerPage(Number(e.target.value))}
                     className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500"
                   >
                      {[5, 10, 25, 50].map(limit => (
                        <option key={limit} value={limit}>{limit}</option>
                      ))}
                   </select>
                   <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-300">Data per halaman</span>
                </div>

                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                   >
                     Prev
                   </button>
                   <div className="flex items-center gap-1 px-4">
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{currentPage}</span>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-300">/</span>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-300">{totalPages || 1}</span>
                   </div>
                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
                 <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-green-500"></div> 1 = Hadir</div>
                 <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> 2 = Lembur 1</div>
                 <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500"></div> 3 = Lembur 2</div>
                 <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></div> 4 = Lembur 3</div>
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                <AlertTriangle size={10} /> 
                <span>Total upah dihitung otomatis dari presensi harian per pekan.</span>
              </div>
              <p className="hidden md:block text-slate-400 dark:text-slate-300">*Banjarmasin Maju Sejahtera</p>
           </div>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
               <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">{isEditing ? 'Update' : 'Tambah'} Pekerja & Presensi</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">Nama Pekerja</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Ahmad ..."/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">Kategori</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as RoadType})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                       <option value={RoadType.JALAN}>Pekerja Jalan</option>
                       <option value={RoadType.JEMBATAN}>Pekerja Jembatan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">Upah Harian (Rp)</label>
                    <input type="number" required value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: Number(e.target.value)})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">Bonus Lembur 1 (Rp)</label>
                    <input type="number" required value={formData.otRate1} onChange={e => setFormData({...formData, otRate1: Number(e.target.value)})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">Bonus Lembur 2 (Rp)</label>
                    <input type="number" required value={formData.otRate2} onChange={e => setFormData({...formData, otRate2: Number(e.target.value)})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-1 block">Bonus Lembur 3 (Rp)</label>
                    <input type="number" required value={formData.otRate3} onChange={e => setFormData({...formData, otRate3: Number(e.target.value)})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
                  </div>
               </div>

               <div>
                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-widest mb-4 block">Presensi Harian (Kode: 0=Absen, 1=Hadir, 2=Lembur 1, 3=Lembur 2, 4=Lembur 3)</label>
                 <div className="grid grid-cols-7 gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <div key={day} className="text-center">
                         <label className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-300 mb-1 block">{day.substring(0,3)}</label>
                         <select 
                           value={(formData as any)[day]} 
                           onChange={e => setFormData({...formData, [day]: Number(e.target.value)})}
                           className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white text-center outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                         >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                         </select>
                      </div>
                    ))}
                 </div>
               </div>

               <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500">Batalkan</button>
                  <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan Data</button>
               </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default WorkforceManagement;
