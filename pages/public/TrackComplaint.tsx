// pages/public/TrackComplaint.tsx — migrated to Supabase
import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import { supabase } from '../../src/supabase';
import { Complaint } from '../../types';
import StatusBadge from '../../components/StatusBadge';

const TrackComplaint: React.FC = () => {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<Complaint | null | undefined>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await supabase
        .from('complaints')
        .select(`
          ticket_number,
          status,
          location,
          description,
          date_submitted,
          survey_date,
          completion_date,
          notes
        `)
        .eq('ticket_number', ticketId.trim())
        .single();

      if (data) {
        setResult(data as Complaint);
      } else {
        setResult(undefined);
      }
    } catch {
      setResult(undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl tracking-tight">Cek Status Aduan</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Masukkan Nomor Tiket yang Anda dapatkan saat melapor.</p>
        </div>
        <div className="mt-8 max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="mt-1 flex rounded-xl shadow-lg">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" value={ticketId} onChange={e => setTicketId(e.target.value)} className="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-l-xl pl-11 sm:text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-4" placeholder="Contoh: PJJ-2023-001" />
            </div>
            <button type="submit" disabled={loading} className="-ml-px px-6 py-4 border border-transparent text-sm font-bold rounded-r-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Mencari...' : 'Cari'}
            </button>
          </form>
        </div>
        {hasSearched && (
          <div className="mt-10 max-w-2xl mx-auto animate-in fade-in duration-500">
            {result ? (
              <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Tiket: {result.ticket_number}</h3>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">{new Date(result.date_submitted).toLocaleDateString('id-ID')}</p>
                  </div>
                  <StatusBadge status={result.status} />
                </div>
                <div className="px-6 py-5">
                  <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-semibold text-slate-500">Lokasi</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{result.location}</dd></div>
                    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-semibold text-slate-500">Deskripsi</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{result.description}</dd></div>
                    {result.rejection_reason && <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-semibold text-red-500">Alasan Tidak Dikerjakan</dt><dd className="mt-1 text-sm text-red-700 sm:mt-0 sm:col-span-2">{result.rejection_reason}</dd></div>}
                    {result.survey_date && <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-semibold text-slate-500">Tanggal Disurvey</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{new Date(result.survey_date).toLocaleDateString('id-ID')}</dd></div>}
                    {result.completion_date && <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-semibold text-slate-500">Tanggal Selesai</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2">{new Date(result.completion_date).toLocaleDateString('id-ID')}</dd></div>}
                    {result.notes && <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-semibold text-slate-500">Keterangan</dt><dd className="mt-1 text-sm text-slate-900 dark:text-white sm:mt-0 sm:col-span-2 italic">{result.notes}</dd></div>}
                  </dl>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-6 border border-red-100 text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Data tidak ditemukan</h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">Periksa kembali nomor tiket (contoh: PJJ-2023-001).</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackComplaint;
