import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import AdminPanel from './pages/AdminPanel';
import ManagerPanel from './pages/ManagerPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin" replace />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="admin/audit" element={<div className="text-white text-2xl font-bold">Audit Logs Page</div>} />
            <Route path="admin/branches" element={<div className="text-white text-2xl font-bold">Branches Management Page</div>} />
            
            <Route path="manager" element={<ManagerPanel />} />
            <Route path="manager/staff" element={<div className="text-white text-2xl font-bold">Staff Management Page</div>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
