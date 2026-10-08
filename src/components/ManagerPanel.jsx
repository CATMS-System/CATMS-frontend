import React, { useState, useMemo } from 'react';
import { Clock, Calendar, Users, DollarSign, Activity, AlertCircle, Plus, Phone, Mail, HelpCircle } from 'lucide-react';
import ReportsPanel from './ReportsPanel';

export default function ManagerPanel({ subView, db, handlers }) {
  const { staffList, patientList, appointmentList, liveQueue, invoiceList, branches } = db;
  const { setStaffList, setAppointmentList, triggerToast, addAuditLog } = handlers;

  // Find logged-in manager's assigned branch
  const managerBranch = useMemo(() => {
    return db.currentUser.branch || 'Colombo Main';
  }, [db.currentUser]);

  const managerBranchId = useMemo(() => {
    const b = db.branches?.find(br => br.name === managerBranch || br.Branch_Name === managerBranch);
    return b ? (b.Branch_ID || 1) : 1;
  }, [managerBranch, db.branches]);

  // Real-time doctor availability states
  const doctorsInBranch = useMemo(() => {
    return staffList.filter(s => s.Branch_ID === managerBranchId && (s.role.includes('Doc') || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner'));
  }, [staffList, managerBranchId]);

  const handleToggleDocStatus = (docId, newStatus) => {
    // update staff state or details
    const updated = staffList.map(s => {
      if (s.id === docId) {
        return { ...s, currentAvailability: newStatus };
      }
      return s;
    });
    setStaffList(updated);
    triggerToast(`Doctor availability set to ${newStatus}`);
  };

  // Roster states
  const [selectedRosterDoc, setSelectedRosterDoc] = useState(doctorsInBranch[0]?.id || '');
  const [weeklyShifts, setWeeklyShifts] = useState([
    { day: 'Monday', shift: '08:00 - 14:00', duration: '15 mins', capacity: 24 },
    { day: 'Tuesday', shift: '08:00 - 14:00', duration: '15 mins', capacity: 24 },
    { day: 'Wednesday', shift: '08:00 - 14:00', duration: '15 mins', capacity: 24 },
    { day: 'Thursday', shift: '08:00 - 14:00', duration: '15 mins', capacity: 24 },
    { day: 'Friday', shift: '08:00 - 14:00', duration: '15 mins', capacity: 24 },
    { day: 'Saturday', shift: '08:00 - 12:00', duration: '15 mins', capacity: 16 },
    { day: 'Sunday', shift: 'Off Duty', duration: 'N/A', capacity: 0 }
  ]);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterIndex, setSelectedRosterIndex] = useState(null);

  // Leave Blockers
  const [leaveRecords, setLeaveRecords] = useState([
    { doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', startDate: '2026-08-28', endDate: '2026-08-30', reason: 'Annual Medical Seminar' }
  ]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const handleAddLeave = (e) => {
    e.preventDefault();
    const docId = e.target.leaveDoc.value;
    const doc = staffList.find(s => s.id === docId);
    const newLeave = {
      doctorId: docId,
      doctorName: doc ? doc.name : 'Unknown Doctor',
      startDate: e.target.startDate.value,
      endDate: e.target.endDate.value,
      reason: e.target.reason.value
    };
    setLeaveRecords([...leaveRecords, newLeave]);
    addAuditLog(
      'UPDATE_ROSTER',
      `Flagged leave for ${newLeave.doctorName} from ${newLeave.startDate} to ${newLeave.endDate}`,
      'null',
      JSON.stringify(newLeave)
    );
    triggerToast(`Leave date flagged for ${newLeave.doctorName}`);
    setShowLeaveModal(false);
  };

  const handleEditRosterSlot = (e) => {
    e.preventDefault();
    const updated = [...weeklyShifts];
    updated[selectedRosterIndex] = {
      ...updated[selectedRosterIndex],
      shift: e.target.shiftHours.value,
      duration: e.target.slotDuration.value,
      capacity: parseInt(e.target.patientCapacity.value)
    };
    setWeeklyShifts(updated);
    triggerToast(`Roster updated for ${updated[selectedRosterIndex].day}`);
    setShowRosterModal(false);
  };

  // Read-only staff list local
  const localStaff = useMemo(() => {
    return staffList.filter(s => s.Branch_ID === managerBranchId);
  }, [staffList, managerBranchId]);

  const localMetrics = useMemo(() => {
    const todayAppts = appointmentList.filter(a => a.branch === managerBranch && a.date === '2026-08-23');
    const completed = todayAppts.filter(a => a.status === 'Completed').length;
    const walkins = todayAppts.filter(a => a.isWalkIn || a.status === 'Walk-In').length;
    
    // Revenue collected local
    const localInvoices = invoiceList.filter(i => {
      // Find if this invoice is Colombo, Kandy, Galle
      const appt = appointmentList.find(a => a.id === i.appointmentId || (a.patientId === i.patientId && a.date === i.date));
      return appt?.branch === managerBranch;
    });
    
    const collected = localInvoices.reduce((sum, inv) => {
      if (inv.status === 'Paid') return sum + inv.patientBalance + inv.insuranceCoverage;
      if (inv.status === 'Partially Paid') return sum + (inv.patientBalance * 0.5) + inv.insuranceCoverage;
      return sum;
    }, 0);

    const totalDoctors = doctorsInBranch.length;
    const activeStaff = localStaff.filter(s => s.status === 'Active').length;
    const roomCount = 12; // Static for demo

    return {
      appointmentsCount: todayAppts.length,
      completedCount: completed,
      walkinsCount: walkins,
      revenueCollected: collected,
      totalDoctors,
      activeStaff,
      roomCount
    };
  }, [appointmentList, invoiceList, managerBranch, doctorsInBranch, localStaff]);

  return (
    <div className="space-y-6">
      {/* 1. OPERATIONS DASHBOARD */}
      {subView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Branch Operations Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time indicators, clinician trackers, and queue statistics for {managerBranch}</p>
            </div>
            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
              Home Branch: {managerBranch}
            </span>
          </div>

          {/* Metric Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Appointments Today</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">{localMetrics.appointmentsCount}</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Completed Consults</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block font-mono">{localMetrics.completedCount}</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Emergency Walk-ins</span>
                <span className="text-2xl font-bold text-amber-600 mt-1 block font-mono">{localMetrics.walkinsCount}</span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Local Revenue ($)</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">${localMetrics.revenueCollected.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Branch Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Total Doctors</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">{localMetrics.totalDoctors}</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Active Staff</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">{localMetrics.activeStaff}</span>
              </div>
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Consultation Rooms</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">{localMetrics.roomCount}</span>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                <HelpCircle className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Doctor Status Trackers */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Clinician Status Monitor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {doctorsInBranch.map(doc => {
                const currentStatus = doc.currentAvailability || 'Available';
                return (
                  <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-950 text-sm">{doc.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">{doc.role}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        currentStatus === 'Available' ? 'bg-emerald-50 text-emerald-700' :
                        currentStatus === 'In Consultation' ? 'bg-blue-50 text-blue-700' :
                        currentStatus === 'On Break' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {currentStatus}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Set Status:</span>
                      <div className="flex space-x-1">
                        {['Available', 'In Consultation', 'On Break', 'On Leave'].map(statusOption => (
                          <button
                            key={statusOption}
                            onClick={() => handleToggleDocStatus(doc.id, statusOption)}
                            className={`px-1.5 py-1 border text-[10px] rounded font-medium cursor-pointer transition-all ${
                              currentStatus === statusOption ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            {statusOption.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. DOCTOR SCHEDULE & ROSTER MANAGEMENT */}
      {subView === 'roster' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Doctor Schedule & Roster Planner</h1>
              <p className="text-sm text-slate-500 mt-1">Allocate weekly calendar shifts, consultation slot durations, and daily capacities</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Flag Doctor Leave</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shift Planner */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-md">Weekly Shift Allocation Grid</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-450 font-semibold uppercase">Practitioner:</span>
                  <select
                    className="border border-slate-350 rounded-lg px-2 py-1 text-xs bg-white font-medium"
                    value={selectedRosterDoc}
                    onChange={e => setSelectedRosterDoc(e.target.value)}
                  >
                    {doctorsInBranch.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-2.5">Day</th>
                      <th className="px-4 py-2.5 text-center">Allocated Shift Hours</th>
                      <th className="px-4 py-2.5 text-center">Slot Duration</th>
                      <th className="px-4 py-2.5 text-center">Daily Patient Capacity</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {weeklyShifts.map((row, idx) => (
                      <tr key={row.day} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 text-sm font-sans">{row.day}</td>
                        <td className="px-4 py-3 text-center">{row.shift}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{row.duration}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{row.capacity} Patients</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedRosterIndex(idx);
                              setShowRosterModal(true);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 font-sans cursor-pointer"
                          >
                            Modify Slot
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave & Unavailability Marker */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Unavailability Blocker Logs</h3>
              <div className="space-y-3">
                {leaveRecords.map((lv, idx) => (
                  <div key={idx} className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 text-xs space-y-1.5 relative">
                    <span className="font-bold text-slate-900 block text-sm">{lv.doctorName}</span>
                    <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                      <span>{lv.startDate} to {lv.endDate}</span>
                      <span className="bg-red-50 text-red-700 border border-red-100 rounded px-1.5 py-0.5 uppercase font-bold">Leave Flagged</span>
                    </div>
                    <p className="text-slate-450 italic mt-1 font-sans">Reason: "{lv.reason}"</p>
                  </div>
                ))}
                {leaveRecords.length === 0 && (
                  <div className="text-center text-slate-400 py-10 text-xs">
                    No doctor leave dates scheduled. All hands on deck!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOCAL STAFF DIRECTORY */}
      {subView === 'staff' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Local Staff Directory ({managerBranch})</h1>
            <p className="text-sm text-slate-500 mt-1">Read-only view of branch personnel, schedules, and quick communication lines</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Assigned Role</th>
                  <th className="px-6 py-3">Contact Email</th>
                  <th className="px-6 py-3">Direct Phone</th>
                  <th className="px-6 py-3 text-right">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650">
                {localStaff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <span className="text-xs text-slate-400 font-mono">{s.id}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{s.role}</td>
                    <td className="px-6 py-4 font-mono text-xs flex items-center space-x-1.5 mt-1 border-none">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{s.details?.email || `${s.id.toLowerCase()}@careflow.com`}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="flex items-center space-x-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{s.details?.contact || '+94 77 123 4567'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {s.status === 'Active' ? 'On Duty' : 'On Leave'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BRANCH MANAGER REPORTS */}
      {subView === 'reports' && (
        <ReportsPanel db={db} handlers={handlers} />
      )}

      {/* =======================================
          MODALS & DRAWERS (INTERACTIVE POPUPS)
          ======================================= */}

      {/* ROSTER MODAL */}
      {showRosterModal && selectedRosterIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowRosterModal(false)} />
          <form onSubmit={handleEditRosterSlot} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">
              Modify Roster Parameters: {weeklyShifts[selectedRosterIndex].day}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shift Hours</label>
                <input
                  type="text"
                  required
                  name="shiftHours"
                  defaultValue={weeklyShifts[selectedRosterIndex].shift}
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="e.g. 08:00 - 14:00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Slot Duration</label>
                  <select
                    name="slotDuration"
                    defaultValue={weeklyShifts[selectedRosterIndex].duration}
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                  >
                    <option value="10 mins">10 mins</option>
                    <option value="15 mins">15 mins</option>
                    <option value="20 mins">20 mins</option>
                    <option value="30 mins">30 mins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Max Patient Capacity</label>
                  <input
                    type="number"
                    required
                    name="patientCapacity"
                    defaultValue={weeklyShifts[selectedRosterIndex].capacity}
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Save Roster Slot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LEAVE FLAG MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowLeaveModal(false)} />
          <form onSubmit={handleAddLeave} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Flag Clinician Leave / Unavailability</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Select Doctor</label>
                <select
                  name="leaveDoc"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                >
                  {doctorsInBranch.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    name="startDate"
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    name="endDate"
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for Unavailability</label>
                <input
                  type="text"
                  required
                  name="reason"
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Conference, Medical Leave, Personal..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Confirm Block Dates
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
