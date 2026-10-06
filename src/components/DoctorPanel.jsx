import React from 'react';
import { Activity, Clock, ArrowRight, CornerDownRight } from 'lucide-react';
import { useDoctorQueue } from '../hooks/useDoctorQueue';

export default function DoctorPanel({ subView = 'workbench', paramId, db, handlers }) {
  const currentDoctorId = db?.currentUser?.id || 'STF-001';
  const currentDoctorName = db?.currentUser?.name || 'Dr. Alexander Bennett';

  // Wire doctor's daily appointment queue through the isolated hook
  const { queue, loading, updateQueueStatus } = useDoctorQueue(currentDoctorId, db?.liveQueue);

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
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                        Loading daily consultation queue...
                      </td>
                    </tr>
                  ) : queue.length > 0 ? (
                    queue.map((q, idx) => (
                      <tr key={q.queueNo || q.appointmentId || idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{q.patientName || q.patient_name}</div>
                          <span className="text-xs text-slate-400 font-mono">
                            {q.patientId || q.patient_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{q.reason || 'Routine Checkup'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                              q.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border-blue-150 animate-pulse'
                                : q.status === 'WALK_IN'
                                ? 'bg-amber-50 text-amber-700 border-amber-150'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg inline-flex items-center space-x-1.5 cursor-pointer ml-auto shadow-xs"
                          >
                            <span>Call Patient</span>
                            <CornerDownRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
                        No triage patients in your queue today. Refresh to monitor check-ins.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder consultation room */}
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
