import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import { MOCK_COMPLAINTS } from '../../constants';
import { Complaint } from '../../types';
import StatusBadge from '../../components/StatusBadge';

const TrackComplaint: React.FC = () => {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<Complaint | null | undefined>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    // Simulate search from mock data
    const found = MOCK_COMPLAINTS.find(c => c.ticketNumber.toLowerCase() === ticketId.toLowerCase());
    setResult(found);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl tracking-tight">Cek Status Aduan</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Masukkan Nomor Tiket yang Anda dapatkan saat melapor.</p>
        </div>

        <div className="mt-8 max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="mt-1 flex rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-black/20">
            <div className="relative flex-grow focus-within:z-10">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                value={ticketId} 
                onChange={(e) => setTicketId(e.target.value)} 
                className="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-l-xl pl-11 sm:text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-4 transition-colors placeholder-slate-400 focus:outline-none focus:ring-2" 
                placeholder="Contoh: PJJ-2023-001" 
              />
            </div>
            <button type="submit" className="-ml-px relative inline-flex items-center space-x-2 px-6 py-4 border border-transparent text-sm font-bold rounded-r-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors">
              Cari
            </button>
          </form>
        </div>

        {hasSearched && (
          <div className="mt-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {result ? (
              <div className="bg-white dark:bg-slate-800 shadow-xl dark:shadow-black/30 overflow-hidden sm:rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="px-6 py-5 sm:px-8 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg leading-6 font-bold text-blue-900 dark:text-blue-100">Tiket: {result.ticketNumber}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-blue-700 dark:text-blue-300/80">Dilaporkan pada: {new Date(result.dateSubmitted).toLocaleDateString('id-ID')}</p>
                  </div>
                  <StatusBadge status={result.status} className="text-sm px-3 py-1 shadow-sm" />
                </div>
                <div className="px-6 py-5 sm:p-8">
                  <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pelapor</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2 font-medium">{result.reporterName}</dd>
                    </div>
                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">Lokasi</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{result.location}</dd>
                    </div>
                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">Deskripsi</dt>
                      <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2 leading-relaxed">{result.description}</dd>
                    </div>
                    {result.rejectionReason && (
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-semibold text-red-500 dark:text-red-400">Alasan Tidak Dikerjakan</dt>
                        <dd className="mt-1 text-sm text-red-700 dark:text-red-300 sm:mt-0 sm:col-span-2 font-medium">{result.rejectionReason}</dd>
                      </div>
                    )}
                    {result.surveyDate && (
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tanggal Disurvey</dt>
                        <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{new Date(result.surveyDate).toLocaleDateString('id-ID')}</dd>
                      </div>
                    )}
                    {result.completionDate && (
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tanggal Selesai</dt>
                        <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{new Date(result.completionDate).toLocaleDateString('id-ID')}</dd>
                      </div>
                    )}
                    {result.notes && (
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">Keterangan</dt>
                        <dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2 italic">"{result.notes}"</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-6 border border-red-100 dark:border-red-900/30 text-center">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-3">
                     <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Data tidak ditemukan</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300 max-w-sm">
                    <p>Mohon periksa kembali nomor tiket Anda. Pastikan format sesuai (contoh: PJJ-2023-001).</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackComplaint;