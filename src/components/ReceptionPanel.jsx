import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Calendar, Clock, Check, X, ShieldAlert, Phone, Shield, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import PatientsSection from './patients/PatientsSection';
import {
  AppointmentBookingModal,
  WalkInModal,
  RescheduleModal,
  CancelAppointmentModal,
  ClinicQueueTable,
} from './appointments';
import { getDoctors, getSpecialties } from '../services/appointmentService';

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
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [selectedSlotHour, setSelectedSlotHour] = useState(null);
  const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // API Data
  const [apiDoctors, setApiDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  useEffect(() => {
    getDoctors().then(setApiDoctors).catch(err => console.error("API Error (Doctors):", err));
    getSpecialties().then(setSpecialties).catch(err => console.error("API Error (Specialties):", err));
  }, []);

  const currentBranchObj = db.branches?.find(b => b.Branch_Name === currentBranch || b.name === currentBranch);
  const currentBranchId = currentBranchObj?.Branch_ID || 1;

  const allDoctors = useMemo(() => {
    if (apiDoctors && apiDoctors.length > 0) return apiDoctors;
    return staffList
      .filter(s => (s.role && (s.role.includes('Doc') || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner')))
      .map((s, idx) => ({
        Doctor_ID: s.Staff_ID || s.staffId || (idx + 1),
        Staff_ID: s.Staff_ID || s.staffId || (idx + 1),
        First_Name: s.name ? s.name.split(' ')[0] : 'Dr.',
        Last_Name: s.name ? s.name.split(' ').slice(1).join(' ') : 'Specialist',
        Full_Name: s.name,
        Email: s.details?.email || null,
        Contact_Number: s.details?.contact || null,
        Branch_ID: s.Branch_ID || 1,
        Branch_Name: s.branch || 'Colombo Main',
        License_Number: s.details?.license || 'SLMC-12345',
        Standard_Consultation_Fee: s.details?.consultFee || 2000,
        Specialties: [s.role]
      }));
  }, [apiDoctors, staffList]);

  const patientOptions = useMemo(() => {
    return patientList.map(p => {
      const pid = typeof p.id === 'string' && p.id.startsWith('PAT-')
        ? parseInt(p.id.replace('PAT-', ''), 10)
        : (p.Patient_ID || parseInt(p.id, 10) || 1);
      return {
        Patient_ID: isNaN(pid) ? 1 : pid,
        Full_Name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient',
        NIC: p.nic || p.NIC || null,
        Contact_Number: p.contact || p.phone || null,
      };
    });
  }, [patientList]);

  const selectedApptResponse = useMemo(() => {
    if (!selectedAppointmentForAction) return null;
    const a = selectedAppointmentForAction;
    if (a.Appointment_ID && a.Patient_Name) return a;
    const apptIdNum = parseInt(String(a.id || '').replace('APP-', ''), 10) || 1;
    const patIdNum = parseInt(String(a.patientId || '').replace('PAT-', ''), 10) || 1;
    const docIdNum = parseInt(String(a.doctorId || '').replace('STF-', ''), 10) || 1;
    return {
      Appointment_ID: apptIdNum,
      Patient_ID: patIdNum,
      Patient_Name: a.patientName || 'Patient',
      Doctor_ID: docIdNum,
      Doctor_Name: a.doctorName || 'Physician',
      Branch_ID: currentBranchId,
      Branch_Name: a.branch || currentBranch,
      Appointment_Date: a.date || selectedDate,
      Start_Time: a.time ? (a.time.length === 5 ? `${a.time}:00` : a.time) : '09:00:00',
      Duration_Minutes: 30,
      Appointment_Type: a.isWalkIn ? 'Walk_In' : 'Standard',
      Status: a.status || 'Scheduled',
      Reason_For_Visit: a.reason || 'Consultation'
    };
  }, [selectedAppointmentForAction, currentBranchId, currentBranch, selectedDate]);

  const initialDocIdNum = useMemo(() => {
    if (!selectedDocId) return null;
    const num = parseInt(String(selectedDocId).replace('STF-', ''), 10);
    return isNaN(num) ? null : num;
  }, [selectedDocId]);

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
                onClick={() => setShowBookModal(true)}
                className="px-3.5 py-2 bg-white border border-slate-250 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Book Appointment</span>
              </button>
              <button
                onClick={() => setShowWalkInModal(true)}
                className="px-3.5 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Emergency Walk-in</span>
              </button>
            </div>
          </div>

          {/* Active Triage Queue Table powered by Member 3 ClinicQueueTable */}
          <ClinicQueueTable
            branchId={currentBranchId}
            initialDate={selectedDate}
            onSelectAppointment={(item) => {
              setSelectedAppointmentForAction({
                Appointment_ID: item.Appointment_ID,
                id: `APP-${item.Appointment_ID}`,
                patientId: `PAT-${item.Patient_ID}`,
                patientName: item.Patient_Name,
                doctorId: `STF-${item.Doctor_ID}`,
                doctorName: item.Doctor_Name,
                branch: item.Branch_Name,
                date: item.Appointment_Date,
                time: item.Start_Time?.slice(0, 5),
                status: item.Status,
                reason: item.Reason_For_Visit,
                isWalkIn: item.Appointment_Type === 'Walk_In'
              });
            }}
          />
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

            <div className="pt-2 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => setShowWalkInModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer shadow-xs flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Launch Interactive Walk-In & Triage Dialog</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================
          MEMBER 3 APPOINTMENT MODALS
          ================================== */}

      {/* REAL APPOINTMENT BOOKING MODAL */}
      <AppointmentBookingModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={(newAppt) => {
          setShowBookModal(false);
          triggerToast(`Appointment #${newAppt.Appointment_ID} booked for ${newAppt.Patient_Name}!`);
          addAuditLog(
            'CREATE_APPOINTMENT',
            `Booked appointment #${newAppt.Appointment_ID} for ${newAppt.Patient_Name} with ${newAppt.Doctor_Name} on ${newAppt.Appointment_Date} at ${newAppt.Start_Time}`,
            'null',
            JSON.stringify(newAppt)
          );
          setAppointmentList(prev => [
            ...prev,
            {
              id: `APP-${newAppt.Appointment_ID}`,
              Appointment_ID: newAppt.Appointment_ID,
              date: newAppt.Appointment_Date,
              time: newAppt.Start_Time?.slice(0, 5) || '09:00',
              doctorId: `STF-${newAppt.Doctor_ID}`,
              doctorName: newAppt.Doctor_Name,
              patientId: `PAT-${newAppt.Patient_ID}`,
              patientName: newAppt.Patient_Name,
              branch: newAppt.Branch_Name || currentBranch,
              status: newAppt.Status,
              reason: newAppt.Reason_For_Visit,
              isWalkIn: newAppt.Appointment_Type === 'Walk_In'
            }
          ]);
        }}
        doctors={allDoctors}
        specialties={specialties}
        patients={patientOptions}
        initialDoctorId={initialDocIdNum}
        initialDate={selectedDate}
      />

      {/* REAL RESCHEDULE APPOINTMENT MODAL */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onSuccess={(updated) => {
          setShowRescheduleModal(false);
          triggerToast(`Appointment #${updated.Appointment_ID} rescheduled successfully.`);
          addAuditLog(
            'UPDATE_APPOINTMENT',
            `Rescheduled appointment #${updated.Appointment_ID} to ${updated.Appointment_Date} at ${updated.Start_Time}`,
            JSON.stringify(selectedAppointmentForAction),
            JSON.stringify(updated)
          );
          setAppointmentList(prev => prev.map(a => {
            const matchId = a.Appointment_ID === updated.Appointment_ID || a.id === `APP-${updated.Appointment_ID}`;
            if (matchId) {
              return {
                ...a,
                date: updated.Appointment_Date,
                time: updated.Start_Time?.slice(0, 5) || a.time,
                status: updated.Status
              };
            }
            return a;
          }));
        }}
        appointment={selectedApptResponse}
        doctors={allDoctors}
      />

      {/* REAL CANCEL APPOINTMENT MODAL */}
      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={(updated) => {
          setShowCancelModal(false);
          triggerToast(`Appointment #${updated.Appointment_ID} cancelled.`);
          addAuditLog(
            'UPDATE_APPOINTMENT',
            `Cancelled appointment #${updated.Appointment_ID}. Reason: ${updated.Cancellation_Reason || 'Cancelled by reception staff'}`,
            JSON.stringify(selectedAppointmentForAction),
            JSON.stringify(updated)
          );
          setAppointmentList(prev => prev.map(a => {
            const matchId = a.Appointment_ID === updated.Appointment_ID || a.id === `APP-${updated.Appointment_ID}`;
            if (matchId) {
              return {
                ...a,
                status: 'Cancelled',
                cancellationReason: updated.Cancellation_Reason
              };
            }
            return a;
          }));
          if (selectedAppointmentForAction?.patientId) {
            setLiveQueue(prev => prev.filter(q => q.patientId !== selectedAppointmentForAction.patientId));
          }
        }}
        appointment={selectedApptResponse}
      />

      {/* REAL WALK-IN MODAL */}
      <WalkInModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSuccess={(newWalkIn) => {
          setShowWalkInModal(false);
          triggerToast(`Walk-in appointment #${newWalkIn.Appointment_ID} registered!`);
          addAuditLog(
            'CREATE_APPOINTMENT',
            `Registered walk-in appointment #${newWalkIn.Appointment_ID} for ${newWalkIn.Patient_Name}`,
            'null',
            JSON.stringify(newWalkIn)
          );
          setAppointmentList(prev => [
            ...prev,
            {
              id: `APP-${newWalkIn.Appointment_ID}`,
              Appointment_ID: newWalkIn.Appointment_ID,
              date: newWalkIn.Appointment_Date,
              time: newWalkIn.Start_Time?.slice(0, 5) || '09:00',
              doctorId: `STF-${newWalkIn.Doctor_ID}`,
              doctorName: newWalkIn.Doctor_Name,
              patientId: `PAT-${newWalkIn.Patient_ID}`,
              patientName: newWalkIn.Patient_Name,
              branch: newWalkIn.Branch_Name || currentBranch,
              status: newWalkIn.Status,
              reason: newWalkIn.Reason_For_Visit,
              isWalkIn: true
            }
          ]);
        }}
        doctors={allDoctors}
        patients={patientOptions}
        currentBranchId={currentBranchId}
      />
    </div>
  );
}
