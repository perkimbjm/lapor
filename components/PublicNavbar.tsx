// components/PublicNavbar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Activity, Home, Search, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { supabase } from '../src/supabase';
import { useAuth } from './AuthContext';

const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [config, setConfig] = React.useState({
    navbarBrand: 'Bepadah',
    navbarLogoUrl: '',
    menuBeranda: 'Beranda',
    menuLapor: 'Lapor Sekarang',
    menuCekStatus: 'Cek Status',
    loginButtonText: 'Login Petugas',
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('cms')
        .select('data')
        .eq('id', 'site_config')
        .single();

      if (data?.data) {
        setConfig(prev => ({ ...prev, ...data.data }));
      }
    };

    fetchConfig();
  }, []);

  // FIX: gunakan env, bukan window.location
  const handleLogin = async () => {
    const redirectUrl = `${import.meta.env.VITE_SITE_URL}/admin`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      console.error('Login error:', error.message);
    }
  };

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

            <Link to="/" className="flex items-center group">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
                {config.navbarLogoUrl ? (
                  <img src={config.navbarLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Activity className="text-white" size={24} />
                )}
              </div>
              <span className="font-bold text-2xl text-slate-900 dark:text-white">
                {config.navbarBrand}
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center px-4 py-2 rounded-xl text-sm font-semibold ${
                    isActive(link.path)
                      ? 'text-blue-600 bg-blue-50/80 dark:bg-blue-900/40'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.name}
                </Link>
              ))}

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-4" />

              <button onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {user ? (
                <Link to="/admin" className="px-6 py-2 text-white bg-blue-600 rounded-xl flex items-center gap-2">
                  <LayoutDashboard size={18} /> Dashboard
                </Link>
              ) : (
                <button onClick={handleLogin} className="px-6 py-2 text-white bg-blue-600 rounded-xl">
                  {config.loginButtonText}
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center gap-3">
              <button onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden mx-4 mt-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow">
            <div className="p-4 space-y-2">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)}>
                  {link.name}
                </Link>
              ))}

              {user ? (
                <Link to="/admin" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
              ) : (
                <button onClick={() => { setIsOpen(false); handleLogin(); }}>
                  {config.loginButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;