import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { db, storage } from '../../src/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../src/lib/firestoreErrorHandler';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Save, Loader2, Image as ImageIcon, Video, CheckCircle2, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const CMS: React.FC = () => {
  const [config, setConfig] = useState({
    heroTitle: 'Jalan Mantap,',
    heroSubtitle: 'Banjarmasin Maju Sejahtera',
    heroDescription: 'Platform digital resmi Dinas PUPR untuk pelaporan kerusakan infrastruktur jalan dan jembatan secara cepat, transparan, dan real-time.',
    heroBgUrl: 'https://images.unsplash.com/photo-1545147980-c994176c6f8a?q=80&w=2070&auto=format&fit=crop',
    heroLaporText: 'Lapor Sekarang',
    heroPantauText: 'Pantau Aduan',
    step1Title: 'Foto & Kirim',
    step1Desc: 'Ambil foto kerusakan jalan/jembatan, isi formulir singkat, dan kirim lokasi.',
    step2Title: 'Verifikasi & Survei',
    step2Desc: 'Tim UPT menerima laporan dan melakukan survei lapangan untuk validasi.',
    step3Title: 'Perbaikan Selesai',
    step3Desc: 'Tim teknis melakukan perbaikan. Anda akan mendapat notifikasi progres via WA/Web.',
    footerText: 'Dinas PUPR Kota Banjarmasin. Banjarmasin Maju Sejahtera. Didesain untuk kenyamanan warga.',
    navbarBrand: 'Bepadah',
    navbarLogoUrl: '',
    menuBeranda: 'Beranda',
    menuLapor: 'Lapor Sekarang',
    menuCekStatus: 'Cek Status',
    loginButtonText: 'Login Petugas'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchContent = async () => {
      const docRef = doc(db, 'cms', 'site_config');
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'cms/site_config');
      }
      setLoading(false);
    };
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'cms', 'site_config'), config);
      alert('Content saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cms/site_config');
    }
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingField(field);
    setUploadProgress(prev => ({ ...prev, [field]: 0 }));
    setUploadErrors(prev => ({ ...prev, [field]: '' }));

    try {
      // Image Compression
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);

      const storageRef = ref(storage, `cms/${field}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [field]: Math.round(progress) }));
        },
        (error) => {
          console.error("Upload error:", error);
          setUploadErrors(prev => ({ ...prev, [field]: "Gagal mengunggah. Coba lagi." }));
          setUploadingField(null);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setConfig(prev => ({ ...prev, [field]: url }));
          setUploadingField(null);
        }
      );
    } catch (error) {
      console.error("Compression error:", error);
      setUploadErrors(prev => ({ ...prev, [field]: "Gagal memproses gambar." }));
      setUploadingField(null);
    }
  };

  if (loading) return <AdminLayout title="CMS Management"><div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout title="CMS Management">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* Navbar Section */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Navbar Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Brand Name</label>
                <input type="text" value={config.navbarBrand} onChange={e => setConfig({...config, navbarBrand: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Login Button Text</label>
                <input type="text" value={config.loginButtonText} onChange={e => setConfig({...config, loginButtonText: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Navbar Logo</label>
                <div className="flex items-center gap-4">
                  <input type="file" onChange={e => handleFileUpload(e, 'navbarLogoUrl')} className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload" className={`cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm transition-all ${uploadingField === 'navbarLogoUrl' ? 'opacity-50 cursor-wait' : 'hover:bg-slate-200'}`}>
                    {uploadingField === 'navbarLogoUrl' ? <Loader2 className="animate-spin" size={18} /> : (config.navbarLogoUrl ? <CheckCircle2 className="text-green-600" size={18} /> : <ImageIcon size={18} />)}
                    {uploadingField === 'navbarLogoUrl' ? `Uploading ${uploadProgress['navbarLogoUrl'] || 0}%` : (config.navbarLogoUrl ? 'Logo Uploaded' : 'Upload Logo')}
                  </label>
                  {config.navbarLogoUrl && <img src={config.navbarLogoUrl} className="h-10 w-10 object-cover rounded-lg border" alt="Logo Preview" />}
                </div>
                {uploadErrors['navbarLogoUrl'] && <p className="text-[10px] text-red-500 font-bold mt-1">{uploadErrors['navbarLogoUrl']}</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Menu: Beranda</label>
                <input type="text" value={config.menuBeranda} onChange={e => setConfig({...config, menuBeranda: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Menu: Lapor</label>
                <input type="text" value={config.menuLapor} onChange={e => setConfig({...config, menuLapor: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Menu: Cek Status</label>
                <input type="text" value={config.menuCekStatus} onChange={e => setConfig({...config, menuCekStatus: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Hero Section
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Main Title</label>
                <input type="text" value={config.heroTitle} onChange={e => setConfig({...config, heroTitle: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Accent Title</label>
                <input type="text" value={config.heroSubtitle} onChange={e => setConfig({...config, heroSubtitle: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-2">Description</label>
              <textarea value={config.heroDescription} onChange={e => setConfig({...config, heroDescription: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Button: Lapor</label>
                <input type="text" value={config.heroLaporText} onChange={e => setConfig({...config, heroLaporText: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-2">Button: Pantau</label>
                <input type="text" value={config.heroPantauText} onChange={e => setConfig({...config, heroPantauText: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-2">Background Image</label>
              <div className="flex items-center gap-4">
                <input type="file" onChange={e => handleFileUpload(e, 'heroBgUrl')} className="hidden" id="bg-upload" />
                <label htmlFor="bg-upload" className={`cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm transition-all ${uploadingField === 'heroBgUrl' ? 'opacity-50 cursor-wait' : 'hover:bg-slate-200'}`}>
                  {uploadingField === 'heroBgUrl' ? <Loader2 className="animate-spin" size={18} /> : (config.heroBgUrl ? <CheckCircle2 className="text-green-600" size={18} /> : <ImageIcon size={18} />)}
                  {uploadingField === 'heroBgUrl' ? `Uploading ${uploadProgress['heroBgUrl'] || 0}%` : (config.heroBgUrl ? 'Background Uploaded' : 'Upload Background')}
                </label>
                {config.heroBgUrl && <img src={config.heroBgUrl} className="h-10 w-20 object-cover rounded-lg border" alt="Preview" />}
              </div>
              {uploadErrors['heroBgUrl'] && <p className="text-[10px] text-red-500 font-bold mt-1">{uploadErrors['heroBgUrl']}</p>}
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Steps Section
          </h2>
          <div className="space-y-8">
            {[1, 2, 3].map(num => (
              <div key={num} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-black uppercase text-blue-600 mb-4 tracking-widest">Step {num}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    value={(config as any)[`step${num}Title`]} 
                    onChange={e => setConfig({...config, [`step${num}Title`]: e.target.value})} 
                    placeholder="Step Title" 
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                  <input 
                    type="text" 
                    value={(config as any)[`step${num}Desc`]} 
                    onChange={e => setConfig({...config, [`step${num}Desc`]: e.target.value})} 
                    placeholder="Step Description" 
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Section */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Footer Configuration
          </h2>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Footer Text</label>
            <textarea value={config.footerText} onChange={e => setConfig({...config, footerText: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-600/40 transition-all active:scale-95 disabled:opacity-70"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Save All Changes
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CMS;
