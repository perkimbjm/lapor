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
                {theme === 'light' ? <Moon size={20} className="text-slate-700 dark:text-slate-200" /> : <Sun size={20} className="text-slate-700 dark:text-slate-200" />}
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
                {theme === 'light' ? <Moon size={20} className="text-slate-700 dark:text-slate-200" /> : <Sun size={20} className="text-slate-700 dark:text-slate-200" />}
              </button>

              <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={24} className="text-slate-700 dark:text-slate-200" /> : <Menu size={24} className="text-slate-700 dark:text-slate-200" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden overflow-hidden">
        <div
          style={{
            maxHeight: isOpen ? '400px' : '0px',
            opacity: isOpen ? 1 : 0,
            transition: 'max-height 300ms ease-out, opacity 300ms ease-out',
          }}
        >
          <div className="mx-4 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-0">
              {/* Navigation Links */}
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors ${
                    isActive(link.path)
                      ? 'bg-blue-50/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0">{link.icon}</span>
                  <span className="font-semibold text-sm">{link.name}</span>
                </Link>
              ))}

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-700" />

              {/* Auth Section */}
              <div className="p-3">
                {user ? (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors gap-2"
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogin();
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    {config.loginButtonText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;