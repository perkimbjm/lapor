import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2, Camera, ClipboardCheck, Activity, Search } from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import { supabase } from '../../src/supabase';
import { ComplaintStatus } from '../../types';

const LandingPage: React.FC = () => {
  const [stats, setStats] = useState({
    total: 40,
    processing: 10,
    completed: 30
  });
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
    footerText: 'Dinas PUPR Kota Banjarmasin. Banjarmasin Maju Sejahtera. Didesain untuk kenyamanan warga.'
  });
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch CMS Config
        const { data: cmsData } = await supabase
          .from('cms')
          .select('*')
          .eq('id', 'site_config')
          .single();
          
        if (cmsData && cmsData.data) {
          setConfig(prev => ({ ...prev, ...cmsData.data }));
        }

        // Fetch Stats
        const { count: total } = await supabase
          .from('complaints')
          .select('*', { count: 'exact', head: true });
        
        const { count: processing } = await supabase
          .from('complaints')
          .select('*', { count: 'exact', head: true })
          .in('status', [
            ComplaintStatus.PENDING, 
            ComplaintStatus.RECEIVED, 
            ComplaintStatus.SURVEY
          ]);
        
        const { count: completed } = await supabase
          .from('complaints')
          .select('*', { count: 'exact', head: true })
          .eq('status', ComplaintStatus.COMPLETED);

        setStats({ 
          total: total || 0, 
          processing: processing || 0, 
          completed: completed || 0 
        });
      } catch (error) {
        console.error("Error fetching content:", error);
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-blue-500 selection:text-white transition-colors duration-500">
      <PublicNavbar />

      {/* --- HERO SECTION --- */}
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0"
          style={{ 
            backgroundImage: `url("${config.heroBgUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-white/90 dark:from-slate-950/70 dark:to-slate-950/95" />
        </div>
        
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-blue-500/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center pt-40 pb-20">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              {config.heroTitle} <span className="text-blue-600 dark:text-blue-500">{config.heroSubtitle}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              {config.heroDescription}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/report"
                className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 px-10 font-black text-white transition-all duration-300 hover:bg-blue-700 hover:ring-4 hover:ring-blue-500/30 shadow-xl shadow-blue-600/20 hover:-translate-y-1"
              >
                <span className="mr-3">{config.heroLaporText}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/track"
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-10 font-bold text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1"
              >
                {config.heroPantauText}
              </Link>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-300">
            {[
              { label: 'Laporan Masuk', value: stats.total.toLocaleString(), icon: <Search className="text-blue-600" size={24} /> },
              { label: 'Sedang Diproses', value: stats.processing.toLocaleString(), icon: <Activity className="text-blue-600" size={24} /> },
              { label: 'Selesai Dikerjakan', value: stats.completed.toLocaleString(), icon: <CheckCircle2 className="text-blue-600" size={24} /> }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-6 rounded-3xl shadow-xl flex items-center gap-6 group hover:scale-105 transition-transform duration-300">
                <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shadow-inner">
                  {stat.icon}
                </div>
                <div className="text-left">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- STEPS SECTION --- */}
      <div className="py-32 bg-slate-50 dark:bg-slate-950/50 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                step: '01', 
                title: config.step1Title, 
                desc: config.step1Desc,
                icon: <Camera className="text-blue-600" size={28} />,
                color: 'bg-blue-600' 
              },
              { 
                step: '02', 
                title: config.step2Title, 
                desc: config.step2Desc,
                icon: <ClipboardCheck className="text-indigo-600" size={28} />,
                color: 'bg-indigo-600' 
              },
              { 
                step: '03', 
                title: config.step3Title, 
                desc: config.step3Desc,
                icon: <ShieldCheck className="text-emerald-600" size={28} />,
                color: 'bg-emerald-600' 
              }
            ].map((item, idx) => (
              <div key={idx} className="group relative bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-slate-800 hover:-translate-y-2 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-150 transition-transform duration-700">
                  <Activity size={200} />
                </div>

                <div className="flex items-center justify-between mb-8">
                  <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-blue-600/20`}>
                    {item.step}
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    {item.icon}
                  </div>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{item.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-white dark:bg-slate-950 py-12 border-t border-slate-100 dark:border-slate-900 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <p className="text-slate-500 dark:text-slate-500 text-sm font-bold tracking-tight">
            &copy; {new Date().getFullYear()} {config.footerText}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
