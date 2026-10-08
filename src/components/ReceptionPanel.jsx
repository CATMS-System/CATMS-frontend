import React, { useState, useMemo } from 'react';
import { Search, Plus, Calendar, Clock, Check, X, ShieldAlert, Phone, Shield, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import PatientsSection from './patients/PatientsSection';

export default function ReceptionPanel({ subView, db, handlers }) {
  const { patientList, staffList, appointmentList, liveQueue } = db;
  const { setAppointmentList, setLiveQueue, triggerToast, addAuditLog, navigateTo, reloadPatients } = handlers;

  const currentBranch = db.currentUser.branch || 'Colombo Main';

  // Calendar States
  const [selectedDocId, setSelectedDocId] = useState(
    staffList.find(s => s.branch === currentBranch && (s.role.includes('Doc') || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner'))?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState('2026-08-23');
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSlotHour, setSelectedSlotHour] = useState(null);
  const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Emergency Walk-in State
  const [walkinPatientId, setWalkinPatientId] = useState('');
  const [walkinDocId, setWalkinDocId] = useState(selectedDocId);
  const [walkinReason, setWalkinReason] = useState('');

  // Triage list filtered to local branch
  const localQueue = useMemo(() => {
    return liveQueue.filter(q => {
      const doc = staffList.find(s => s.id === q.doctorId);
      return doc?.branch === currentBranch;
    });
  }, [liveQueue, staffList, currentBranch]);

  // Doctors list for calendar
  const branchDoctors = useMemo(() => {
    return staffList.filter(s => s.branch === currentBranch && (s.role.includes('Doc') || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner') && s.status === 'Active');
  }, [staffList, currentBranch]);

  // Appointment calendar config
  const calendarHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];

  // Add Emergency Walk-in handler
  const handleAddEmergencyWalkin = (e) => {
    e.preventDefault();
    if (!walkinPatientId || !walkinDocId) {
      alert('Please select patient and doctor.');
      return;
    }

    const patientObj = patientList.find(p => p.id === walkinPatientId);
    const docObj = staffList.find(s => s.id === walkinDocId);

    // Generate walkthrough queue appointment
    const newApptId = `APP-${(appointmentList.length + 1001).toString()}`;
    const newAppt = {
      id: newApptId,
      date: '2026-08-23',
      time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
      doctorId: walkinDocId,
      doctorName: docObj ? docObj.name : 'Unknown Doctor',
      patientId: walkinPatientId,
      patientName: patientObj ? patientObj.name : 'Unknown Patient',
      branch: currentBranch,
      status: 'Booked',
      isWalkIn: true,
      reason: walkinReason || 'Emergency walk-in'
    };

    setAppointmentList([...appointmentList, newAppt]);

    const newQueueNo = liveQueue.length > 0 ? Math.max(...liveQueue.map(q => q.queueNo)) + 1 : 1;
    const newQueueObj = {
      queueNo: newQueueNo,
      patientId: walkinPatientId,
      patientName: patientObj?.name || 'Walkin Patient',
      reason: walkinReason || 'Emergency Consultation',
      assignedDoctor: docObj?.name || 'Physician',
      doctorId: walkinDocId,
      estWaitTime: 5, // walk-in gets prioritised
      isEmergency: true,
      room: docObj?.role.includes('Card') ? 'Room 105' : 'Consultation Room B',
      status: 'WALK_IN'
    };

    // Prioritize walk-in at top of active queue
    const updatedQueue = [newQueueObj, ...liveQueue];
    setLiveQueue(updatedQueue);

    addAuditLog(
      'CREATE_APPOINTMENT',
      `Checked in emergency walk-in patient ${newQueueObj.patientName} (${newQueueObj.patientId}) for doctor ${newQueueObj.assignedDoctor}`,
      'null',
      JSON.stringify({ appointment: newAppt, queue: newQueueObj })
    );

    triggerToast(`Emergency check-in completed! Added to queue.`);
    setWalkinPatientId('');
    setWalkinReason('');
  };

  // Appointment scheduling grid slot actions
  const getSlotStatus = (hour) => {
    const appt = appointmentList.find(a => a.doctorId === selectedDocId && a.time === hour && a.date === selectedDate && a.branch === currentBranch);
    if (!appt) return { status: 'Available', label: 'Available (Green)', style: 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100' };
    if (appt.status === 'Cancelled') return { status: 'Available', label: 'Available (Green)', style: 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100' };
    if (appt.isWalkIn || appt.status === 'Walk-In') return { status: 'Walk-In', appt, label: 'Walk-In (Orange)', style: 'bg-amber-100 text-amber-800 border-amber-200' };
    if (appt.status === 'Booked') return { status: 'Booked', appt, label: 'Booked (Blue)', style: 'bg-blue-55 text-blue-800 border-blue-200' };
    return { status: 'Blocked', appt, label: 'Blocked (Gray)', style: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  const handleBookSlot = (hour) => {
    setSelectedSlotHour(hour);
    setShowBookModal(true);
  };

  const submitBooking = (e) => {
    e.preventDefault();
    const patId = e.target.bookPatient.value;
    const patObj = patientList.find(p => p.id === patId);
    const docObj = staffList.find(s => s.id === selectedDocId);

    const newApptId = `APP-${(appointmentList.length + 1001).toString()}`;
    const newAppt = {
      id: newApptId,
      date: selectedDate,
      time: selectedSlotHour,
      doctorId: selectedDocId,
      doctorName: docObj?.name || 'Physician',
      patientId: patId,
      patientName: patObj?.name || 'Patient',
      branch: currentBranch,
      status: 'Booked',
      reason: e.target.visitReason.value
    };

    // Auto add to liveQueue if date is today
    let updatedQueue = [...liveQueue];
    if (selectedDate === '2026-08-23') {
      const qNo = liveQueue.length > 0 ? Math.max(...liveQueue.map(q => q.queueNo)) + 1 : 1;
      updatedQueue.push({
        queueNo: qNo,
        patientId: patId,
        patientName: patObj?.name || 'Patient',
        reason: e.target.visitReason.value,
        assignedDoctor: docObj?.name || 'Physician',
        doctorId: selectedDocId,
        estWaitTime: liveQueue.length * 15 + 10,
        room: docObj?.role.includes('Card') ? 'Room 105' : 'Consultation Room A',
        status: 'SCHEDULED'
      });
      setLiveQueue(updatedQueue);
    }

    setAppointmentList([...appointmentList, newAppt]);
    addAuditLog(
      'CREATE_APPOINTMENT',
      `Booked appointment ${newApptId} for ${newAppt.patientName} with ${newAppt.doctorName} at ${newAppt.time}`,
      'null',
      JSON.stringify(newAppt)
    );

    triggerToast(`Appointment booked successfully! ID: ${newApptId}`);
    setShowBookModal(false);
  };

  const handleReschedule = (appt) => {
    setSelectedAppointmentForAction(appt);
    setShowRescheduleModal(true);
  };

  const submitReschedule = (e) => {
    e.preventDefault();
    const newHour = e.target.newTime.value;
    const newDate = e.target.newDate.value;

    // conflict checker
    const conflict = appointmentList.find(a => a.doctorId === selectedAppointmentForAction.doctorId && a.time === newHour && a.date === newDate && a.status === 'Booked' && a.id !== selectedAppointmentForAction.id);
    if (conflict) {
      alert(`Conflict detected: Doctor already has an appointment booked at ${newHour} on ${newDate}.`);
      return;
    }

    const updated = appointmentList.map(a => {
      if (a.id === selectedAppointmentForAction.id) {
        return { ...a, date: newDate, time: newHour };
      }
      return a;
    });

    setAppointmentList(updated);
    addAuditLog(
      'UPDATE_APPOINTMENT',
      `Rescheduled appointment ${selectedAppointmentForAction.id} to ${newDate} @ ${newHour}`,
      JSON.stringify(selectedAppointmentForAction),
      JSON.stringify({ ...selectedAppointmentForAction, date: newDate, time: newHour })
    );

    triggerToast('Appointment rescheduled successfully!');
    setShowRescheduleModal(false);
  };

  const handleCancel = (appt) => {
    setSelectedAppointmentForAction(appt);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const submitCancel = (e) => {
    e.preventDefault();
    if (!cancelReason) {
      alert('Cancellation reason is required.');
      return;
    }

    const updated = appointmentList.map(a => {
      if (a.id === selectedAppointmentForAction.id) {
        return { ...a, status: 'Cancelled', cancellationReason: cancelReason };
      }
      return a;
    });

    // Remove from queue if present
    const updatedQueue = liveQueue.filter(q => q.patientId !== selectedAppointmentForAction.patientId);
    setLiveQueue(updatedQueue);

    setAppointmentList(updated);
    addAuditLog(
      'UPDATE_APPOINTMENT',
      `Cancelled appointment ${selectedAppointmentForAction.id}. Reason: ${cancelReason}`,
      JSON.stringify(selectedAppointmentForAction),
      JSON.stringify({ ...selectedAppointmentForAction, status: 'Cancelled', cancellationReason: cancelReason })
    );

    triggerToast('Appointment cancelled. Slot released.');
    setShowCancelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. RECEPTIONIST WORKBENCH (DASHBOARD) */}
      {subView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Receptionist Desk Workbench</h1>
              <p className="text-sm text-slate-500 mt-1">Review active branch queue triage entries, dispatch walk-ins, and fast-book schedules</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigateTo('/reception/patients')}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Patient</span>
              </button>
              <button
                onClick={() => navigateTo('/reception/appointments')}
                className="px-3.5 py-2 bg-white border border-slate-250 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Book Appointment</span>
              </button>
              <button
                onClick={() => navigateTo('/reception/walkin')}
                className="px-3.5 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Emergency Walk-in</span>
              </button>
            </div>
          </div>

          {/* Active Triage Queue Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-md">Live Active Branch Queue Tracker</h2>
              <span className="bg-sky-50 text-sky-850 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-sky-100 font-mono">
                {currentBranch} Room Allocations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3">Queue No.</th>
                    <th className="px-6 py-3">Patient Code & Name</th>
                    <th className="px-6 py-3">Triage Reason</th>
                    <th className="px-6 py-3">Assigned Physician</th>
                    <th className="px-6 py-3">Target Room</th>
                    <th className="px-6 py-3">Status Tag</th>
                    <th className="px-6 py-3 text-right">Est. Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {localQueue.map(q => (
                    <tr key={q.queueNo} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">#{q.queueNo}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{q.patientName}</div>
                        <span className="text-xs text-slate-400 font-mono">{q.patientId}</span>
                      </td>
                      <td className="px-6 py-4">{q.reason}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{q.assignedDoctor}</td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        <span className="px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                          {q.room}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${q.status === 'WALK_IN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">~{q.estWaitTime} mins</td>
                    </tr>
                  ))}
                  {localQueue.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-slate-400">
                        No patient triage records checked in for this branch queue today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PATIENT REGISTRATION & LOOKUP MODULE */}
      {subView === 'patients' && (
        <PatientsSection triggerToast={triggerToast} addAuditLog={addAuditLog} onPatientsChanged={reloadPatients} />
      )}

      {/* 3. APPOINTMENT SCHEDULING CALENDAR */}
      {subView === 'appointments' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Appointment Scheduling Calendar</h1>
              <p className="text-sm text-slate-500 mt-1">Book scheduled clinic visits, reschedule slots, and audit practitioner load</p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <select
                  className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white font-medium"
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                >
                  <option value="">-- Select Practitioner --</option>
                  {branchDoctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  className="border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Color indicators */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 bg-emerald-500 rounded" />
              <span className="text-slate-650">Available (Green)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 bg-blue-500 rounded" />
              <span className="text-slate-650">Booked (Blue)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 bg-amber-500 rounded" />
              <span className="text-slate-650">Walk-In (Orange)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 bg-slate-300 rounded" />
              <span className="text-slate-650">Blocked / Leave (Gray)</span>
            </div>
          </div>

          {/* Interactive Scheduling Grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-6 space-y-6">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Daily Consultation Slot Allocations</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {calendarHours.map(hour => {
                const info = getSlotStatus(hour);
                return (
                  <div
                    key={hour}
                    className={`border rounded-xl p-4 transition-all flex flex-col justify-between h-32 select-none ${info.style}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-md flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-slate-400" />
                        {hour}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{info.status}</span>
                    </div>

                    <div className="mt-2 text-xs">
                      {info.status === 'Available' ? (
                        <button
                          onClick={() => handleBookSlot(hour)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded py-1 px-2.5 font-semibold cursor-pointer"
                        >
                          Book Slot
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <strong className="block text-slate-900 truncate">{info.appt.patientName}</strong>
                          <span className="block text-[10px] text-slate-550 truncate font-mono">{info.appt.id}</span>
                          <div className="flex space-x-2 pt-1 border-t border-slate-200/50 mt-1">
                            <button
                              onClick={() => handleReschedule(info.appt)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                            >
                              Reschedule
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleCancel(info.appt)}
                              className="text-[10px] text-red-650 hover:text-red-800 font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. EMERGENCY WALK-IN INTAKE MODAL / PANEL */}
      {subView === 'walkin' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <div className="p-2 bg-amber-500 rounded-xl text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950 text-md">Emergency Walk-In Intake Form</h2>
              <span className="text-xs text-slate-400 font-mono">Assign walk-in patient directly to doctor queue</span>
            </div>
          </div>

          <form onSubmit={handleAddEmergencyWalkin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Select Registered Patient</label>
              <select
                className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                value={walkinPatientId}
                onChange={e => setWalkinPatientId(e.target.value)}
                required
              >
                <option value="">-- Select Patient Code / Name --</option>
                {patientList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.nic}) - {p.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Assign to Physician</label>
              <select
                className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                value={walkinDocId}
                onChange={e => setWalkinDocId(e.target.value)}
                required
              >
                {branchDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Chief Complaint / Triage Observations</label>
              <textarea
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                placeholder="Describe symptoms, e.g. severe asthma attack, burns, chest pains..."
                rows="3"
                value={walkinReason}
                onChange={e => setWalkinReason(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Dispatch Priority Emergency Check-in
            </button>
          </form>
        </div>
      )}

      {/* ==================================
          MODALS & DRAWERS (INTERACTIVE POPUPS)
          ================================== */}

      {/* BOOK APPOINTMENT MODAL */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowBookModal(false)} />
          <form onSubmit={submitBooking} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Book Roster Appointment Slot</h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-150 font-sans">
                <span>Practitioner: <strong>{staffList.find(s => s.id === selectedDocId)?.name}</strong></span>
                <span>Time: <strong>{selectedSlotHour}</strong></span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-sans">Select Patient</label>
                <select
                  name="bookPatient"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm font-sans"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patientList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 font-sans">Visit Reason / Consultation Target</label>
                <input
                  type="text"
                  required
                  name="visitReason"
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-sans"
                  placeholder="e.g. Regular medical follow up"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBookModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Confirm Appointment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESCHEDULE APPOINTMENT MODAL */}
      {showRescheduleModal && selectedAppointmentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowRescheduleModal(false)} />
          <form onSubmit={submitReschedule} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Reschedule Consultation</h3>
            <p className="text-xs text-slate-500">
              Reschedule appointment <strong>{selectedAppointmentForAction.id}</strong> for {selectedAppointmentForAction.patientName}.
            </p>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 font-sans">Target Date</label>
                <input
                  type="date"
                  required
                  name="newDate"
                  defaultValue={selectedAppointmentForAction.date}
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-sans">Target Time Hour Slot</label>
                <select
                  name="newTime"
                  defaultValue={selectedAppointmentForAction.time}
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm font-sans"
                >
                  {calendarHours.map(hour => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Check & Reschedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CANCEL APPOINTMENT MODAL */}
      {showCancelModal && selectedAppointmentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCancelModal(false)} />
          <form onSubmit={submitCancel} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-red-650 text-md border-b border-slate-100 pb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-1.5" />
              Cancel Appointment Allocation
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel the appointment for <strong>{selectedAppointmentForAction.patientName}</strong>?
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Mandatory Cancellation Reason
              </label>
              <textarea
                required
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                placeholder="State reason for cancellation (e.g. Patient requested, doctor emergency leave)..."
                rows="3"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
