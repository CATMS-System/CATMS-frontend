import React, { useMemo } from 'react';
import { Activity, Clock, ArrowRight, CornerDownRight, ArrowLeft } from 'lucide-react';
import { useDoctorQueue } from '../hooks/useDoctorQueue';

export default function DoctorPanel({ subView = 'workbench', paramId, db, handlers }) {
  const currentDoctorId = db?.currentUser?.id || 'STF-001';
  const currentDoctorName = db?.currentUser?.name || 'Dr. Alexander Bennett';

  // Wire doctor's daily appointment queue through isolated hook
  const { queue, loading, updateQueueStatus } = useDoctorQueue(currentDoctorId, db?.liveQueue);

  // Parse appointment_id and patient_id from route / URL
  const { activeAppointmentId, activePatientId } = useMemo(() => {
    let apptId = null;
    let patId = null;

    if (paramId) {
      // Handles both /doctor/consultation/:appointmentId?patient_id=:patientId and /doctor/consultation/:appointmentId/:patientId
      const cleanParam = paramId.split('?')[0];
      const parts = cleanParam.split('/');
      apptId = parts[0] || null;
      if (parts.length > 1) {
        patId = parts[1];
      }
    }

    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('patient_id')) {
        patId = params.get('patient_id');
      }
      if (params.get('appointment_id')) {
        apptId = params.get('appointment_id');
      }
    }

    return {
      activeAppointmentId: apptId,
      activePatientId: patId,
    };
  }, [paramId]);

  // Navigate to consultation room route, passing appointment_id and patient_id
  const handleSelectPatient = (queueItem) => {
    const apptId = queueItem.appointmentId || queueItem.appointment_id || 'APP-1001';
    const patientId = queueItem.patientId || queueItem.patient_id || 'PAT-0001';

    updateQueueStatus(patientId, 'IN_PROGRESS');

    const targetRoute = `/doctor/consultation/${apptId}?patient_id=${patientId}`;
    if (handlers?.navigateTo) {
      handlers.navigateTo(targetRoute);
    } else {
      window.history.pushState(null, '', targetRoute);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

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
                      <tr
                        key={q.queueNo || q.appointmentId || idx}
                        onClick={() => handleSelectPatient(q)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPatient(q);
                            }}
                            className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg inline-flex items-center space-x-1.5 cursor-pointer ml-auto shadow-xs"
                          >
                            <span>{q.status === 'IN_PROGRESS' ? 'Resume Console' : 'Call Patient'}</span>
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

      {/* 2. CONSULTATION ROOM ROUTE (PLACEHOLDER) */}
      {subView === 'consultation' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center">
            <Activity className="h-10 w-10 text-blue-600 mx-auto mb-3 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-800">Consultation Room</h2>
            <p className="text-sm text-slate-500 mt-1">
              Active session for Appointment: <span className="font-mono font-semibold text-slate-700">{activeAppointmentId || 'N/A'}</span> | Patient: <span className="font-mono font-semibold text-slate-700">{activePatientId || 'N/A'}</span>
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => handlers?.navigateTo ? handlers.navigateTo('/doctor/workbench') : window.history.back()}
                className="inline-flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
