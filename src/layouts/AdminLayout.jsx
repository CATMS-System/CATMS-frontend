import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Users, Settings, LogOut, Shield, MapPin } from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Ensure Admin or Branch_Manager
  if (user.System_Role !== 'Admin' && user.System_Role !== 'Branch_Manager') {
    return <div className="p-10 text-center text-red-500">Access Denied</div>;
  }

  const getMenu = () => {
    if (user.System_Role === 'Admin') {
      return [
        { path: '/admin', name: 'Dashboard', icon: Activity },
        { path: '/admin/audit', name: 'Audit Logs', icon: Shield },
        { path: '/admin/branches', name: 'Branches', icon: MapPin },
      ];
    }
    return [
      { path: '/manager', name: 'My Branch', icon: Activity },
      { path: '/manager/staff', name: 'Staff Roster', icon: Users },
    ];
  };

  const menu = getMenu();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans selection:bg-indigo-500/30">
      {/* Sidebar - Glassmorphism style */}
      <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-all duration-300">
        <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-4">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">CATMS</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (location.pathname === '/admin' && item.path === '/admin');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20 shadow-inner' 
                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800/50">
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 mb-4">
            <p className="text-sm font-medium text-white truncate">{user.Username}</p>
            <p className="text-xs text-slate-400 mt-1">{user.System_Role}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle background gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/20 to-transparent -z-10 pointer-events-none" />
        
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-800/30 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-2xl font-semibold tracking-tight text-white capitalize">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
               <Settings className="w-4 h-4 text-slate-400" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
