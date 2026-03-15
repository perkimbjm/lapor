
import React, { useState, useMemo } from 'react';
import AdminLayout from './AdminLayout';
import { MOCK_COMPLAINTS } from '../../constants';
import { Complaint, ComplaintStatus } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Image as ImageIcon, 
  Save, 
  CheckCircle2,
  Truck,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';

const ComplaintList: React.FC = () => {
  // State for Data
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // State for Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // State for Modals
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessOpen, setIsProcessOpen] = useState(false);

  // State for Process Form
  const [processForm, setProcessForm] = useState({
    status: ComplaintStatus.RECEIVED,
    rejectionReason: '',
    surveyDate: '',
    completionDate: '',
    notes: ''
  });

  // --- Handlers ---

  const triggerToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleDetailClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailOpen(true);
  };

  const handleProcessClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setProcessForm({
      status: complaint.status,
      rejectionReason: complaint.rejectionReason || '',
      surveyDate: complaint.surveyDate || '',
      completionDate: complaint.completionDate || '',
      notes: complaint.notes || ''
    });
    setIsProcessOpen(true);
  };

  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const updatedComplaints = complaints.map(c => {
      if (c.id === selectedComplaint.id) {
        return {
          ...c,
          status: processForm.status,
          rejectionReason: processForm.status === ComplaintStatus.REJECTED ? processForm.rejectionReason : undefined,
          surveyDate: processForm.status === ComplaintStatus.SURVEY ? processForm.surveyDate : c.surveyDate,
          completionDate: processForm.status === ComplaintStatus.COMPLETED ? processForm.completionDate : c.completionDate,
          notes: processForm.notes || undefined,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    setComplaints(updatedComplaints);
    setIsProcessOpen(false);
    setSelectedComplaint(null);
    triggerToast('Aduan berhasil diproses dan diperbarui');
  };

  const handleSortByDate = () => {
    if (sortDirection === null) setSortDirection('desc');
    else if (sortDirection === 'desc') setSortDirection('asc');
    else setSortDirection(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSortDirection(null);
  };

  // --- Filtering & Sorting Logic ---
  const filteredComplaints = useMemo(() => {
    let result = complaints.filter(item => {
      const term = searchTerm.toLowerCase();
      
      const matchesSearch = 
        (item.ticketNumber?.toLowerCase().includes(term) ?? false) ||
        (item.location?.toLowerCase().includes(term) ?? false) ||
        (item.reporterName?.toLowerCase().includes(term) ?? false);

      const matchesFilter = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesFilter;
    });

    if (sortDirection) {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.dateSubmitted).getTime();
        const dateB = new Date(b.dateSubmitted).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [complaints, searchTerm, statusFilter, sortDirection]);

  const isFiltered = searchTerm !== '' || statusFilter !== 'ALL' || sortDirection !== null;

  return (
    <AdminLayout title="Daftar Aduan Masuk">
      
      {/* Toast Notification */}
      {toast?.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
             </div>
             <input 
               type="text" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-10 sm:text-sm border-slate-300 dark:border-slate-600 rounded-xl p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 transition-colors" 
               placeholder="Cari tiket, lokasi, atau pelapor..." 
             />
             {searchTerm && (
               <button 
                 onClick={() => setSearchTerm('')}
                 className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
               >
                 <X size={16} />
               </button>
             )}
          </div>
          
          <div className="flex items-center space-x-3">
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-500 dark:text-slate-300" />
               </div>
               <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-10 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold"
               >
                 <option value="ALL">Semua Status</option>
                 <option value={ComplaintStatus.RECEIVED}>{ComplaintStatus.RECEIVED}</option>
                 <option value={ComplaintStatus.REJECTED}>{ComplaintStatus.REJECTED}</option>
                 <option value={ComplaintStatus.SURVEY}>{ComplaintStatus.SURVEY}</option>
                 <option value={ComplaintStatus.COMPLETED}>{ComplaintStatus.COMPLETED}</option>
               </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
               </div>
             </div>

             {isFiltered && (
               <button 
                 onClick={resetFilters}
                 className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                 title="Reset Filter"
               >
                 <RotateCcw size={16} />
                 <span className="hidden lg:inline">Reset</span>
               </button>
             )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 relative">
            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider cursor-pointer group hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
                  onClick={handleSortByDate}
                >
                  <div className="flex items-center gap-1.5">
                    Tiket / Tanggal
                    <div className="flex flex-col">
                      {sortDirection === 'asc' ? (
                        <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />
                      ) : sortDirection === 'desc' ? (
                        <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ArrowUpDown size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                      )}
                    </div>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Lokasi & Kategori</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{complaint.ticketNumber}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300 mt-1 flex items-center">
                         <Calendar className="w-3 h-3 mr-1" />
                         {new Date(complaint.dateSubmitted).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={complaint.location}>{complaint.location}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{complaint.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={complaint.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button 
                        onClick={() => handleDetailClick(complaint)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-semibold transition-colors"
                      >
                        Detail
                      </button>
                      <button 
                        onClick={() => handleProcessClick(complaint)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold transition-colors"
                      >
                        Proses
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                       <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Tidak ada aduan ditemukan</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Coba ubah kata kunci atau filter status.</p>
                    {isFiltered && (
                      <button 
                        onClick={resetFilters}
                        className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
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

      {/* --- DETAIL MODAL --- */}
      {isDetailOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   Detail Aduan <span className="text-blue-600 dark:text-blue-400 font-mono text-base bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">{selectedComplaint.ticketNumber}</span>
                 </h3>
                 <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Dikirim: {new Date(selectedComplaint.dateSubmitted).toLocaleString('id-ID')}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Image Section */}
              <div className="relative w-full h-64 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 group border border-slate-200 dark:border-slate-700">
                 <img src={selectedComplaint.imageUrl} alt="Bukti Laporan" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                 <a href={selectedComplaint.imageUrl} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center hover:bg-blue-600 transition-colors">
                    <ImageIcon className="w-3 h-3 mr-1" /> Lihat Full
                 </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1 block">Pelapor</label>
                       <div className="flex items-center text-slate-900 dark:text-white font-medium">
                          <User className="w-4 h-4 mr-2 text-slate-400" />
                          {selectedComplaint.reporterName}
                       </div>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1 block">Lokasi</label>
                       <div className="flex items-start text-slate-900 dark:text-white font-medium">
                          <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                          <span>{selectedComplaint.location}</span>
                       </div>
                       <a 
                         href={`https://www.google.com/maps?q=${selectedComplaint.lat},${selectedComplaint.lng}`} 
                         target="_blank" 
                         rel="noreferrer"
                         className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-6 mt-1 block"
                       >
                         Buka di Google Maps
                       </a>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1 block">Status Terkini</label>
                       <div className="flex items-center gap-2">
                         <StatusBadge status={selectedComplaint.status} />
                       </div>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1 block">Kategori Objek</label>
                       <div className="text-slate-900 dark:text-white font-medium border-l-2 border-blue-500 pl-3">
                          {selectedComplaint.category}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2 block">Deskripsi Masalah</label>
                 <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    "{selectedComplaint.description}"
                 </p>
              </div>

              {/* History / Technical Info if available */}
              {(selectedComplaint.rejectionReason || selectedComplaint.surveyDate || selectedComplaint.completionDate || selectedComplaint.notes) && (
                 <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center"><Truck className="w-4 h-4 mr-2"/> Info Penanganan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {selectedComplaint.status === ComplaintStatus.REJECTED && selectedComplaint.rejectionReason && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg md:col-span-2">
                             <span className="text-xs text-slate-500 dark:text-slate-300 block">Alasan Tidak Dikerjakan</span>
                             <span className="font-semibold text-red-700 dark:text-red-300 text-sm">{selectedComplaint.rejectionReason}</span>
                          </div>
                       )}
                       {selectedComplaint.surveyDate && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                             <span className="text-xs text-slate-500 dark:text-slate-300 block">Tanggal Disurvey</span>
                             <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{new Date(selectedComplaint.surveyDate).toLocaleDateString('id-ID')}</span>
                          </div>
                       )}
                       {selectedComplaint.completionDate && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                             <span className="text-xs text-slate-500 dark:text-slate-300 block">Tanggal Selesai</span>
                             <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">{new Date(selectedComplaint.completionDate).toLocaleDateString('id-ID')}</span>
                          </div>
                       )}
                       {selectedComplaint.notes && (
                          <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg md:col-span-2">
                             <span className="text-xs text-slate-500 dark:text-slate-300 block">Keterangan Tambahan</span>
                             <span className="text-slate-700 dark:text-slate-300 text-sm">{selectedComplaint.notes}</span>
                          </div>
                       )}
                    </div>
                 </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
               <button 
                 onClick={() => setIsDetailOpen(false)}
                 className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
               >
                 Tutup
               </button>
               <button 
                 onClick={() => {
                    setIsDetailOpen(false);
                    handleProcessClick(selectedComplaint);
                 }}
                 className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
               >
                 Tindak Lanjuti
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROCESS MODAL --- */}
      {isProcessOpen && selectedComplaint && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsProcessOpen(false)}></div>
          <div className="relative w-full max-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200">
             
             <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-blue-600 dark:bg-slate-900 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <CheckCircle2 className="w-5 h-5" /> Update Progres
                </h3>
                <button onClick={() => setIsProcessOpen(false)} className="text-white/70 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                </button>
             </div>

             <form onSubmit={handleProcessSubmit} className="p-6 space-y-5">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 border border-blue-100 dark:border-blue-800">
                   <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold mb-1">Tiket yang diproses:</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedComplaint.ticketNumber} - {selectedComplaint.category}</p>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status Pekerjaan</label>
                   <select 
                     value={processForm.status}
                     onChange={(e) => setProcessForm({...processForm, status: e.target.value as ComplaintStatus})}
                     className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                   >
                      <option value={ComplaintStatus.RECEIVED}>Diterima</option>
                      <option value={ComplaintStatus.REJECTED}>Tidak diterima</option>
                      <option value={ComplaintStatus.SURVEY}>Disurvey</option>
                      <option value={ComplaintStatus.COMPLETED}>Selesai dikerjakan</option>
                   </select>
                </div>



                {processForm.status === ComplaintStatus.REJECTED && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Alasan Tidak Dikerjakan</label>
                      <textarea 
                        value={processForm.rejectionReason}
                        onChange={(e) => setProcessForm({...processForm, rejectionReason: e.target.value})}
                        placeholder="Berikan alasan penolakan..."
                        rows={3}
                        required
                        className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                      />
                   </div>
                )}

                {processForm.status === ComplaintStatus.SURVEY && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tanggal Disurvey</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400" />
                         </div>
                         <input 
                           type="date" 
                           value={processForm.surveyDate}
                           onChange={(e) => setProcessForm({...processForm, surveyDate: e.target.value})}
                           required
                           className="block w-full pl-10 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                         />
                      </div>
                   </div>
                )}

                {processForm.status === ComplaintStatus.COMPLETED && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tanggal Selesai Dikerjakan</label>
                      <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-slate-400" />
                         </div>
                         <input 
                           type="date" 
                           value={processForm.completionDate}
                           onChange={(e) => setProcessForm({...processForm, completionDate: e.target.value})}
                           required
                           className="block w-full pl-10 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                         />
                      </div>
                   </div>
                )}

                <div>
                   <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Keterangan (Optional)</label>
                   <textarea 
                     value={processForm.notes}
                     onChange={(e) => setProcessForm({...processForm, notes: e.target.value})}
                     placeholder="Catatan tambahan mengenai progres..."
                     rows={2}
                     className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 focus:ring-blue-500 focus:border-blue-500"
                   />
                </div>

                <div className="pt-4 flex gap-3">
                   <button 
                     type="button"
                     onClick={() => setIsProcessOpen(false)}
                     className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                   >
                     Batal
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-colors flex justify-center items-center"
                   >
                     <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                   </button>
                </div>

             </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default ComplaintList;
