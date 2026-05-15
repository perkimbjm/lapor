
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Complaint, ComplaintStatus, RoadType, RoadTypeLabel } from '../../types';
import { parseFirestoreDate, formatIndonesianDate } from '../../src/lib/dateUtils';
import StatusBadge from '../../components/StatusBadge';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../components/AuthContext';
import { logAuditActivity, AuditAction } from '../../src/lib/auditLogger';
import { TEXT_COLOR, ICON_COLOR } from '../../src/lib/colors';
import * as XLSX from 'xlsx';
import imageCompression from 'browser-image-compression';
import {
  Search, Filter, X, MapPin, Calendar, User, Phone,
  Image as ImageIcon, Save, CheckCircle2, Truck,
  RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown,
  FileSpreadsheet, Plus, Upload, FileDown, Edit2, Trash2, Loader2,
  AlertCircle, Camera
} from 'lucide-react';
import { exportToExcel } from '../../src/lib/excel';
import { cleanLatInput, cleanLngInput } from '../../src/lib/coordUtils';
import { generateTicketNumber } from '../../constants';

// ── Photo helpers ─────────────────────────────────────────────────────────────

const COMPRESS_OPTS = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true };

async function compressAndUpload(file: File, folder: string): Promise<string> {
  const compressed = await imageCompression(file, COMPRESS_OPTS);
  const filePath = `${folder}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('reports').upload(filePath, compressed);
  if (error) throw error;
  return supabase.storage.from('reports').getPublicUrl(filePath).data.publicUrl;
}

/** Tampilkan foto sebelum / sesudah berdampingan. Tidak render jika keduanya null. */
const BeforeAfterPhoto: React.FC<{ before?: string | null; after?: string | null; compact?: boolean }> = ({ before, after, compact }) => {
  if (!before && !after) return null;
  const h = compact ? 'h-28' : 'h-40';

  const PhotoBox = ({ url, label, accent }: { url?: string | null; label: string; accent?: boolean }) => (
    <div className="flex-1 min-w-0">
      <p className={`text-[9px] font-black uppercase tracking-widest text-center mb-1.5 ${accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" title="Lihat foto ukuran penuh">
          <div className={`rounded-xl overflow-hidden ${accent ? 'border border-emerald-300 dark:border-emerald-700' : 'border border-slate-200 dark:border-slate-700'} bg-slate-100 dark:bg-slate-900 ${h} group`}>
            <img
              src={url}
              alt={label}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              onError={e => { (e.target as HTMLImageElement).closest('a')!.style.display = 'none'; }}
            />
          </div>
        </a>
      ) : (
        <div className={`rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 ${h} flex flex-col items-center justify-center text-slate-400`}>
          <ImageIcon className="w-7 h-7 mb-1 opacity-20" />
          <p className="text-[9px] font-medium">Tidak ada foto</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex gap-3">
      <PhotoBox url={before} label="SEBELUM" />
      <PhotoBox url={after} label="SESUDAH" accent />
    </div>
  );
};

const VALID_CATEGORIES = Object.values(RoadType);
const VALID_STATUSES   = Object.values(ComplaintStatus);

// ── Component ────────────────────────────────────────────────────────────────

const ComplaintList: React.FC = () => {
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string) => void }>();
  const { hasPermission, isAdmin, user, userPhone, roleName } = useAuth();
  const canCreate = hasPermission('COMPLAINTS_CREATE');
  const canUpdate = hasPermission('COMPLAINTS_UPDATE');
  const canDelete = hasPermission('COMPLAINTS_DELETE');

  useEffect(() => { setPageTitle('Daftar Aduan Masuk'); }, [setPageTitle]);

  // ── Data & realtime ─────────────────────────────────────────────────────
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    if (!user) return;

    // Aturan filter:
    // - admin/super_admin/petugas (READ tanpa CREATE) → lihat SEMUA aduan
    // - user (CREATE tanpa UPDATE) → filter by reporter_phone (hanya aduannya sendiri)
    const filterByPhone = roleName === 'user' || (canCreate && !canUpdate && !isAdmin);

    const fetchComplaints = async () => {
      let query = supabase.from('complaints').select('*');

      if (filterByPhone) {
        if (!userPhone) {
          setComplaints([]);
          return;
        }
        query = query.eq('reporter_phone', userPhone);
      }

      const { data, error } = await query;
      if (error) console.error('Error fetching complaints:', error);
      else if (data) setComplaints(data as Complaint[]);
    };

    fetchComplaints();

    // Subscribe sekali. Supabase Realtime auto-reconnect saat tab kembali aktif
    // (via reconnectAfterMs di src/supabase.ts). Tidak ada manual refetch on
    // visibility agar tab switch tidak memicu loading.
    const channel = supabase
      .channel(`complaint-list-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchComplaints)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAdmin, roleName, userPhone, canCreate, canUpdate]);

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  const triggerToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Bulk select ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    try {
      const { error } = await supabase.from('complaints').delete().in('id', [...selectedIds]);
      if (error) throw error;
      await logAuditActivity(AuditAction.DELETE, 'Aduan', `Menghapus ${count} aduan secara massal`);
      triggerToast(`${count} aduan berhasil dihapus`);
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
    } catch (err) {
      console.error('Error bulk deleting complaints:', err);
      triggerToast('Gagal menghapus aduan');
      setShowBulkDeleteModal(false);
    }
  };

  // ── Filters & sorting ───────────────────────────────────────────────────
  const STATUS_PRIORITY = {
    [ComplaintStatus.PENDING]: 0,
    [ComplaintStatus.RECEIVED]: 1,
    [ComplaintStatus.SURVEY]: 2,
    [ComplaintStatus.COMPLETED]: 3,
    [ComplaintStatus.REJECTED]: 4,
  };

  type SortMode = 'newest' | 'oldest';
  type ProcessForm = {
    status: ComplaintStatus;
    rejection_reason: string;
    survey_date: string;
    completion_date: string;
    notes: string;
  };

  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const handleSortToggle = () => {
    setSortMode((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSortMode('newest');
    setSelectedIds(new Set());
  };

  const filteredComplaints = useMemo(() => {
    const isStatusMatch = (cStatus: ComplaintStatus | string | undefined, target: string) => {
      if (target === 'ALL') return true;
      if (cStatus === target) return true;
      const key = (Object.keys(ComplaintStatus) as Array<keyof typeof ComplaintStatus>).find(
        k => ComplaintStatus[k] === target
      );
      return cStatus === key;
    };

    let result = complaints.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (item.ticket_number?.toLowerCase().includes(term) ?? false) ||
        (item.location?.toLowerCase().includes(term) ?? false) ||
        (item.reporter_name?.toLowerCase().includes(term) ?? false);
      return matchesSearch && isStatusMatch(item.status, statusFilter);
    });

    // Pre-compute timestamps and sort with status priority
    return result
      .map(item => ({
        ...item,
        _ts: parseFirestoreDate(item.date_submitted || item.created_at)?.getTime() || null
      }))
      .sort((a, b) => {
        // Primary: status priority
        const statusDiff = (STATUS_PRIORITY[a.status as ComplaintStatus] ?? 99) - (STATUS_PRIORITY[b.status as ComplaintStatus] ?? 99);
        if (statusDiff !== 0) return statusDiff;

        // Secondary: date sorting with edge case handling
        if (!a._ts && !b._ts) return 0;
        if (!a._ts) return 1;  // items without dates go to end
        if (!b._ts) return -1;

        return sortMode === 'newest' ? b._ts - a._ts : a._ts - b._ts;
      });
  }, [complaints, searchTerm, statusFilter, sortMode, STATUS_PRIORITY]);

  const isFiltered = searchTerm !== '' || statusFilter !== 'ALL' || sortMode !== 'newest';

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    const allIds = filteredComplaints.map(c => c.id);
    const selectedCount = allIds.filter(id => selectedIds.has(id)).length;
    selectAllRef.current.indeterminate = selectedCount > 0 && selectedCount < allIds.length;
  }, [selectedIds, filteredComplaints]);

  // ── Detail modal ─────────────────────────────────────────────────────────
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen]           = useState(false);

  const handleDetailClick = (c: Complaint) => {
    setSelectedComplaint(c);
    setIsDetailOpen(true);
  };

  // ── Process (status update) modal ────────────────────────────────────────
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [processForm, setProcessForm] = useState<ProcessForm>({
    status: ComplaintStatus.RECEIVED,
    rejection_reason: '',
    survey_date: '',
    completion_date: '',
    notes: ''
  });

  // ── Photo upload state (process modal) ──────────────────────────────────────
  const [photoBeforeFile, setPhotoBeforeFile]   = useState<File | null>(null);
  const [photoAfterFile, setPhotoAfterFile]     = useState<File | null>(null);
  const [photoBeforePreview, setPhotoBeforePreview] = useState<string | null>(null);
  const [photoAfterPreview, setPhotoAfterPreview]   = useState<string | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos]   = useState(false);

  const handlePhotoSelect = (file: File, which: 'before' | 'after') => {
    const url = URL.createObjectURL(file);
    if (which === 'before') { setPhotoBeforeFile(file); setPhotoBeforePreview(url); }
    else                    { setPhotoAfterFile(file);  setPhotoAfterPreview(url);  }
  };

  const handleProcessClick = (c: Complaint) => {
    setSelectedComplaint(c);
    setProcessForm({
      status: c.status,
      rejection_reason: c.rejection_reason || '',
      survey_date: c.survey_date || '',
      completion_date: c.completion_date || '',
      notes: c.notes || ''
    });
    setPhotoBeforeFile(null);   setPhotoBeforePreview(null);
    setPhotoAfterFile(null);    setPhotoAfterPreview(null);
    setIsProcessOpen(true);
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsUploadingPhotos(true);
    try {
      // Upload new photos if selected (with compression)
      let newBeforeUrl = selectedComplaint.image_url ?? null;
      let newAfterUrl  = selectedComplaint.photo_after ?? null;
      if (photoBeforeFile) newBeforeUrl = await compressAndUpload(photoBeforeFile, 'complaints/before');
      if (photoAfterFile)  newAfterUrl  = await compressAndUpload(photoAfterFile,  'complaints/after');

      const updateData: Partial<Complaint> = {
        status: processForm.status,
        rejection_reason: processForm.status === ComplaintStatus.REJECTED ? processForm.rejection_reason : undefined,
        survey_date: processForm.status === ComplaintStatus.SURVEY ? processForm.survey_date : (selectedComplaint.survey_date || undefined),
        completion_date: processForm.status === ComplaintStatus.COMPLETED ? processForm.completion_date : (selectedComplaint.completion_date || undefined),
        notes: processForm.notes || null,
        date_updated: new Date().toISOString(),
        ...(newBeforeUrl !== (selectedComplaint.image_url ?? null) && { image_url: newBeforeUrl ?? undefined }),
        ...(processForm.status === ComplaintStatus.COMPLETED && { photo_after: newAfterUrl ?? undefined }),
      };
      const { error } = await supabase.from('complaints').update(updateData).eq('id', selectedComplaint.id);
      if (error) throw error;
      await logAuditActivity(AuditAction.UPDATE, 'Aduan', `Memperbarui status aduan ${selectedComplaint.ticket_number || selectedComplaint.id.substring(0, 8)} menjadi ${processForm.status}`);
      setIsProcessOpen(false);
      setSelectedComplaint(null);
      setPhotoBeforeFile(null); setPhotoBeforePreview(null);
      setPhotoAfterFile(null);  setPhotoAfterPreview(null);
      triggerToast('Aduan berhasil diproses dan diperbarui');
    } catch (err) {
      console.error('Error updating complaint:', err);
      triggerToast('Gagal memperbarui aduan');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  // ── Add/Edit modal ───────────────────────────────────────────────────────
  const emptyForm = {
    ticket_number: '',
    category: RoadType.JALAN as string,
    reporter_name: '',
    reporter_phone: '',
    location: '',
    lat: '' as string | number,
    lng: '' as string | number,
    description: '',
    status: ComplaintStatus.PENDING as string,
    date_submitted: new Date().toISOString().split('T')[0]
  };

  const [isAddEditOpen, setIsAddEditOpen]     = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [addEditForm, setAddEditForm]           = useState({ ...emptyForm });
  const [isSubmittingAddEdit, setIsSubmittingAddEdit] = useState(false);
  const [latCleaned, setLatCleaned] = useState(false);
  const [lngCleaned, setLngCleaned] = useState(false);
  const [coordOutOfRange, setCoordOutOfRange] = useState(false);

  const handleAddClick = () => {
    setEditingComplaint(null);
    setAddEditForm({ ...emptyForm, ticket_number: generateTicketNumber() });
    setLatCleaned(false);
    setLngCleaned(false);
    setCoordOutOfRange(false);
    setIsAddEditOpen(true);
  };

  const handleEditComplaintClick = (c: Complaint) => {
    setEditingComplaint(c);
    setAddEditForm({
      ticket_number: c.ticket_number || '',
      category: c.category,
      reporter_name: c.reporter_name,
      reporter_phone: c.reporter_phone,
      location: c.location,
      lat: c.lat != null ? c.lat.toFixed(7) : '',
      lng: c.lng != null ? c.lng.toFixed(7) : '',
      description: c.description,
      status: c.status,
      date_submitted: c.date_submitted ? c.date_submitted.slice(0, 10) : new Date().toISOString().split('T')[0]
    });
    setLatCleaned(false);
    setLngCleaned(false);
    setCoordOutOfRange(false);
    setIsAddEditOpen(true);
  };

  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAddEdit(true);
    try {
      const payload: Partial<Complaint> & { created_at?: string } = {
        ticket_number: addEditForm.ticket_number || generateTicketNumber(),
        category:       addEditForm.category as RoadType,
        reporter_name:  addEditForm.reporter_name,
        reporter_phone: addEditForm.reporter_phone,
        location:       addEditForm.location,
        lat:            addEditForm.lat !== '' ? Number(addEditForm.lat) : undefined,
        lng:            addEditForm.lng !== '' ? Number(addEditForm.lng) : undefined,
        description:    addEditForm.description,
        status:         addEditForm.status as ComplaintStatus,
        date_submitted: addEditForm.date_submitted,
        date_updated:   new Date().toISOString()
      };

      if (editingComplaint) {
        const { error } = await supabase.from('complaints').update(payload).eq('id', editingComplaint.id);
        if (error) throw error;
        await logAuditActivity(AuditAction.UPDATE, 'Aduan', `Mengedit aduan ${payload.ticket_number}`);
        triggerToast('Aduan berhasil diperbarui');
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from('complaints').insert([payload]);
        if (error) throw error;
        await logAuditActivity(AuditAction.CREATE, 'Aduan', `Menambahkan aduan baru ${payload.ticket_number}`);
        triggerToast('Aduan berhasil ditambahkan');
      }
      setIsAddEditOpen(false);
    } catch (err: unknown) {
      console.error('Error saving complaint:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      triggerToast(`Gagal menyimpan: ${msg}`);
    } finally {
      setIsSubmittingAddEdit(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteComplaint = async (c: Complaint) => {
    if (!window.confirm(`Hapus aduan ${c.ticket_number}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('complaints').delete().eq('id', c.id);
      if (error) throw error;
      await logAuditActivity(AuditAction.DELETE, 'Aduan', `Menghapus aduan ${c.ticket_number}`);
      triggerToast('Aduan berhasil dihapus');
    } catch (err) {
      console.error('Error deleting complaint:', err);
      triggerToast('Gagal menghapus aduan');
    }
  };

  // ── Export Excel ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const dataToExport = filteredComplaints.map(c => ({
      'Nomor Tiket':   c.ticket_number,
      'Kategori':      c.category,
      'Pelapor':       c.reporter_name,
      'No. Telepon':   c.reporter_phone,
      'Lokasi':        c.location,
      'Latitude':      c.lat ?? '',
      'Longitude':     c.lng ?? '',
      'Status':        c.status,
      'Tanggal Masuk': c.date_submitted ? new Date(c.date_submitted).toLocaleDateString('id-ID') : '',
      'Deskripsi':     c.description,
      'Catatan':       c.notes || '-'
    }));
    exportToExcel(dataToExport, `Daftar_Aduan_${new Date().toISOString().split('T')[0]}`, 'Daftar Aduan');
  };

  // ── Download template ────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Nomor Tiket':   'ADU-20240101-00001 (kosongkan untuk auto-generate)',
        'Kategori':      'Jalan',
        'Nama Pelapor':  'Budi Santoso',
        'No. Telepon':   '08123456789',
        'Lokasi':        'Jl. A. Yani KM 5, Banjarmasin',
        'Latitude':      '-3.3194',
        'Longitude':     '114.5928',
        'Deskripsi':     'Jalan berlubang cukup dalam di bahu jalan',
        'Status':        'Belum dikerjakan',
        'Tanggal Masuk': '2024-01-15'
      }
    ];

    const notes = [
      { 'Keterangan': '=== PETUNJUK PENGISIAN ===' },
      { 'Keterangan': 'Kolom Kategori: isi dengan "Jalan" atau "Jembatan"' },
      { 'Keterangan': 'Kolom Status: Belum dikerjakan | Diterima | Tidak diterima | Disurvey | Selesai dikerjakan' },
      { 'Keterangan': 'Kolom Latitude/Longitude: format desimal, contoh -3.3194 / 114.5928 (opsional)' },
      { 'Keterangan': 'Kolom Tanggal Masuk: format YYYY-MM-DD, contoh 2024-01-15' },
      { 'Keterangan': 'Nomor Tiket: biarkan kosong untuk dibuat otomatis' },
    ];

    const wb  = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(template);
    const ws2 = XLSX.utils.json_to_sheet(notes);

    // Set column widths
    ws1['!cols'] = [
      { wch: 40 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
      { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 50 },
      { wch: 22 }, { wch: 15 }
    ];
    ws2['!cols'] = [{ wch: 80 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Template Aduan');
    XLSX.utils.book_append_sheet(wb, ws2, 'Petunjuk');
    XLSX.writeFile(wb, 'Template_Import_Aduan.xlsx');
  };

  // ── Import Excel ─────────────────────────────────────────────────────────
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const buffer = await file.arrayBuffer();
      // cellDates: true converts Excel date serial numbers → JS Date objects
      const wb     = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (!rows.length) {
        triggerToast('File tidak memiliki data');
        return;
      }

      setImportProgress({ done: 0, total: rows.length });
      let successCount = 0;
      let failCount    = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const ticketNum = (row['Nomor Tiket'] || '').toString().trim();
        const isAutoTicket = !ticketNum || ticketNum.startsWith('ADU-') && ticketNum.includes('auto-generate');

        const category = (row['Kategori'] || row['category'] || '').toString().trim();
        if (!VALID_CATEGORIES.includes(category as RoadType)) {
          failCount++;
          setImportProgress({ done: i + 1, total: rows.length });
          continue;
        }

        const status = (row['Status'] || row['status'] || ComplaintStatus.PENDING).toString().trim();
        const finalStatus = VALID_STATUSES.includes(status as ComplaintStatus) ? status : ComplaintStatus.PENDING;

        const latRaw = (row['Latitude'] ?? row['lat'] ?? '').toString().trim();
        const lngRaw = (row['Longitude'] ?? row['lng'] ?? '').toString().trim();

        const latResult = latRaw !== '' ? cleanLatInput(latRaw) : null;
        const lngResult = lngRaw !== '' ? cleanLngInput(lngRaw) : null;

        const payload: Partial<Complaint> & { created_at?: string } = {
          ticket_number:  isAutoTicket ? generateTicketNumber() : ticketNum,
          category:       category as RoadType,
          reporter_name:  (row['Nama Pelapor'] || row['reporter_name'] || 'Import').toString().trim(),
          reporter_phone: (row['No. Telepon'] || row['reporter_phone'] || '').toString().trim(),
          location:       (row['Lokasi'] || row['location'] || '').toString().trim(),
          lat:            latResult?.value ?? undefined,
          lng:            lngResult?.value ?? undefined,
          description:    (row['Deskripsi'] || row['description'] || '').toString().trim(),
          status:         finalStatus as ComplaintStatus,
          is_bulk:        true,
          date_submitted: (() => {
            const raw = row['Tanggal Masuk'] ?? row['date_submitted'];
            if (!raw) return new Date().toISOString().split('T')[0];
            if (raw instanceof Date) return raw.toISOString().split('T')[0];
            const s = raw.toString().trim();
            // Guard against Excel serial numbers that slipped through
            const n = Number(s);
            if (!isNaN(n) && n > 1000 && n < 100000) {
              // Convert Excel serial to JS Date (Excel epoch is 1899-12-30)
              return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().split('T')[0];
            }
            return s;
          })(),
          date_updated:   new Date().toISOString(),
          created_at:     new Date().toISOString()
        };

        const { error } = await supabase.from('complaints').insert([payload]);
        if (error) { console.error(`Row ${i + 1} error:`, error); failCount++; }
        else successCount++;

        setImportProgress({ done: i + 1, total: rows.length });
      }

      await logAuditActivity(AuditAction.CREATE, 'Aduan', `Import Excel: ${successCount} berhasil, ${failCount} gagal`);
      triggerToast(`Import selesai: ${successCount} berhasil${failCount ? `, ${failCount} gagal (kategori tidak valid)` : ''}`);
    } catch (err) {
      console.error('Import error:', err);
      triggerToast('Gagal membaca file Excel');
    } finally {
      setImportProgress(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      {toast?.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Import progress overlay */}
      {importProgress && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-4 rounded-2xl shadow-2xl min-w-[260px]">
          <p className="text-xs font-black text-slate-700 dark:text-white uppercase mb-2">
            Mengimpor data… {importProgress.done}/{importProgress.total}
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-200"
              style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-180px)]">

        {/* ── Toolbar ── */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* Left: action buttons + search */}
          <div className="flex items-center gap-2 flex-1 flex-wrap max-w-3xl">
            {/* Tambah */}
            {canCreate && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
              >
                <Plus size={15} /> Tambah
              </button>
            )}

            {/* Import Excel */}
            {canCreate && (
              <>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                >
                  <Upload size={15} /> Import Excel
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                  title="Unduh template Excel"
                >
                  <FileDown size={15} /> Template
                </button>
              </>
            )}

            {/* Export */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            >
              <FileSpreadsheet size={15} /> Export
            </button>

            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-4 w-4 ${ICON_COLOR.MUTED}`} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-8 sm:text-sm border-slate-300 dark:border-slate-600 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
                placeholder="Cari tiket, lokasi, pelapor…"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className={`absolute inset-y-0 right-0 pr-3 flex items-center ${ICON_COLOR.MUTED} hover:text-slate-600 dark:hover:text-slate-300`}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Right: status filter + reset */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className={`h-4 w-4 ${ICON_COLOR.MUTED}`} />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-9 pr-9 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
              >
                <option value="ALL">Semua Status</option>
                {Object.values(ComplaintStatus).map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${ICON_COLOR.MUTED}`}>
                <ChevronDown size={14} />
              </div>
            </div>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <RotateCcw size={15} />
                <span className="hidden lg:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 relative">
            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
              <tr>
                {canDelete && (
                  <th className="px-4 py-3 w-12 bg-slate-50 dark:bg-slate-900/50">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 cursor-pointer"
                      checked={filteredComplaints.length > 0 && filteredComplaints.every(c => selectedIds.has(c.id))}
                      onChange={() => toggleSelectAll(filteredComplaints.map(c => c.id))}
                    />
                  </th>
                )}
                <th
                  className={`px-6 py-3 text-left text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider cursor-pointer group hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none`}
                  onClick={handleSortToggle}
                >
                  <div className="flex items-center gap-1.5">
                    Tiket / Tanggal
                    {sortMode === 'newest' ? <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" /> :
                     <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />}
                  </div>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider`}>Lokasi & Kategori</th>
                <th className={`px-6 py-3 text-left text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider`}>Status</th>
                <th className={`px-6 py-3 text-left text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredComplaints.length > 0 ? filteredComplaints.map(complaint => (
                <tr key={complaint.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${selectedIds.has(complaint.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  {canDelete && (
                    <td className="px-4 py-4 w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 cursor-pointer"
                        checked={selectedIds.has(complaint.id)}
                        onChange={() => toggleSelectOne(complaint.id)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{complaint.ticket_number}</div>
                    <div className={`text-xs ${TEXT_COLOR.SECONDARY} mt-1 flex items-center`}>
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatIndonesianDate(complaint.date_submitted || complaint.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={complaint.location}>{complaint.location}</div>
                    <div className={`text-xs ${TEXT_COLOR.SECONDARY} mt-0.5`}>{RoadTypeLabel[complaint.category]}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={complaint.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDetailClick(complaint)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-semibold transition-colors"
                      >
                        Detail
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => handleProcessClick(complaint)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold transition-colors"
                        >
                          Proses
                        </button>
                      )}
                      {canUpdate && (
                        <button
                          onClick={() => handleEditComplaintClick(complaint)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComplaint(complaint)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={canDelete ? 5 : 4} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Search className={`h-6 w-6 ${ICON_COLOR.MUTED}`} />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Tidak ada aduan ditemukan</h3>
                    <p className={`mt-1 text-sm ${TEXT_COLOR.SECONDARY}`}>Coba ubah kata kunci atau filter status.</p>
                    {isFiltered && (
                      <button onClick={resetFilters} className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Tampilkan Semua Aduan
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {isDetailOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Detail Aduan <span className="text-blue-600 dark:text-blue-400 font-mono text-base bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">{selectedComplaint.ticket_number}</span>
                </h3>
                <p className={`text-xs ${TEXT_COLOR.SECONDARY} mt-1`}>Dikirim: {formatIndonesianDate(selectedComplaint.date_submitted || selectedComplaint.created_at, true)}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Before/After photos for completed complaints, single photo otherwise */}
              {selectedComplaint.photo_after ? (
                <BeforeAfterPhoto before={selectedComplaint.image_url} after={selectedComplaint.photo_after} />
              ) : selectedComplaint.image_url ? (
                <div className="relative w-full h-64 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 group border border-slate-200 dark:border-slate-700">
                  <img src={selectedComplaint.image_url} alt="Bukti Laporan" className="w-full h-full object-cover" loading="lazy" />
                  <a href={selectedComplaint.image_url} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center hover:bg-blue-600 transition-colors">
                    <ImageIcon className="w-3 h-3 mr-1" /> Lihat Full
                  </a>
                </div>
              ) : (
                <div className="w-full h-64 rounded-xl flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Tidak ada foto bukti</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={`text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider mb-1 block`}>Pelapor</label>
                    <div className="flex items-center text-slate-900 dark:text-white font-medium"><User className={`w-4 h-4 mr-2 ${ICON_COLOR.MUTED}`} />{selectedComplaint.reporter_name}</div>
                    <div className="flex items-center text-slate-900 dark:text-white font-medium mt-2">
                      <Phone className={`w-4 h-4 mr-2 ${ICON_COLOR.MUTED}`} />
                      {selectedComplaint.reporter_phone ? (
                        <a href={`https://wa.me/${selectedComplaint.reporter_phone.startsWith('0') ? '62' + selectedComplaint.reporter_phone.slice(1) : selectedComplaint.reporter_phone}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{selectedComplaint.reporter_phone}</a>
                      ) : <span className="text-slate-500 italic text-sm">Tidak ada nomor</span>}
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider mb-1 block`}>Lokasi</label>
                    <div className="flex items-start text-slate-900 dark:text-white font-medium"><MapPin className={`w-4 h-4 mr-2 ${ICON_COLOR.MUTED} mt-0.5 shrink-0`} /><span>{selectedComplaint.location}</span></div>
                    <a href={`https://www.google.com/maps?q=${selectedComplaint.lat},${selectedComplaint.lng}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-6 mt-1 block">Buka di Google Maps</a>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider mb-1 block`}>Status Terkini</label>
                    <StatusBadge status={selectedComplaint.status} />
                  </div>
                  <div>
                    <label className={`text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider mb-1 block`}>Kategori Objek</label>
                    <div className="text-slate-900 dark:text-white font-medium border-l-2 border-blue-500 pl-3">{selectedComplaint.category}</div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <label className={`text-xs font-bold ${TEXT_COLOR.TERTIARY} uppercase tracking-wider mb-2 block`}>Deskripsi Masalah</label>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">"{selectedComplaint.description}"</p>
              </div>
              {(selectedComplaint.rejection_reason || selectedComplaint.survey_date || selectedComplaint.completion_date || selectedComplaint.notes) && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center"><Truck className="w-4 h-4 mr-2" /> Info Penanganan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedComplaint.status === ComplaintStatus.REJECTED && selectedComplaint.rejection_reason && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg md:col-span-2">
                        <span className={`text-xs ${TEXT_COLOR.SECONDARY} block`}>Alasan Tidak Dikerjakan</span>
                        <span className="font-semibold text-red-700 dark:text-red-300 text-sm">{selectedComplaint.rejection_reason}</span>
                      </div>
                    )}
                    {selectedComplaint.survey_date && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <span className={`text-xs ${TEXT_COLOR.SECONDARY} block`}>Tanggal Disurvey</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{new Date(selectedComplaint.survey_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    )}
                    {selectedComplaint.completion_date && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                        <span className={`text-xs ${TEXT_COLOR.SECONDARY} block`}>Tanggal Selesai</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">{new Date(selectedComplaint.completion_date).toLocaleDateString('id-ID')}</span>
                      </div>
                    )}
                    {selectedComplaint.notes && (
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg md:col-span-2">
                        <span className={`text-xs ${TEXT_COLOR.SECONDARY} block`}>Keterangan Tambahan</span>
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{selectedComplaint.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button onClick={() => setIsDetailOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Tutup</button>
              {canUpdate && (
                <button
                  onClick={() => { setIsDetailOpen(false); handleProcessClick(selectedComplaint); }}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Tindak Lanjuti
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Process Modal ── */}
      {isProcessOpen && selectedComplaint && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProcessOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 duration-200">

            {/* ── Header (sticky) ── */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-blue-600 dark:bg-slate-900 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Update Progres
                </h3>
                <p className="text-[11px] text-blue-100/80 mt-0.5 font-mono">{selectedComplaint.ticket_number} · {selectedComplaint.category}</p>
              </div>
              <button onClick={() => setIsProcessOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <form id="process-form" onSubmit={handleProcessSubmit} className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-5 space-y-4">

                {/* Status selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status Pekerjaan</label>
                  <select
                    value={processForm.status}
                    onChange={e => setProcessForm({...processForm, status: e.target.value as ComplaintStatus})}
                    className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={ComplaintStatus.RECEIVED}>Diterima</option>
                    <option value={ComplaintStatus.REJECTED}>Tidak diterima</option>
                    <option value={ComplaintStatus.SURVEY}>Disurvey</option>
                    <option value={ComplaintStatus.COMPLETED}>Selesai dikerjakan</option>
                  </select>
                </div>

                {/* REJECTED — alasan */}
                {processForm.status === ComplaintStatus.REJECTED && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Alasan Tidak Dikerjakan</label>
                    <textarea
                      value={processForm.rejection_reason}
                      onChange={e => setProcessForm({...processForm, rejection_reason: e.target.value})}
                      placeholder="Berikan alasan penolakan..."
                      rows={3}
                      required
                      className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* SURVEY — tanggal survei */}
                {processForm.status === ComplaintStatus.SURVEY && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tanggal Disurvey</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className={`h-4 w-4 ${ICON_COLOR.MUTED}`} /></div>
                      <input type="date" value={processForm.survey_date} onChange={e => setProcessForm({...processForm, survey_date: e.target.value})} required className="block w-full pl-10 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                )}

                {/* COMPLETED — tanggal + foto */}
                {processForm.status === ComplaintStatus.COMPLETED && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">

                    {/* Tanggal selesai */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tanggal Selesai Dikerjakan</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className={`h-4 w-4 ${ICON_COLOR.MUTED}`} /></div>
                        <input type="date" value={processForm.completion_date} onChange={e => setProcessForm({...processForm, completion_date: e.target.value})} required className="block w-full pl-10 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>

                    {/* Foto dokumentasi — side-by-side */}
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 overflow-hidden">
                      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-100/60 dark:bg-emerald-900/30">
                        <Camera className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Foto Dokumentasi <span className="font-normal normal-case tracking-normal opacity-70">(opsional)</span></p>
                      </div>

                      <div className="grid grid-cols-2 gap-px bg-emerald-200 dark:bg-emerald-800">
                        {/* Foto Sebelum */}
                        <div className="bg-emerald-50/80 dark:bg-slate-800/80 p-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Sebelum</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-1.5">sama dengan bukti dukung</p>

                          {/* Preview */}
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            {(photoBeforePreview || selectedComplaint?.image_url) ? (
                              <>
                                <img
                                  src={photoBeforePreview ?? selectedComplaint!.image_url!}
                                  alt="Sebelum"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                                {photoBeforePreview && (
                                  <span className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">BARU</span>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1">
                                <ImageIcon className="w-6 h-6 opacity-40" />
                                <span className="text-[10px]">Belum ada</span>
                              </div>
                            )}
                          </div>

                          {/* Upload trigger */}
                          <label className="flex items-center justify-center gap-1.5 cursor-pointer w-full py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <Upload className="w-3 h-3" />
                            <span>{(selectedComplaint?.image_url || photoBeforePreview) ? 'Ganti' : 'Upload'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f, 'before'); }} />
                          </label>
                        </div>

                        {/* Foto Sesudah */}
                        <div className="bg-emerald-50/80 dark:bg-slate-800/80 p-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sesudah</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-1.5">foto setelah dikerjakan</p>

                          {/* Preview */}
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700">
                            {(photoAfterPreview || selectedComplaint?.photo_after) ? (
                              <>
                                <img
                                  src={photoAfterPreview ?? selectedComplaint!.photo_after!}
                                  alt="Sesudah"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                                {photoAfterPreview && (
                                  <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">BARU</span>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1">
                                <Camera className="w-6 h-6 opacity-40" />
                                <span className="text-[10px]">Belum ada</span>
                              </div>
                            )}
                          </div>

                          {/* Upload trigger */}
                          <label className="flex items-center justify-center gap-1.5 cursor-pointer w-full py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                            <Upload className="w-3 h-3" />
                            <span>{(selectedComplaint?.photo_after || photoAfterPreview) ? 'Ganti' : 'Upload'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f, 'after'); }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keterangan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Keterangan <span className="font-normal text-slate-400">(Opsional)</span></label>
                  <textarea
                    value={processForm.notes}
                    onChange={e => setProcessForm({...processForm, notes: e.target.value})}
                    placeholder="Catatan tambahan mengenai progres..."
                    rows={2}
                    className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

              </div>
            </form>

            {/* ── Footer (sticky) ── */}
            <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex gap-3">
              <button
                type="button"
                onClick={() => setIsProcessOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="process-form"
                disabled={isUploadingPhotos}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isUploadingPhotos
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload…</>
                  : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddEditOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {editingComplaint ? `Edit Aduan — ${editingComplaint.ticket_number}` : 'Tambah Aduan Baru'}
              </h3>
              <button onClick={() => setIsAddEditOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddEditSubmit} className="p-6 space-y-4 overflow-y-auto">

              {/* Nomor Tiket */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Nomor Tiket</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addEditForm.ticket_number}
                      onChange={e => setAddEditForm({...addEditForm, ticket_number: e.target.value})}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      placeholder="Auto-generate jika kosong"
                    />
                    <button
                      type="button"
                      onClick={() => setAddEditForm({...addEditForm, ticket_number: generateTicketNumber()})}
                      className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
                      title="Generate ulang"
                    >
                      ↺ Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Tanggal Masuk</label>
                  <input
                    type="date"
                    required
                    value={addEditForm.date_submitted}
                    onChange={e => setAddEditForm({...addEditForm, date_submitted: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Kategori + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Kategori <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={addEditForm.category}
                    onChange={e => setAddEditForm({...addEditForm, category: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(RoadType).map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Status</label>
                  <select
                    value={addEditForm.status}
                    onChange={e => setAddEditForm({...addEditForm, status: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(ComplaintStatus).map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pelapor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Nama Pelapor <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={addEditForm.reporter_name}
                    onChange={e => setAddEditForm({...addEditForm, reporter_name: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nama lengkap pelapor"
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>No. Telepon</label>
                  <input
                    type="text"
                    value={addEditForm.reporter_phone}
                    onChange={e => setAddEditForm({...addEditForm, reporter_phone: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="08xx-xxxx-xxxx"
                  />
                </div>
              </div>

              {/* Lokasi */}
              <div>
                <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Lokasi <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={addEditForm.location}
                  onChange={e => setAddEditForm({...addEditForm, location: e.target.value})}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Jl. A. Yani KM 5, Banjarmasin"
                />
              </div>

              {/* Koordinat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>
                    Latitude <span className={`${TEXT_COLOR.SECONDARY} font-normal lowercase`}>(opsional)</span>
                    {latCleaned && <span className="ml-1 text-amber-500 font-normal normal-case text-[9px]">diperbaiki</span>}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addEditForm.lat}
                    onChange={e => { setAddEditForm({...addEditForm, lat: e.target.value}); setLatCleaned(false); }}
                    onBlur={e => {
                      if (!e.target.value.trim()) return;
                      const r = cleanLatInput(e.target.value);
                      if (r.value !== null) {
                        setAddEditForm(f => ({...f, lat: r.display}));
                        setLatCleaned(r.cleaned);
                        setCoordOutOfRange(!r.valid);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none ${
                      coordOutOfRange && addEditForm.lat
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:text-white dark:border-amber-600'
                        : 'border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                    }`}
                    placeholder="-3.3194"
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>
                    Longitude <span className={`${TEXT_COLOR.SECONDARY} font-normal lowercase`}>(opsional)</span>
                    {lngCleaned && <span className="ml-1 text-amber-500 font-normal normal-case text-[9px]">diperbaiki</span>}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addEditForm.lng}
                    onChange={e => { setAddEditForm({...addEditForm, lng: e.target.value}); setLngCleaned(false); }}
                    onBlur={e => {
                      if (!e.target.value.trim()) return;
                      const r = cleanLngInput(e.target.value);
                      if (r.value !== null) {
                        setAddEditForm(f => ({...f, lng: r.display}));
                        setLngCleaned(r.cleaned);
                        setCoordOutOfRange(!r.valid);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none ${
                      coordOutOfRange && addEditForm.lng
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:text-white dark:border-amber-600'
                        : 'border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                    }`}
                    placeholder="114.5928"
                  />
                </div>
              </div>
              {coordOutOfRange && (addEditForm.lat || addEditForm.lng) && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Koordinat di luar area Banjarmasin (lat: -3.x s.d. -4.x, lng: 114.x). Data akan tetap tersimpan tetapi tidak tampil di peta.
                  </p>
                </div>
              )}

              {/* Deskripsi */}
              <div>
                <label className={`block text-[10px] font-black ${TEXT_COLOR.TERTIARY} uppercase mb-1`}>Deskripsi Kerusakan <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={addEditForm.description}
                  onChange={e => setAddEditForm({...addEditForm, description: e.target.value})}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Deskripsikan kerusakan yang dilaporkan…"
                />
              </div>

              {/* Info tip untuk import */}
              {!editingComplaint && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                  <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">Untuk input banyak data sekaligus, gunakan fitur <strong>Import Excel</strong> dengan template yang tersedia.</p>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddEdit}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-colors flex justify-center items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSubmittingAddEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingComplaint ? 'Simpan Perubahan' : 'Tambah Aduan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Floating Bulk Action Bar ── */}
      {canDelete && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={18} className="text-blue-400" />
          <span className="text-sm font-bold">{selectedIds.size} aduan dipilih</span>
          <div className="w-px h-6 bg-slate-600" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-red-600/30"
          >
            <Trash2 size={14} />
            Hapus
          </button>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ── */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowBulkDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Hapus {selectedIds.size} Aduan?</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">
              Anda akan menghapus <span className="text-slate-900 dark:text-white">{selectedIds.size} aduan</span> yang dipilih. Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
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

export default ComplaintList;
