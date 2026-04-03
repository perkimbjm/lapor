import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Activity, Home, Search, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { db, auth } from '../src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = React.useState<User | null>(null);
  const [config, setConfig] = React.useState({
    navbarBrand: 'Bepadah',
    navbarLogoUrl: '',
    menuBeranda: 'Beranda',
    menuLapor: 'Lapor Sekarang',
    menuCekStatus: 'Cek Status',
    loginButtonText: 'Login Petugas'
  });

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'cms', 'site_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error fetching navbar config:", error);
      }
    };
    fetchConfig();

    return () => unsubscribe();
  }, []);

  const navLinks = [
    { name: config.menuBeranda, path: '/', icon: <Home size={18} /> },
    { name: config.menuLapor, path: '/report', icon: <Activity size={18} /> },
    { name: config.menuCekStatus, path: '/track', icon: <Search size={18} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center h-16 px-6">
            <div className="flex items-center">
              <Link to="/" className="flex items-center group">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-blue-600/40 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                   {config.navbarLogoUrl ? (
                     <img src={config.navbarLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                   ) : (
                     <Activity className="text-white" size={24} />
                   )}
                </div>
                <span className="font-bold text-2xl text-slate-900 dark:text-white tracking-tight">{config.navbarBrand}</span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive(link.path) 
                      ? 'text-blue-600 bg-blue-50/80 dark:bg-blue-900/40 dark:text-blue-400' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="mr-2 opacity-70">{link.icon}</span>
                  {link.name}
                </Link>
              ))}

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-4" />

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all focus:outline-none mr-2"
                aria-label="Toggle Dark Mode"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <Link to="/admin" className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                {user ? (
                  <>
                    <LayoutDashboard size={18} />
                    Dashboard
                  </>
                ) : (
                  config.loginButtonText
                )}
              </Link>
            </div>

            <div className="flex items-center md:hidden gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2.5 rounded-xl text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none transition-all"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden mx-4 mt-2">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-5 duration-300">
            <div className="px-4 pt-4 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-all ${
                    isActive(link.path)
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="mr-4 opacity-70">{link.icon}</span>
                  {link.name}
                </Link>
              ))}
              <div className="pt-4">
                <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center justify-center w-full px-4 py-4 rounded-xl font-black text-white bg-blue-600 shadow-lg shadow-blue-600/30 gap-2">
                  {user ? (
                    <>
                      <LayoutDashboard size={18} />
                      Dashboard
                    </>
                  ) : (
                    config.loginButtonText
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
