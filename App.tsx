
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
              <Route index element={<Dashboard />} />
              <Route path="complaints" element={<ComplaintList />} />
              <Route path="inventory" element={<MaterialInventory />} />
              <Route path="equipment" element={<EquipmentInventory />} />
              <Route path="workforce" element={<WorkforceManagement />} />
              <Route path="map" element={<MapDistribution />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="cms" element={<CMS />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="permissions" element={<PermissionManagement />} />
              <Route path="activities" element={<ActivityLog />} />
              <Route path="audit-logs" element={<AuditLog />} />
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
