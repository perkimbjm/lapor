
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Toaster position="top-center" richColors />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<ReportForm />} />
          <Route path="/track" element={<TrackComplaint />} />

          {/* Admin Routes (Simulated Auth) */}
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/complaints" element={<ComplaintList />} />
          <Route path="/admin/inventory" element={<MaterialInventory />} />
          <Route path="/admin/equipment" element={<EquipmentInventory />} />
          <Route path="/admin/workforce" element={<WorkforceManagement />} />
          <Route path="/admin/map" element={<MapDistribution />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/cms" element={<CMS />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/roles" element={<RoleManagement />} />
          <Route path="/admin/permissions" element={<PermissionManagement />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
