import React from 'react';
import { Activity, Clock, ArrowRight, CornerDownRight } from 'lucide-react';

export default function DoctorPanel({ subView = 'workbench', paramId, db, handlers }) {
  const currentDoctorName = db?.currentUser?.name || 'Dr. Alexander Bennett';

  return (
    <div className="space-y-6">
      {/* 1. DOCTOR WORKBENCH (QUEUE SUMMARY) */}
      {subView === 'workbench' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clinician Triage Workbench</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage waiting room queues, recall diagnostics, and open active clinical consoles
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-md">Daily Consultation Queue</h2>
              <span className="bg-blue-50 text-blue-800 border border-blue-100 rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono">
                Attending: {currentDoctorName}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3 text-center">Position</th>
                    <th className="px-6 py-3">Patient Code & Name</th>
                    <th className="px-6 py-3">Reason for Visit</th>
                    <th className="px-6 py-3">Status Tag</th>
                    <th className="px-6 py-3 text-right">Consultation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
                      No triage patients in your queue today. Refresh to monitor check-ins.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder consultation room for routes other than workbench */}
      {subView === 'consultation' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          <Activity className="h-10 w-10 text-blue-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Consultation Room</h2>
          <p className="text-sm mt-1">Select a patient from the queue to start consultation.</p>
        </div>
      )}
    </div>
  );
}
