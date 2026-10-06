import React, { useState, useMemo } from 'react';
import { Activity, Clock, ArrowRight, CornerDownRight, ArrowLeft, Heart, Thermometer, User, Calendar, FileText, Stethoscope } from 'lucide-react';
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

  // Resolve active appointment and patient data from db
  const activeAppt = useMemo(() => {
    if (!activeAppointmentId) return null;
    return (
      db?.appointmentList?.find(
        (a) => a.id === activeAppointmentId || String(a.appointment_id) === String(activeAppointmentId)
      ) || {
        id: activeAppointmentId,
        date: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        reason: 'Clinical consultation',
        status: 'In-Progress',
      }
    );
  }, [db?.appointmentList, activeAppointmentId]);

  const activePatient = useMemo(() => {
    const pId = activePatientId || activeAppt?.patientId || activeAppt?.patient_id;
    if (!pId) return null;
    return (
      db?.patientList?.find(
        (p) => p.id === pId || String(p.patient_id) === String(pId)
      ) || {
        id: pId,
        name: 'Patient ' + pId,
        dob: '1990-01-01',
        gender: 'Not specified',
        nic: '900000000V',
        insurance: { provider: 'Standard Health' },
      }
    );
  }, [db?.patientList, activePatientId, activeAppt]);

  // Calculate age from date of birth
  const patientAge = useMemo(() => {
    if (!activePatient?.dob) return 'N/A';
    const birthYear = new Date(activePatient.dob).getFullYear();
    const currentYear = new Date().getFullYear();
    const calculated = currentYear - birthYear;
    return calculated > 0 && !isNaN(calculated) ? `${calculated} yrs` : 'N/A';
  }, [activePatient?.dob]);

  // Vitals inputs state
  const [vitals, setVitals] = useState({
    bp: '',
    hr: '',
    temp: '',
    spo2: '',
    weight: '',
  });

  // Clinical diagnosis and notes state
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Today's minimum date string for follow-up validation
  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

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

      {/* 2. CONSULTATION ROOM ROUTE */}
      {subView === 'consultation' && (
        <div className="space-y-6 animate-fade-in">
          {/* Patient Header (Name, Age, Appointment info) */}
          <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 bg-white/10 text-white rounded-full flex items-center justify-center font-bold text-xl border border-white/20">
                {activePatient?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold font-mono">
                  In Consultation
                </span>
                <h2 className="text-xl font-bold mt-0.5">{activePatient?.name || 'Selected Patient'}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70 font-mono mt-1">
                  <span>Patient ID: {activePatient?.id || activePatientId || 'N/A'}</span>
                  <span>|</span>
                  <span>Age: {patientAge}</span>
                  <span>|</span>
                  <span>DOB: {activePatient?.dob || 'N/A'}</span>
                  <span>|</span>
                  <span>Gender: {activePatient?.gender || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                <span className="block text-white/50 text-[9px] uppercase tracking-wider mb-0.5 font-bold">
                  Appointment Details
                </span>
                <strong className="text-white text-xs block">
                  #{activeAppt?.id || activeAppointmentId || 'N/A'} ({activeAppt?.time || 'Scheduled'})
                </strong>
                <span className="text-[10px] text-white/70 truncate max-w-xs block">
                  Reason: {activeAppt?.reason || 'General checkup'}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handlers?.navigateTo ? handlers.navigateTo('/doctor/workbench') : window.history.back()
                }
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-3 font-semibold transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Queue</span>
              </button>
            </div>
          </div>

          {/* Consultation Form: Vitals + Diagnosis + Notes */}
          <div className="space-y-6">
            {/* Vitals Input Fields */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3 flex items-center">
                <Activity className="h-4.5 w-4.5 text-blue-600 mr-1.5 animate-pulse" />
                Patient Vitals
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Blood Pressure (mmHg)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120/80"
                    className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                    value={vitals.bp}
                    onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 72"
                    className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                    value={vitals.hr}
                    onChange={(e) => setVitals({ ...vitals, hr: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 98.6"
                    className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    SpO2 (%)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 98"
                    className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 70"
                    className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                    value={vitals.weight}
                    onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Diagnosis & Notes Fields */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3 flex items-center">
                <Stethoscope className="h-4.5 w-4.5 text-blue-600 mr-1.5" />
                Clinical Diagnosis & Consultation Notes
              </h3>

              <div className="space-y-4">
                {/* Diagnosis (Required) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Clinical Diagnosis <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">Required</span>
                  </div>
                  <textarea
                    required
                    rows="3"
                    placeholder="Enter formal clinical diagnosis (e.g. Acute bacterial bronchitis, Essential hypertension)..."
                    className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Clinical Notes
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Chief complaints, symptoms presentation, physical findings, and medical observations..."
                    className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm text-slate-800"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </div>

                {/* Doctor Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Doctor Notes (Confidential Remarks)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Internal clinician remarks, differential diagnoses, or specialist follow-up observations..."
                    className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm text-slate-800 bg-slate-50/50"
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                  />
                </div>

                {/* Follow-Up Date */}
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Follow-Up Date</span>
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm font-mono text-slate-800"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
