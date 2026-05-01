// pages/public/ReportForm.tsx — migrated to Supabase
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Camera, Send, AlertCircle, User, Phone,
  CheckCircle2, Truck, Construction, X, Loader2, Copy, Download,
  Map as MapIcon, Navigation, Edit3,
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import PublicNavbar from '../../components/PublicNavbar';
import { supabase } from '../../src/supabase';
import { RoadType, ComplaintStatus } from '../../types';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { v4 as uuidv4 } from 'uuid';

// Banjarmasin default center
const DEFAULT_CENTER = { lat: -3.3194, lng: 114.5908 };

type LocSource = 'gps' | 'exif' | 'manual' | 'map' | null;

// ── Map Picker Modal ──────────────────────────────────────────────────────────

interface MapPickerProps {
  initialLocation: { lat: number; lng: number } | null;
  onConfirm: (loc: { lat: number; lng: number }) => void;
  onClose: () => void;
}

const MapPickerModal: React.FC<MapPickerProps> = ({ initialLocation, onConfirm, onClose }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [pickedCoords, setPickedCoords] = useState(initialLocation ?? DEFAULT_CENTER);
  const [latText, setLatText] = useState((initialLocation ?? DEFAULT_CENTER).lat.toFixed(7));
  const [lngText, setLngText] = useState((initialLocation ?? DEFAULT_CENTER).lng.toFixed(7));

  useEffect(() => {
    if (!mapContainer.current) return;
    const center = initialLocation ?? DEFAULT_CENTER;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [center.lng, center.lat],
      zoom: 16,
    });

    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    const mk = new maplibregl.Marker({ draggable: true, color: '#2563eb' })
      .setLngLat([center.lng, center.lat])
      .addTo(m);

    const updateFromLngLat = (ll: maplibregl.LngLat) => {
      const coords = { lat: ll.lat, lng: ll.lng };
      setPickedCoords(coords);
      setLatText(coords.lat.toFixed(7));
      setLngText(coords.lng.toFixed(7));
    };

    mk.on('dragend', () => updateFromLngLat(mk.getLngLat()));

    m.on('click', (e) => {
      mk.setLngLat(e.lngLat);
      updateFromLngLat(e.lngLat);
    });

    mapRef.current = m;
    markerRef.current = mk;

    return () => { m.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLatInput = (val: string) => {
    setLatText(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n >= -90 && n <= 90) {
      const next = { lat: n, lng: pickedCoords.lng };
      setPickedCoords(next);
      markerRef.current?.setLngLat([next.lng, next.lat]);
      mapRef.current?.flyTo({ center: [next.lng, next.lat], duration: 400 });
    }
  };

  const applyLngInput = (val: string) => {
    setLngText(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n >= -180 && n <= 180) {
      const next = { lat: pickedCoords.lat, lng: n };
      setPickedCoords(next);
      markerRef.current?.setLngLat([next.lng, next.lat]);
      mapRef.current?.flyTo({ center: [next.lng, next.lat], duration: 400 });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 sm:fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Pilih Titik Lokasi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Klik peta atau seret marker biru</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Map */}
        <div ref={mapContainer} className="w-full h-[52vh]" />

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Latitude</label>
              <input
                type="number"
                step="0.0000001"
                value={latText}
                onChange={e => applyLatInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Longitude</label>
              <input
                type="number"
                step="0.0000001"
                value={lngText}
                onChange={e => applyLngInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
            >
              Batal
            </button>
            <button
              onClick={() => onConfirm(pickedCoords)}
              className="flex-1 py-3 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm"
            >
              Konfirmasi Lokasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Success Modal ─────────────────────────────────────────────────────────────

const SuccessModal = ({ ticketNumber, onClose }: { ticketNumber: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(ticketNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDownload = () => {
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([`Nomor Tiket: ${ticketNumber}`], { type: 'text/plain' }));
    el.download = `tiket-${ticketNumber}.txt`;
    el.click();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200 dark:border-slate-700">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6"><CheckCircle2 className="h-10 w-10 text-green-600" /></div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Laporan Diterima!</h3>
        <p className="text-slate-500 mb-6">Tim kami akan segera memverifikasi laporan ini.</p>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Nomor Tiket Anda</p>
          <p className="text-3xl font-mono font-bold text-blue-600 tracking-widest">{ticketNumber}</p>
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-[10px] font-black uppercase">
              {copied ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}{copied ? 'Tersalin!' : 'Salin'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-[10px] font-black uppercase">
              <Download size={12} />Unduh
            </button>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Pantau Status Laporan</button>
      </div>
    </div>
  );
};

// ── Category Card ─────────────────────────────────────────────────────────────

type CategoryCardProps = {
  type: RoadType;
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  desc: string;
};

const CategoryCard: React.FC<CategoryCardProps> = ({ type, selected, onClick, icon: Icon, desc }) => (
  <button type="button" onClick={onClick} className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col items-center text-center gap-2 hover:border-blue-300 ${selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
    <div className={`p-3 rounded-full ${selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><Icon size={24} /></div>
    <div>
      <h4 className={`font-bold text-sm ${selected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>{type}</h4>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
    </div>
    {selected && <div className="absolute top-2 right-2"><CheckCircle2 size={16} className="text-blue-600" /></div>}
  </button>
);

// ── Source badge ──────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<NonNullable<LocSource>, { label: string; cls: string; icon: React.ElementType }> = {
  exif:   { label: 'Dari EXIF Foto',      cls: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  gps:    { label: 'Dari GPS Perangkat',  cls: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',             icon: Navigation  },
  manual: { label: 'Input Manual',        cls: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',         icon: Edit3       },
  map:    { label: 'Dari Peta',           cls: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',     icon: MapIcon     },
};

// ── Main Component ────────────────────────────────────────────────────────────

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', category: RoadType.JALAN, locationDesc: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locSource, setLocSource] = useState<LocSource>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Separate text inputs for lat/lng (allows partial editing without breaking location state)
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]);

  // Helper: set location from any external source and sync text inputs
  const applyLocation = (loc: { lat: number; lng: number }, source: LocSource) => {
    setLocation(loc);
    setLocSource(source);
    setLatInput(loc.lat.toFixed(7));
    setLngInput(loc.lng.toFixed(7));
  };

  // Manual lat input
  const handleLatInput = (val: string) => {
    setLatInput(val);
    setLocSource('manual');
    const n = parseFloat(val);
    if (!isNaN(n) && n >= -90 && n <= 90) {
      const lng = location?.lng ?? 0;
      setLocation({ lat: n, lng });
    }
  };

  // Manual lng input
  const handleLngInput = (val: string) => {
    setLngInput(val);
    setLocSource('manual');
    const n = parseFloat(val);
    if (!isNaN(n) && n >= -180 && n <= 180) {
      const lat = location?.lat ?? 0;
      setLocation({ lat, lng: n });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const MAX_SIZE_MB = 5;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

    if (!ALLOWED_TYPES.includes(selectedFile.type) && !selectedFile.name.match(/\.(jpe?g|png|webp|gif|heic|heif)$/i)) {
      setUploadError('Format file harus JPG, PNG, GIF, WEBP, atau HEIC');
      return;
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB');
      return;
    }

    setFile(selectedFile);
    setIsUploadingPhoto(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadedUrl(null);
    setPreview(URL.createObjectURL(selectedFile));

    // Extract GPS from EXIF before compression
    try {
      const gps = await exifr.gps(selectedFile);
      if (gps?.latitude != null && gps?.longitude != null) {
        applyLocation({ lat: gps.latitude, lng: gps.longitude }, 'exif');
      }
    } catch {
      // GPS not available — silently ignore
    }

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    try {
      const compressed = await imageCompression(selectedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const fileName = `${Date.now()}_${selectedFile.name}`;

      progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 20, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('reports')
        .upload(fileName, compressed, { upsert: false });

      if (error) throw error;
      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(data.path);
      setUploadedUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError('Gagal mengunggah foto. Periksa koneksi.');
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsUploadingPhoto(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setUploadProgress(0);
    setUploadedUrl(null);
    setUploadError(null);
    if (locSource === 'exif') {
      setLocation(null);
      setLocSource(null);
      setLatInput('');
      setLngInput('');
    }
  };

  const handleGetLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        applyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'gps');
        setLocLoading(false);
      },
      () => {
        setSubmitError('Gagal mendapatkan lokasi.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMapPickerConfirm = (loc: { lat: number; lng: number }) => {
    applyLocation(loc, 'map');
    setIsMapPickerOpen(false);
  };

  const handleClearLocation = () => {
    setLocation(null);
    setLocSource(null);
    setLatInput('');
    setLngInput('');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!formData.phone.trim()) newErrors.phone = 'Nomor HP wajib diisi';
    if (!formData.locationDesc.trim()) newErrors.locationDesc = 'Patokan lokasi wajib diisi';
    if (!formData.description.trim()) newErrors.description = 'Deskripsi wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSubmitting(true);
    try {
      const rawId = uuidv4();
      const ticketId = `PJJ-${rawId.slice(0, 8).toUpperCase()}`;
      const { data, error } = await supabase.from('complaints').insert({
        ticket_number: ticketId,
        reporter_name: formData.name,
        reporter_phone: formData.phone,
        location: formData.locationDesc,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        description: formData.description,
        category: formData.category,
        status: ComplaintStatus.PENDING,
        image_url: uploadedUrl ?? null,
        date_submitted: new Date().toISOString(),
        date_updated: new Date().toISOString(),
      }).select();

      if (error) throw error;
      setTicketNumber(ticketId);

      // Call Edge Function to create notifications for staff
      if (data && data.length > 0) {
        try {
          const complaintId = data[0].id;
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-new-complaint`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token || ''}`
              },
              body: JSON.stringify({
                complaintId: complaintId,
                ticketNumber: ticketId
              })
            }
          );

          if (!response.ok) {
            console.warn('Warning: Failed to create notifications:', response.statusText);
          }
        } catch (err) {
          console.warn('Warning: Error calling notify function:', err);
          // Don't block the flow if notification fails
        }
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err?.message || 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const sourceBadge = locSource ? SOURCE_BADGE[locSource] : null;
  const coordsValid = location && !isNaN(location.lat) && !isNaN(location.lng);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />
      {ticketNumber && <SuccessModal ticketNumber={ticketNumber} onClose={() => navigate('/track')} />}
      {isMapPickerOpen && (
        <MapPickerModal
          initialLocation={coordsValid ? location : null}
          onConfirm={handleMapPickerConfirm}
          onClose={() => setIsMapPickerOpen(false)}
        />
      )}

      <div className="max-w-4xl mx-auto pt-32 pb-10 px-4 sm:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Lapor Kerusakan Infrastruktur</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Sampaikan keluhan Anda kepada UPT Jalan & Jembatan Dinas PUPR Kota Banjarmasin.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"></div>
          <form onSubmit={handleSubmit} noValidate className="p-6 md:p-10 space-y-8">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-600">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-bold">{submitError}</p>
                <button type="button" onClick={() => setSubmitError(null)} className="ml-auto"><X size={16} /></button>
              </div>
            )}

            {/* Informasi Pelapor */}
            <section>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center mb-6 uppercase tracking-tight">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white text-sm font-black mr-3">1</span>Informasi Pelapor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nama asli Anda" className={`block w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${errors.name ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white`} />
                  </div>
                  {errors.name && <p className="mt-2 text-xs text-red-500 font-bold">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nomor WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="081234567890" className={`block w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${errors.phone ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white`} />
                  </div>
                  {errors.phone && <p className="mt-2 text-xs text-red-500 font-bold">{errors.phone}</p>}
                </div>
              </div>
            </section>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Lokasi & Foto */}
            <section>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center mb-6 uppercase tracking-tight">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white text-sm font-black mr-3">2</span>Lokasi & Foto Kejadian
              </h3>

              {/* Kategori */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Kategori Objek</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CategoryCard type={RoadType.JALAN} selected={formData.category === RoadType.JALAN} onClick={() => setFormData(p => ({ ...p, category: RoadType.JALAN }))} icon={Truck} desc="Kerusakan badan jalan, lubang, drainase jalan." />
                  <CategoryCard type={RoadType.JEMBATAN} selected={formData.category === RoadType.JEMBATAN} onClick={() => setFormData(p => ({ ...p, category: RoadType.JEMBATAN }))} icon={Construction} desc="Kerusakan struktur jembatan, oprit, pagar." />
                </div>
              </div>

              {/* Foto */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Foto Bukti (Opsional)</label>
                {!preview ? (
                  <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:bg-blue-50/50 cursor-pointer">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileChange} />
                    <Camera size={32} className="mx-auto text-blue-600 mb-3" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Klik atau Tarik Foto ke Sini</p>
                  </div>
                ) : (
                  <div className="relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-5">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={preview} alt="Upload" className="w-full h-full object-cover" />
                        {isUploadingPhoto && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="animate-spin text-white w-6 h-6" /></div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{file?.name}</p>
                          <button type="button" onClick={handleRemoveFile} className="p-1.5 text-slate-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase">{uploadProgress}% Selesai</span>
                        {uploadProgress === 100 && <span className="ml-2 text-[10px] font-black text-green-600">✓ Berhasil</span>}
                      </div>
                    </div>
                  </div>
                )}
                {uploadError && <p className="mt-2 text-xs text-red-500 font-bold">{uploadError}</p>}
              </div>

              {/* Titik Koordinat */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Titik Koordinat (Opsional)</label>
                  {sourceBadge && coordsValid && (
                    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${sourceBadge.cls}`}>
                      <sourceBadge.icon size={11} /> {sourceBadge.label}
                      <button type="button" onClick={handleClearLocation} className="ml-1 opacity-60 hover:opacity-100">
                        <X size={10} />
                      </button>
                    </span>
                  )}
                </div>

                {/* Lat / Lng inputs */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Latitude</label>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${coordsValid ? 'text-blue-500' : 'text-slate-400'}`} />
                      <input
                        type="number"
                        step="0.0000001"
                        value={latInput}
                        onChange={e => handleLatInput(e.target.value)}
                        placeholder="-3.3194000"
                        className={`block w-full pl-9 pr-3 py-3 rounded-2xl border font-mono text-xs transition-colors ${
                          coordsValid
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Longitude</label>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${coordsValid ? 'text-blue-500' : 'text-slate-400'}`} />
                      <input
                        type="number"
                        step="0.0000001"
                        value={lngInput}
                        onChange={e => handleLngInput(e.target.value)}
                        placeholder="114.5908000"
                        className={`block w-full pl-9 pr-3 py-3 rounded-2xl border font-mono text-xs transition-colors ${
                          coordsValid
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locLoading}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-black text-xs uppercase rounded-2xl disabled:opacity-70 hover:bg-blue-700 transition-colors"
                  >
                    {locLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Navigation className="mr-2 h-4 w-4" />}Ambil GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white font-black text-xs uppercase rounded-2xl hover:bg-slate-800 transition-colors"
                  >
                    <MapIcon className="mr-2 h-4 w-4" />Pilih di Peta
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Koordinat otomatis terbaca dari foto (jika ada GPS). Atau ketik manual, gunakan <strong>Ambil GPS</strong>, atau <strong>Pilih di Peta</strong>.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Patokan / Nama Jalan</label>
                  <input type="text" name="locationDesc" value={formData.locationDesc} onChange={handleChange} placeholder="Contoh: Depan Toko Beras Jaya, Jl. Veteran No. 10" className={`block w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${errors.locationDesc ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white`} />
                  {errors.locationDesc && <p className="mt-2 text-xs text-red-500 font-bold">{errors.locationDesc}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Detail Kerusakan</label>
                  <textarea name="description" rows={4} value={formData.description} onChange={handleChange} placeholder="Jelaskan kondisi kerusakan secara detail..." className={`block w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border ${errors.description ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white resize-none`} />
                  {errors.description && <p className="mt-2 text-xs text-red-500 font-bold">{errors.description}</p>}
                </div>
              </div>
            </section>

            <div className="pt-8 flex flex-col-reverse sm:flex-row justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => navigate('/')} className="px-8 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 uppercase tracking-widest text-[11px]">Batalkan</button>
              <button type="submit" disabled={isSubmitting || isUploadingPhoto} className="inline-flex justify-center items-center px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl disabled:opacity-70">
                {isSubmitting ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Memproses...</> : <>Kirim Aduan <Send className="ml-2 h-4 w-4" /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
