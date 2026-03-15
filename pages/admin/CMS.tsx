import React, { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { db, storage } from '../../src/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Save, Loader2, Image as ImageIcon, Video } from 'lucide-react';

const CMS: React.FC = () => {
  const [hero, setHero] = useState({ title: '', subtitle: '', mediaUrl: '', mediaType: 'image' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      const docRef = doc(db, 'cms', 'hero');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHero(docSnap.data() as any);
      }
      setLoading(false);
    };
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, 'cms', 'hero'), hero);
    setSaving(false);
    alert('Content saved!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const storageRef = ref(storage, `hero/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setHero({ ...hero, mediaUrl: url, mediaType: file.type.startsWith('video') ? 'video' : 'image' });
  };

  if (loading) return <AdminLayout title="CMS Landing Page"><div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout title="CMS Landing Page">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6">Hero Section</h2>
        <div className="space-y-4">
          <input type="text" value={hero.title} onChange={e => setHero({...hero, title: e.target.value})} placeholder="Title" className="w-full p-3 rounded-xl border" />
          <input type="text" value={hero.subtitle} onChange={e => setHero({...hero, subtitle: e.target.value})} placeholder="Subtitle" className="w-full p-3 rounded-xl border" />
          <input type="file" onChange={handleFileUpload} className="w-full p-3 rounded-xl border" />
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Save
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CMS;
