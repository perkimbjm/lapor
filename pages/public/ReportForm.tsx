
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Camera, 
  Send, 
  AlertCircle, 
  User, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Home, 
  Truck, 
  Construction,
  X,
  Image as ImageIcon,
  Loader2,
  LocateFixed
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import { db } from '../../src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { RoadType } from '../../types';
// @ts-ignore
import EXIF from 'exif-js';

const SuccessModal = ({ 
  ticketNumber, 
  onClose 
}: { 
  ticketNumber: string, 
  onClose: () => void 
}) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-in fade-in duration-300">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center scale-100 animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700">
      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Laporan Diterima!</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        Terima kasih telah peduli dengan kotamu. Tim kami akan segera memverifikasi laporan ini.
      </p>
      
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Nomor Tiket Anda</p>
        <p className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest selection:bg-blue-200">{ticketNumber}</p>
        <p className="text-xs text-slate-400 mt-1">(Simpan untuk cek status)</p>
      </div>

      <button 
        onClick={onClose}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/30"
      >
        Pantau Status Laporan
      </button>
    </div>
  </div>
);

const CategoryCard = ({ 
  type, 
  selected, 
  onClick, 
  icon: Icon, 
  desc 
}: { 
  type: string, 
  selected: boolean, 
  onClick: () => void, 
  icon: any, 
  desc: string 
}) => (
  <div 
    onClick={onClick}
    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex flex-col items-center text-center gap-2 hover:border-blue-300 dark:hover:border-blue-700 ${
      selected 
        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}
  >
    <div className={`p-3 rounded-full ${selected ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
      <Icon size={24} />
    </div>
    <div>
      <h4 className={`font-bold text-sm ${selected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>{type}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">{desc}</p>
    </div>
    {selected && (
      <div className="absolute top-2 right-2">
        <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
      </div>
    )}
  </div>
);

const ReportForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    category: RoadType.JALAN,
    locationDesc: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isExifLocation, setIsExifLocation] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const convertDMSToDD = (degrees: any, minutes: any, seconds: any, direction: string) => {
    let dd = Number(degrees) + Number(minutes) / 60 + Number(seconds) / (60 * 60);
    if (direction === "S" || direction === "W") {
      dd = dd * -1;
    }
    return dd;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      alert('Mohon upload file gambar.');
      return;
    }
    
    setFile(selectedFile);
    setIsUploadingPhoto(true);
    setUploadProgress(0);
    setIsExifLocation(false);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    // Simulate Upload Progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploadingPhoto(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    // Extract EXIF Metadata
    // @ts-ignore
    EXIF.getData(selectedFile, function(this: any) {
      const latData = EXIF.getTag(this, "GPSLatitude");
      const latRef = EXIF.getTag(this, "GPSLatitudeRef");
      const longData = EXIF.getTag(this, "GPSLongitude");
      const longRef = EXIF.getTag(this, "GPSLongitudeRef");

      if (latData && latRef && longData && longRef) {
        const lat = convertDMSToDD(latData[0], latData[1], latData[2], latRef);
        const lng = convertDMSToDD(longData[0], longData[1], longData[2], longRef);
        setLocation({ lat, lng });
        setIsExifLocation(true);
      }
    });
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setUploadProgress(0);
    setIsExifLocation(false);
  };

  const handleGetLocation = () => {
    setLocLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsExifLocation(false);
        setLocLoading(false);
      }, (error) => {
        alert('Gagal mendapatkan lokasi. Pastikan izin lokasi aktif.');
        setLocLoading(false);
      }, { enableHighAccuracy: true });
    } else {
      alert('Browser tidak mendukung geolokasi.');
      setLocLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!formData.phone.trim()) newErrors.phone = 'Nomor HP wajib diisi';
    if (!formData.locationDesc.trim()) newErrors.locationDesc = 'Patokan lokasi wajib diisi';
    if (!formData.description.trim()) newErrors.description = 'Deskripsi kerusakan wajib diisi';
    if (!file) newErrors.file = 'Foto bukti wajib diunggah';
    if (!location) newErrors.location = 'Titik lokasi GPS diperlukan';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newTicketId = `PJJ-2024-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // In a real app, we would upload the file to Firebase Storage first
      // For now, we'll store the file name or a placeholder
      await addDoc(collection(db, 'complaints'), {
        ticketNumber: newTicketId,
        reporterName: formData.name,
        reporterPhone: formData.phone,
        location: formData.locationDesc,
        lat: location?.lat,
        lng: location?.lng,
        description: formData.description,
        roadType: formData.category,
        status: 'Menunggu',
        dateSubmitted: new Date().toISOString(),
        createdAt: serverTimestamp(),
        photoUrl: 'https://picsum.photos/seed/report/800/600' // Placeholder
      });

      setTicketNumber(newTicketId);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Gagal mengirim laporan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <PublicNavbar />
      
      {ticketNumber && <SuccessModal ticketNumber={ticketNumber} onClose={() => navigate('/track')} />}

      <div className="max-w-4xl mx-auto pt-32 pb-10 px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Lapor Kerusakan Infrastruktur
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Sampaikan keluhan Anda secara langsung kepada UPT Jalan & Jembatan Dinas PUPR Kota Banjarmasin.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-2xl shadow-blue-900/5 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"></div>

          <form onSubmit={handleSubmit} noValidate className="p-6 md:p-10 space-y-8">
            
            <section>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center mb-6 uppercase tracking-tight">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white text-sm font-black mr-3 shadow-lg shadow-blue-600/30">1</span>
                Informasi Pelapor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      className={`block w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-red-400 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium`} 
                      placeholder="Masukkan nama asli Anda" 
                    />
                  </div>
                  {errors.name && <p className="mt-2 text-xs text-red-500 flex items-center font-bold uppercase tracking-tight"><AlertCircle size={12} className="mr-1" />{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nomor WhatsApp</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      className={`block w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border ${errors.phone ? 'border-red-400 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium`} 
                      placeholder="Contoh: 081234567890" 
                    />
                  </div>
                  {errors.phone && <p className="mt-2 text-xs text-red-500 flex items-center font-bold uppercase tracking-tight"><AlertCircle size={12} className="mr-1" />{errors.phone}</p>}
                </div>
              </div>
            </section>

            <hr className="border-slate-100 dark:border-slate-800" />

            <section>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center mb-6 uppercase tracking-tight">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white text-sm font-black mr-3 shadow-lg shadow-blue-600/30">2</span>
                Lokasi & Foto Kejadian
              </h3>
              
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Kategori Objek Laporan</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FIX: Added missing desc property to handle the CategoryCard interface requirement */}
                  <CategoryCard 
                    type={RoadType.JALAN} 
                    selected={formData.category === RoadType.JALAN}
                    onClick={() => setFormData(p => ({...p, category: RoadType.JALAN}))}
                    icon={Truck}
                    desc="Laporan terkait kerusakan badan jalan, lubang, atau drainase jalan."
                  />
                  {/* FIX: Added missing desc property to handle the CategoryCard interface requirement */}
                  <CategoryCard 
                    type={RoadType.JEMBATAN} 
                    selected={formData.category === RoadType.JEMBATAN}
                    onClick={() => setFormData(p => ({...p, category: RoadType.JEMBATAN}))}
                    icon={Construction}
                    desc="Laporan terkait kerusakan struktur jembatan, oprit, atau pagar jembatan."
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Foto Bukti Kerusakan (Wajib)</label>
                {!preview ? (
                  <div className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all group cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 ${errors.file ? 'border-red-400 bg-red-50/30' : 'border-slate-300 dark:border-slate-700'}`}>
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <Camera size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Klik atau Tarik Foto ke Sini</p>
                      <p className="text-xs text-slate-500 mt-1">Pastikan foto jelas agar mudah divalidasi</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-xl overflow-hidden">
                    <div className="flex items-center gap-5">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-inner bg-slate-100 shrink-0">
                        <img src={preview} alt="Upload" className="w-full h-full object-cover" />
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white truncate">{file?.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">{(file && (file.size / 1024 / 1024).toFixed(2)) + ' MB'}</p>
                           </div>
                           <button onClick={handleRemoveFile} className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <X size={20} />
                           </button>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2">
                           <div className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-sm shadow-blue-600/30" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-500 uppercase">{uploadProgress}% Selesai</span>
                           {uploadProgress === 100 && (
                             <span className="flex items-center text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full uppercase">
                               <CheckCircle2 size={10} className="mr-1" /> Berhasil
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                    {isExifLocation && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-green-600 dark:text-green-400 animate-in slide-in-from-left-2">
                         <LocateFixed size={14} />
                         <span className="text-[10px] font-black uppercase tracking-tight">Lokasi GPS Terdeteksi dari Foto!</span>
                      </div>
                    )}
                  </div>
                )}
                {errors.file && <p className="mt-2 text-xs text-red-500 font-bold flex items-center uppercase tracking-tight"><AlertCircle size={12} className="mr-1" />{errors.file}</p>}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Titik Koordinat Lokasi</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className={`h-5 w-5 ${location ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <input 
                      type="text" 
                      readOnly 
                      value={location ? `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}` : ''} 
                      className={`block w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border ${errors.location ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} text-slate-700 dark:text-slate-200 font-mono text-xs`}
                      placeholder="Koordinat akan terisi dari Foto atau Tombol GPS"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleGetLocation} 
                    disabled={locLoading}
                    className="flex items-center justify-center px-6 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap"
                  >
                    {locLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
                    Ambil Lokasi GPS
                  </button>
                </div>
                {errors.location && <p className="mt-2 text-xs text-red-500 font-bold flex items-center uppercase tracking-tight"><AlertCircle size={12} className="mr-1" />{errors.location}</p>}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Patokan / Nama Jalan (Lokasi Persis)</label>
                  <input 
                    type="text" 
                    name="locationDesc" 
                    value={formData.locationDesc} 
                    onChange={handleChange} 
                    className={`block w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border ${errors.locationDesc ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium`} 
                    placeholder="Contoh: Depan Toko Beras Jaya, Jl. Veteran No. 10" 
                  />
                  {errors.locationDesc && <p className="mt-2 text-xs text-red-500 font-bold uppercase tracking-tight">{errors.locationDesc}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Detail Kerusakan</label>
                  <textarea 
                    name="description" 
                    rows={4} 
                    value={formData.description} 
                    onChange={handleChange} 
                    className={`block w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border ${errors.description ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'} text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium resize-none`} 
                    placeholder="Jelaskan kondisi kerusakan secara detail..." 
                  />
                  {errors.description && <p className="mt-2 text-xs text-red-500 font-bold uppercase tracking-tight">{errors.description}</p>}
                </div>
              </div>
            </section>

            <div className="pt-8 flex flex-col-reverse sm:flex-row justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest text-[11px]"
              >
                Batalkan
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || isUploadingPhoto} 
                className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-2xl shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Memproses Laporan...
                  </>
                ) : (
                  <>
                    Kirim Aduan Sekarang <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
