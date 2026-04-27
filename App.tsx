
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { Toaster } from 'sonner';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import ReportForm from './pages/public/ReportForm';
import TrackComplaint from './pages/public/TrackComplaint';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import ComplaintList from './pages/admin/ComplaintList';
import MaterialInventory from './pages/admin/MaterialInventory';
import EquipmentInventory from './pages/admin/EquipmentInventory';
import WorkforceManagement from './pages/admin/WorkforceManagement';
import MapDistribution from './pages/admin/MapDistribution';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import CMS from './pages/admin/CMS';
import UserManagement from './pages/admin/UserManagement';
import RoleManagement from './pages/admin/RoleManagement';
import PermissionManagement from './pages/admin/PermissionManagement';
import ActivityLog from './pages/admin/ActivityLog';
import AuditLog from './pages/admin/AuditLog';

import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './pages/admin/AdminLayout';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Toaster position="top-center" richColors />
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
              <Route path="map" element={<ProtectedRoute requirePermission="MAP_READ"><MapDistribution /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute requirePermission="REPORTS_READ"><Reports /></ProtectedRoute>} />
              <Route path="settings" element={<Settings />} />
              <Route path="cms" element={<ProtectedRoute requirePermission="CMS_READ"><CMS /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute requirePermission="USERS_READ"><UserManagement /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute requirePermission="ROLES_READ"><RoleManagement /></ProtectedRoute>} />
              <Route path="permissions" element={<ProtectedRoute requirePermission="PERMISSIONS_READ"><PermissionManagement /></ProtectedRoute>} />
              <Route path="activities" element={<ActivityLog />} />
              <Route path="audit-logs" element={<ProtectedRoute requirePermission="AUDIT_LOG_READ"><AuditLog /></ProtectedRoute>} />
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
