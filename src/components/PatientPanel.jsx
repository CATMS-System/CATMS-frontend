import React, { useState, useMemo } from 'react';
import { Calendar, DollarSign, Clock, Check, Plus, AlertCircle, FileText, Download, ShieldAlert, ArrowRight, CornerRightDown } from 'lucide-react';

export default function PatientPanel({ subView, db, handlers }) {
  const { appointmentList, invoiceList, patientList, staffList, medicalHistories } = db;
  const { setAppointmentList, triggerToast, addAuditLog, navigateTo } = handlers;

  const currentPatientId = db.currentUser.patientId || 'PAT-0001';
  const currentPatientName = db.currentUser.name || 'John Doe';

  // Find patient record
  const patientObj = useMemo(() => {
    return patientList.find(p => p.id === currentPatientId);
  }, [patientList, currentPatientId]);

  // Personal appointments
  const personalAppointments = useMemo(() => {
    return appointmentList.filter(a => a.patientId === currentPatientId);
  }, [appointmentList, currentPatientId]);

  // Personal outstanding dues
  const personalInvoices = useMemo(() => {
    return invoiceList.filter(i => i.patientId === currentPatientId);
  }, [invoiceList, currentPatientId]);

  const outstandingDues = useMemo(() => {
    return personalInvoices.reduce((sum, inv) => {
      if (inv.status === 'Paid') return sum;
      if (inv.status === 'Partially Paid') return sum + (inv.patientBalance * 0.5);
      return sum + inv.patientBalance;
    }, 0);
  }, [personalInvoices]);

  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    branch: 'Colombo Main',
    specialty: 'General Practice',
    doctorId: '',
    date: '2026-08-24', // default tomorrow
    time: '09:00',
    reason: ''
  });

  // Filter doctors by selected branch & specialty
  const availableDoctors = useMemo(() => {
    return staffList.filter(s => {
      const matchBranch = s.branch === bookingForm.branch;
      const matchRole = s.role.toLowerCase().includes(bookingForm.specialty.toLowerCase().split(' ')[0]) || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner';
      return matchBranch && matchRole && s.status === 'Active';
    });
  }, [staffList, bookingForm.branch, bookingForm.specialty]);

  // Set default doctor when available list changes
  React.useEffect(() => {
    if (availableDoctors.length > 0 && !bookingForm.doctorId) {
      setBookingForm(prev => ({ ...prev, doctorId: availableDoctors[0].id }));
    }
  }, [availableDoctors, bookingForm.doctorId]);

  const handleNextStep = () => {
    if (bookingStep === 1) {
      setBookingStep(2);
    } else if (bookingStep === 2) {
      if (!bookingForm.doctorId) {
        alert('Please select a doctor to continue.');
        return;
      }
      setBookingStep(3);
    } else if (bookingStep === 3) {
      if (!bookingForm.date || !bookingForm.time) {
        alert('Please choose date and time slot.');
        return;
      }
      setBookingStep(4);
    }
  };

  const handleConfirmBooking = (e) => {
    e.preventDefault();
    const docObj = staffList.find(s => s.id === bookingForm.doctorId);

    const newApptId = `APP-${(appointmentList.length + 1001).toString()}`;
    const newAppt = {
      id: newApptId,
      date: bookingForm.date,
      time: bookingForm.time,
      doctorId: bookingForm.doctorId,
      doctorName: docObj ? docObj.name : 'Physician',
      patientId: currentPatientId,
      patientName: currentPatientName,
      branch: bookingForm.branch,
      status: 'Booked',
      reason: bookingForm.reason || 'Patient self-booked consultation'
    };

    setAppointmentList([...appointmentList, newAppt]);
    addAuditLog(
      'CREATE_APPOINTMENT',
      `Patient ${currentPatientName} self-booked appointment ${newApptId} with ${newAppt.doctorName} for ${newAppt.date} @ ${newAppt.time}`,
      'null',
      JSON.stringify(newAppt)
    );

    triggerToast(`Appointment self-booked successfully! ID: ${newApptId}`);
    navigateTo('/portal/home');
    setBookingStep(1);
    setBookingForm({
      branch: 'Colombo Main',
      specialty: 'General Practice',
      doctorId: '',
      date: '2026-08-24',
      time: '09:00',
      reason: ''
    });
  };

  // Completed visit history timeline
  const personalHistory = useMemo(() => {
    return medicalHistories.find(h => h.patientId === currentPatientId);
  }, [medicalHistories, currentPatientId]);

  return (
    <div className="space-y-6">
      {/* 1. PATIENT HOME PORTAL */}
      {subView === 'home' && (
        <div className="space-y-6 animate-fade-in">
          {/* Welcome Banner */}
          <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
            <div>
              <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold font-mono">Welcome Back</span>
              <h1 className="text-2xl font-bold mt-0.5">Welcome, {currentPatientName}!</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70 font-mono mt-1">
                <span>Member ID: {currentPatientId}</span>
                <span>|</span>
                <span>Primary Branch: {patientObj?.branch || 'Colombo Main'}</span>
                <span>|</span>
                <span>Insurance: {patientObj?.insurance?.provider || 'Cash / Self'}</span>
              </div>
            </div>
            <button
              onClick={() => navigateTo('/portal/book')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Appointments Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Upcoming Scheduled Consultations</span>
                <span className="text-xs text-slate-400">Roster summary</span>
              </h3>

              <div className="space-y-3">
                {personalAppointments.filter(a => a.status === 'Booked').map(appt => (
                  <div key={appt.id} className="flex justify-between items-center border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-slate-300 transition-colors">
                    <div>
                      <span className="text-xs text-slate-400 font-mono block">{appt.date} @ {appt.time}</span>
                      <span className="font-bold text-slate-900 text-sm block mt-1">{appt.doctorName}</span>
                      <span className="text-xs text-slate-400 block">{appt.branch}</span>
                    </div>
                    <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold font-mono">
                      Scheduled
                    </span>
                  </div>
                ))}
                {personalAppointments.filter(a => a.status === 'Booked').length === 0 && (
                  <div className="text-center text-slate-400 py-10 text-xs">
                    No upcoming scheduled consultations found. Use the Book Wizard to schedule one.
                  </div>
                )}
              </div>
            </div>

            {/* Outstanding Dues Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs h-fit">
              <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Outstanding Invoice Balance</h3>

              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-red-700 block">Total Balance Due</span>
                    <strong className="text-2xl font-bold text-red-600 block mt-1 font-mono">${outstandingDues.toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <button
                  onClick={() => navigateTo('/portal/billing')}
                  className="w-full text-center py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  Inspect Bills Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SELF-SERVICE APPOINTMENT BOOKING WIZARD */}
      {subView === 'book' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs animate-fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h1 className="text-xl font-bold text-slate-900">Self-Service Appointment Wizard</h1>
            <p className="text-xs text-slate-450 mt-0.5">Complete steps to schedule a clinical consultation slot</p>
          </div>

          {/* Progress steps bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className={`flex items-center space-x-1.5 ${bookingStep >= 1 ? 'text-blue-600 font-bold' : ''}`}>
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">1</span>
              <span>Branch</span>
            </div>
            <div className="h-px bg-slate-200 flex-1 mx-2" />
            <div className={`flex items-center space-x-1.5 ${bookingStep >= 2 ? 'text-blue-600 font-bold' : ''}`}>
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">2</span>
              <span>Physician</span>
            </div>
            <div className="h-px bg-slate-200 flex-1 mx-2" />
            <div className={`flex items-center space-x-1.5 ${bookingStep >= 3 ? 'text-blue-600 font-bold' : ''}`}>
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">3</span>
              <span>Schedule Slot</span>
            </div>
            <div className="h-px bg-slate-200 flex-1 mx-2" />
            <div className={`flex items-center space-x-1.5 ${bookingStep >= 4 ? 'text-blue-600 font-bold' : ''}`}>
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">4</span>
              <span>Confirm</span>
            </div>
          </div>

          <form onSubmit={handleConfirmBooking} className="space-y-4 pt-2">
            {bookingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Select Clinic Branch</label>
                  <select
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                    value={bookingForm.branch}
                    onChange={e => setBookingForm({ ...bookingForm, branch: e.target.value, doctorId: '' })}
                  >
                    <option value="Colombo Main">Colombo Main</option>
                    <option value="Kandy">Kandy</option>
                    <option value="Galle">Galle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Medical Specialty</label>
                  <select
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                    value={bookingForm.specialty}
                    onChange={e => setBookingForm({ ...bookingForm, specialty: e.target.value, doctorId: '' })}
                  >
                    <option value="General Practice">General Practice</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                  </select>
                </div>
              </div>
            )}

            {bookingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Choose Doctor</label>
                  <select
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                    value={bookingForm.doctorId}
                    onChange={e => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                  >
                    {availableDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                    ))}
                    {availableDoctors.length === 0 && (
                      <option value="">No doctors active in this branch/specialty today</option>
                    )}
                  </select>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 font-sans">Target Date</label>
                    <input
                      type="date"
                      required
                      name="newDate"
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                      value={bookingForm.date}
                      onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-sans">Select Time Slot</label>
                    <select
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm font-sans"
                      value={bookingForm.time}
                      onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })}
                    >
                      <option value="08:00">08:00 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">13:00 PM</option>
                      <option value="14:00">14:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {bookingStep === 4 && (
              <div className="space-y-4 text-xs text-slate-650">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Booking Receipt Review</span>
                  <div className="grid grid-cols-2 gap-4 font-mono">
                    <div>Branch: <strong className="text-slate-900">{bookingForm.branch}</strong></div>
                    <div>Doctor: <strong className="text-slate-900">{staffList.find(s => s.id === bookingForm.doctorId)?.name}</strong></div>
                    <div>Date: <strong className="text-slate-900">{bookingForm.date}</strong></div>
                    <div>Time Slot: <strong className="text-slate-900">{bookingForm.time}</strong></div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for consultation visit</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                    placeholder="Briefly explain visit reason (e.g. skin rash, blood pressure check)..."
                    value={bookingForm.reason}
                    onChange={e => setBookingForm({ ...bookingForm, reason: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Steps buttons */}
            <div className="pt-6 border-t border-slate-100 flex justify-end space-x-3">
              {bookingStep > 1 && (
                <button
                  type="button"
                  onClick={() => setBookingStep(prev => prev - 1)}
                  className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
                >
                  Back
                </button>
              )}
              {bookingStep < 4 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer shadow-xs"
                >
                  Continue
                </button>
              )}
              {bookingStep === 4 && (
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer shadow-xs"
                >
                  Confirm & Schedule
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 3. PERSONAL MEDICAL HISTORY & VISIT RECORDS */}
      {subView === 'medical-history' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Consultation History Log</h1>
            <p className="text-sm text-slate-500 mt-1">Read-only timeline of completed consultations, vitals charts, and diagnoses</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Historical Visit Timeline</h3>

            <div className="relative border-l border-slate-200 ml-2.5 pl-6 space-y-6">
              {personalHistory?.visits.map((v, idx) => (
                <div key={idx} className="relative">
                  {/* Bullet Dot */}
                  <div className="absolute -left-9.5 top-1 h-6 w-6 bg-blue-50 border border-blue-500 rounded-full flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-blue-600 font-bold" />
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-xs text-slate-450 font-mono">
                      <span>{v.date}</span>
                      <span className="font-semibold text-slate-650">Physician: {v.doctor}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Recorded Vitals</span>
                        <strong className="text-slate-700 font-mono">{v.vitals}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Clinical Diagnosis Notes</span>
                        <p className="text-slate-600 font-medium leading-relaxed">{v.diagnosis}</p>
                      </div>
                      <div className="border-t border-slate-200 pt-2 font-mono">
                        <span className="text-[10px] text-slate-450 font-bold block uppercase mb-1">Prescribed Treatments</span>
                        {v.treatments.map((t, index) => (
                          <div key={index} className="flex justify-between text-[10px] text-slate-500">
                            <span>{t.name} (x{t.qty})</span>
                            <span>${(t.price * t.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!personalHistory || personalHistory.visits.length === 0) && (
                <div className="text-center text-slate-400 py-10 text-xs font-sans">
                  No medical consult records logged in your profile across branches.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. BILLING & RECEIPTS PORTAL */}
      {subView === 'billing' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Invoices & Receipts Ledger</h1>
            <p className="text-sm text-slate-500 mt-1">Review itemized billing records, copay insurance shares, and download receipt statements</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Invoice Code</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3 text-right">Insurance Paid ($)</th>
                  <th className="px-6 py-3 text-right">My Balance ($)</th>
                  <th className="px-6 py-3 text-center">Settlement Status</th>
                  <th className="px-6 py-3 text-right">Statements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-mono text-xs">
                {personalInvoices.map(inv => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-700">{inv.invoiceId}</td>
                    <td className="px-6 py-4">{inv.date}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-bold">${inv.insuranceCoverage.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-blue-650 font-bold">${inv.patientBalance.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase font-sans ${
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        inv.status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <button
                        onClick={() => triggerToast(`Compiled PDF print statement for invoice ${inv.invoiceId}`)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Print PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {personalInvoices.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-450 font-sans">
                      No invoices or receipt statements recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
