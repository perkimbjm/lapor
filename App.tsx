
import React, { Suspense, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { Toaster, toast } from 'sonner';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import { useConnectionRecovery } from './src/hooks/useConnectionRecovery';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import ReportForm from './pages/public/ReportForm';
import TrackComplaint from './pages/public/TrackComplaint';

// Admin Pages (static import - loaded immediately)
import Dashboard from './pages/admin/Dashboard';
import ComplaintList from './pages/admin/ComplaintList';
import NotificationsList from './pages/admin/NotificationsList';
import NotificationDetail from './pages/admin/NotificationsDetail';
import MaterialInventory from './pages/admin/MaterialInventory';
import EquipmentInventory from './pages/admin/EquipmentInventory';
import WorkforceManagement from './pages/admin/WorkforceManagement';
import Settings from './pages/admin/Settings';
import CMS from './pages/admin/CMS';
import UserManagement from './pages/admin/UserManagement';
import RoleManagement from './pages/admin/RoleManagement';
import PermissionManagement from './pages/admin/PermissionManagement';
import ActivityLog from './pages/admin/ActivityLog';
import AuditLog from './pages/admin/AuditLog';

// Lazy-loaded Pages (loaded on-demand with their vendor chunks)
const MapDistribution = React.lazy(() => import('./pages/admin/MapDistribution'));
const Reports = React.lazy(() => import('./pages/admin/Reports'));

import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './pages/admin/AdminLayout';

// Loading fallback component for lazy routes
const LazyLoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full min-h-screen">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Memuat halaman...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const handleTabRecovery = useCallback(async () => {
    setRecoveryMessage('Menyambung kembali ke server...');
    toast.loading('Menyambung kembali ke server...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    setRecoveryMessage(null);
    toast.dismiss();
    toast.success('Terhubung kembali ke server');
  }, []);

  useConnectionRecovery(handleTabRecovery, 600);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        <PWAUpdatePrompt />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/report" element={<ReportForm />} />
            <Route path="/track" element={<TrackComplaint />} />

            {/* Admin Routes (Protected & Nested) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout title="Sistem Manajemen Pemeliharaan Jalan dan Jembatan" />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProtectedRoute requirePermission="DASHBOARD_READ"><Dashboard /></ProtectedRoute>} />
              <Route path="complaints" element={<ProtectedRoute requirePermission="COMPLAINTS_READ"><ComplaintList /></ProtectedRoute>} />
              <Route path="inventory" element={<ProtectedRoute requirePermission="INVENTORY_READ"><MaterialInventory /></ProtectedRoute>} />
              <Route path="equipment" element={<ProtectedRoute requirePermission="EQUIPMENT_READ"><EquipmentInventory /></ProtectedRoute>} />
              <Route path="workforce" element={<ProtectedRoute requirePermission="WORKFORCE_READ"><WorkforceManagement /></ProtectedRoute>} />
              <Route path="map" element={<ProtectedRoute requirePermission="MAP_READ"><Suspense fallback={<LazyLoadingFallback />}><MapDistribution /></Suspense></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute requirePermission="REPORTS_READ"><Suspense fallback={<LazyLoadingFallback />}><Reports /></Suspense></ProtectedRoute>} />
              <Route path="settings" element={<Settings />} />
              <Route path="cms" element={<ProtectedRoute requirePermission="CMS_READ"><CMS /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute requirePermission="USERS_READ"><UserManagement /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute requirePermission="ROLES_READ"><RoleManagement /></ProtectedRoute>} />
              <Route path="permissions" element={<ProtectedRoute requirePermission="PERMISSIONS_READ"><PermissionManagement /></ProtectedRoute>} />
              <Route path="activities" element={<ActivityLog />} />
              <Route path="audit-logs" element={<ProtectedRoute requirePermission="AUDIT_LOG_READ"><AuditLog /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute requirePermission="NOTIFICATIONS_READ"><NotificationsList /></ProtectedRoute>} />
              <Route path="notifications/:id" element={<ProtectedRoute requirePermission="NOTIFICATIONS_READ"><NotificationDetail /></ProtectedRoute>} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};


export default App;
