import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock, ChevronRight, MousePointer2 } from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import { db } from '../../src/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Placeholder Image URL
const MASCOT_IMAGE_URL = "https://img.freepik.com/free-vector/yellow-road-roller-construction-machinery-vector-illustration_1284-74786.jpg?t=st=1710000000~exp=1710003600~hmac=xyz"; 

const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  const [hero, setHero] = useState<any>(null);
  
  useEffect(() => {
    const fetchHero = async () => {
      const docRef = doc(db, 'cms', 'hero');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHero(docSnap.data());
      }
    };
    fetchHero();
  }, []);
  
  // Optimized Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      // Clamp scroll value to prevent elements flying off screen
      if (window.scrollY < 1000) {
        setScrollY(window.scrollY);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500 selection:text-white transition-colors duration-500">
      <PublicNavbar />

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        /* Glass effect for Light Mode */
        .glass-panel-light {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        /* Glass effect for Dark Mode */
        .glass-panel-dark {
          background: rgba(30, 41, 59, 0.6); /* Slate-800 with opacity */
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .text-glow {
          text-shadow: 0 0 40px rgba(59, 130, 246, 0.5);
        }
      `}</style>

      {/* --- HERO SECTION --- */}
      <div className="relative h-auto min-h-[95vh] flex flex-col overflow-hidden bg-slate-900">
        
        {/* Parallax Background Layer */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1455165814004-1126a7199f9b?q=80&w=2070&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `translateY(${scrollY * 0.4}px) scale(1.1)`,
            transition: 'transform 0.1s cubic-bezier(0,0,0.2,1)' // Smooth out jitter
          }}
        />
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-50 dark:to-slate-950 z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent z-0 pointer-events-none" />

        {/* Main Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex items-center pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Text Content */}
            <div className="space-y-8" style={{ transform: `translateY(${scrollY * -0.1}px)` }}>
              <div className="inline-flex items-center space-x-2 bg-blue-900/50 border border-blue-500/30 rounded-full px-3 py-1 text-blue-300 text-sm font-medium backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span>Bepadah</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
                {hero?.title || "Jalan Mantap,"} <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 text-glow">
                {hero?.subtitle || "Banjarmasin Maju Sejahtera"}
                </span>
              </h1>
              
              <p className="text-lg text-slate-300 max-w-xl leading-relaxed border-l-4 border-blue-500 pl-6">
                Platform digital resmi Dinas PUPR untuk pelaporan kerusakan infrastruktur jalan dan jembatan secara cepat, transparan, dan real-time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to="/report"
                  className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-blue-600 px-8 font-bold text-white transition-all duration-300 hover:bg-blue-700 hover:ring-4 hover:ring-blue-500/30 shadow-lg shadow-blue-500/30"
                >
                  <span className="mr-2">Lapor Sekarang</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/track"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-600 bg-slate-800/40 px-8 font-medium text-slate-200 backdrop-blur-sm transition-all hover:bg-slate-800 hover:border-slate-500 hover:text-white"
                >
                  Pantau Aduan
                </Link>
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="relative hidden lg:block h-full min-h-[400px] w-full pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse opacity-60" />
              
              <div 
                className="relative w-full h-full flex items-center justify-center animate-float"
                style={{ transform: `translateY(${scrollY * 0.05}px)` }} // Moves slightly down
              >
                 <img 
                  src={MASCOT_IMAGE_URL} 
                  alt="Ilustrasi Bepadah" 
                  className="relative z-10 w-auto max-h-[500px] object-contain drop-shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/2555/2555013.png"; 
                  }}
                 />
                 
                 {/* Floating Badge */}
                 <div className="absolute -bottom-10 -left-10 glass-panel-light dark:glass-panel-dark p-4 rounded-2xl shadow-xl animate-bounce z-20" style={{ animationDuration: '3s' }}>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                        <ShieldCheck className="text-green-600 dark:text-green-400 h-6 w-6" />
                      </div>

                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* --- STEPS SECTION --- */}
      <div className="pt-24 pb-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase text-sm">Alur Pelayanan</h2>
            <h3 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Laporkan Masalah dalam <span className="text-blue-600 dark:text-blue-400">3 Langkah Mudah</span>
            </h3>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Sistem kami dirancang untuk memudahkan warga berpartisipasi dalam pembangunan kota.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-slate-200 via-blue-200 to-slate-200 dark:from-slate-800 dark:via-blue-900 dark:to-slate-800 -z-10" />

            {[
              { 
                step: '01', 
                title: 'Foto & Kirim', 
                desc: 'Ambil foto kerusakan jalan/jembatan, isi formulir singkat, dan kirim lokasi.',
                color: 'bg-blue-600' 
              },
              { 
                step: '02', 
                title: 'Verifikasi & Survei', 
                desc: 'Tim UPT menerima laporan dan melakukan survei lapangan untuk validasi.',
                color: 'bg-indigo-600' 
              },
              { 
                step: '03', 
                title: 'Perbaikan Selesai', 
                desc: 'Tim teknis melakukan perbaikan. Anda akan mendapat notifikasi progres via WA/Web.',
                color: 'bg-emerald-600' 
              }
            ].map((item, idx) => (
              <div key={idx} className="group relative bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-800 hover:-translate-y-1">
                <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                  {item.step}
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{item.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- CTA SECTION --- */}
      <div className="relative py-24 bg-slate-900 dark:bg-black overflow-hidden">
        <div className="absolute inset-0 opacity-20">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-50"></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4 z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">
            Jangan Biarkan Jalan Rusak Menghambat Aktivitas
          </h2>
          <p className="text-blue-200 text-lg mb-10 max-w-2xl mx-auto">
            Partisipasi Anda sangat berarti bagi kenyamanan dan keselamatan warga Kota Banjarmasin.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/report"
              className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-white text-slate-900 font-bold text-lg shadow-lg hover:bg-blue-50 transition-all hover:scale-105 hover:shadow-blue-500/20"
            >
              Buat Laporan Baru
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center justify-center h-14 px-8 rounded-full border border-slate-600 text-white font-medium hover:bg-slate-800 transition-all"
            >
              Cek Status Tiket <ChevronRight className="ml-1 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                 <ShieldCheck className="text-white h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-slate-800 dark:text-white">Bepadah</span>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm text-center md:text-right">
            &copy; {new Date().getFullYear()} Dinas PUPR Kota Banjarmasin. Banjarmasin Maju Sejahtera.<br/>
            <span className="text-xs opacity-75">Didesain untuk kenyamanan warga.</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
