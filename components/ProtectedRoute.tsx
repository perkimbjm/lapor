import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = true, requirePermission }) => {
  const { user, isAdmin, permissions, loading, hasPermission } = useAuth();
  const location = useLocation();

  // Grace period: jangan redirect karena permissions kosong sebelum
  // checkAdminStatus selesai. Kalau setelah 1.5 detik permissions masih
  // kosong DAN user bukan admin, baru redirect.
  const [graceExpired, setGraceExpired] = useState(false);
  useEffect(() => {
    setGraceExpired(false);
    const t = setTimeout(() => setGraceExpired(true), 1500);
    return () => clearTimeout(t);
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Tunggu grace period sebelum memutuskan redirect berdasarkan permissions
  if (requireAdmin && !isAdmin && permissions.length === 0) {
    if (!graceExpired) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  // Check specific permission required for this route (e.g. WORKFORCE_READ)
  if (requirePermission && !hasPermission(requirePermission)) {
    if (!graceExpired) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      );
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
