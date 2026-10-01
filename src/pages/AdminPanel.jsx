import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Users, Building2, Calendar, Search } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex items-start justify-between">
    <div>
      <p className="text-slate-400 font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const AdminPanel = () => {
  const [stats, setStats] = useState({ branches: 0, staff: 0 });

  useEffect(() => {
    api.get('/branches').then(res => setStats(prev => ({ ...prev, branches: res.data.length }))).catch(console.error);
    api.get('/staff').then(res => setStats(prev => ({ ...prev, staff: res.data.length }))).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Branches" value={stats.branches} icon={Building2} color="bg-indigo-500" />
        <StatCard title="Total Staff" value={stats.staff} icon={Users} color="bg-purple-500" />
        <StatCard title="Total Patients" value="--" icon={Users} color="bg-rose-500" />
        <StatCard title="Appointments Today" value="--" icon={Calendar} color="bg-emerald-500" />
      </div>

      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">System Audit Logs</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">User ID</th>
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Table</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="py-4 text-slate-300" colSpan="4">Fetching logs...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
