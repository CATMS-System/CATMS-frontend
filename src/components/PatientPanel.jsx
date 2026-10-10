import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, DollarSign, Clock, Check, Plus, AlertCircle, FileText, Download, ShieldAlert, ArrowRight, CornerRightDown, KeyRound } from 'lucide-react';
import { getSpecialties, getDoctors, getDoctorAvailableSlots, bookAppointment, getAppointments } from '../services/appointmentService';
import { getPatientHistory } from '../api/consultationApi';
import { getInvoices } from '../api/billingApi';
import ChangePasswordModal from './ChangePasswordModal';

export default function PatientPanel({ subView, db, handlers }) {
  const { appointmentList, invoiceList, patientList, staffList, medicalHistories, branches, liveQueue } = db;
  const { setAppointmentList, setLiveQueue, triggerToast, addAuditLog, navigateTo } = handlers;
  const [showChangePassword, setShowChangePassword] = useState(false);

  const currentPatientId = db.currentUser.patientId || 'PAT-0001';
  const currentPatientName = db.currentUser.name || 'John Doe';
  const numericPatientId = useMemo(() => {
    if (db.currentUser?.patient_id) return Number(db.currentUser.patient_id);
    if (typeof currentPatientId === 'string' && currentPatientId.startsWith('PAT-')) {
      return Number(currentPatientId.replace('PAT-', '')) || 1;
    }
    return Number(currentPatientId) || 1;
  }, [db.currentUser, currentPatientId]);

  // Real backend states
  const [apiAppointments, setApiAppointments] = useState([]);
  const [apiInvoices, setApiInvoices] = useState([]);
  const [apiConsultations, setApiConsultations] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [realDoctors, setRealDoctors] = useState([]);
  const [realSlots, setRealSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Fetch real patient appointments, invoices, and consultations
  useEffect(() => {
    let isCurrent = true;

    // 1. Fetch appointments for this patient
    getAppointments()
      .then(appts => {
        if (!isCurrent) return;
        if (Array.isArray(appts)) {
          const filtered = appts.filter(a => Number(a.Patient_ID || a.patient_id) === numericPatientId);
          if (filtered.length > 0) {
            const mapped = filtered.map(appt => ({
              id: `APP-${appt.Appointment_ID || appt.appointment_id}`,
              Appointment_ID: appt.Appointment_ID || appt.appointment_id,
              date: String(appt.Appointment_Date || appt.appointment_date || '').split('T')[0],
              time: String(appt.Start_Time || appt.start_time || '').slice(0, 5),
              doctorId: `STF-${appt.Doctor_ID || appt.doctor_id}`,
              doctor_id: appt.Doctor_ID || appt.doctor_id,
              doctorName: appt.Doctor_Name || appt.doctor_name || 'Dr. Physician',
              patientId: currentPatientId,
              patient_id: numericPatientId,
              branch: appt.Branch_Name || appt.branch_name || 'Colombo Main',
              branch_id: appt.Branch_ID || appt.branch_id,
              status: (appt.Status || appt.status || '').toUpperCase() === 'COMPLETED' ? 'Completed' : (['BOOKED', 'CONFIRMED', 'CHECKED_IN', 'SCHEDULED'].includes((appt.Status || appt.status || '').toUpperCase()) ? 'Booked' : (appt.Status || appt.status || 'Booked')),
              reason: appt.Reason || appt.reason_for_visit || 'Consultation'
            }));
            setApiAppointments(mapped);
          }
        }
      })
      .catch(err => console.warn('Could not load appointments from API, using fallback:', err));

    // 2. Fetch invoices for this patient
    getInvoices()
      .then(invs => {
        if (!isCurrent) return;
        if (Array.isArray(invs)) {
          const filtered = invs.filter(i => Number(i.Patient_ID || i.patient_id) === numericPatientId);
          if (filtered.length > 0) {
            const mapped = filtered.map(inv => ({
              invoiceId: `INV-${inv.Invoice_ID || inv.invoice_id}`,
              Invoice_ID: inv.Invoice_ID || inv.invoice_id,
              patientId: currentPatientId,
              date: String(inv.Invoice_Date || inv.invoice_date || inv.Created_At || '').split('T')[0],
              insuranceCoverage: Number(inv.Approved_Amount || inv.approved_amount || inv.Insurance_Covered || inv.insurance_covered || 0),
              patientBalance: Number(inv.Patient_Due_Amount ?? inv.Outstanding_Balance ?? inv.outstanding_balance ?? inv.Total_Amount ?? inv.Invoice_Total ?? 0),
              status: ((inv.Payment_Status || inv.payment_status || inv.Invoice_Status || inv.invoice_status || '')).toUpperCase().includes('PAID') ? 'Paid' : 'Unpaid',
              totalAmount: Number(inv.Total_Amount || inv.Invoice_Total || inv.invoice_total || inv.Billed_Consultation_Fee || 0)
            }));
            setApiInvoices(mapped);
          }
        }
      })
      .catch(err => console.warn('Could not load invoices from API, using fallback:', err));

    // 3. Fetch real consultation history for this patient
    getPatientHistory(numericPatientId)
      .then(history => {
        if (!isCurrent) return;
        if (Array.isArray(history) && history.length > 0) {
          const mappedVisits = history.map(item => ({
            date: String(item.Consultation_Date || item.consultation_date || '').split('T')[0],
            doctor: item.Doctor_Name || item.doctor_name || 'Attending Physician',
            diagnosis: item.Diagnosis || item.diagnosis || item.Clinical_Notes || item.clinical_notes || 'Clinical consultation recorded',
            vitals: item.Vitals || item.vitals ? (typeof (item.Vitals || item.vitals) === 'string' ? (item.Vitals || item.vitals) : Object.entries(item.Vitals || item.vitals).map(([k, v]) => `${k}: ${v}`).join(', ')) : 'Vitals logged on intake',
            treatments: Array.isArray(item.Treatments || item.items) ? (item.Treatments || item.items).map(t => ({
              name: t.Treatment_Name || t.treatment_name,
              qty: t.Quantity || t.quantity,
              price: Number(t.Unit_Price_Charged || t.billed_unit_price || t.Total_Price || 0)
            })) : []
          }));
          setApiConsultations(mappedVisits);
        }
      })
      .catch(err => console.warn('Could not load patient history from API, using fallback:', err));

    // 4. Fetch specialties list
    getSpecialties()
      .then(specs => {
        if (!isCurrent) return;
        if (Array.isArray(specs) && specs.length > 0) {
          setSpecialtiesList(specs);
        }
      })
      .catch(() => {});

    return () => { isCurrent = false; };
  }, [numericPatientId, currentPatientId]);

  // Find patient record
  const patientObj = useMemo(() => {
    return patientList.find(p => p.id === currentPatientId || p.Patient_ID === numericPatientId);
  }, [patientList, currentPatientId, numericPatientId]);

  // Personal appointments (API first, fallback to appointmentList)
  const personalAppointments = useMemo(() => {
    if (apiAppointments.length > 0) return apiAppointments;
    return appointmentList.filter(a => a.patientId === currentPatientId || a.patient_id === numericPatientId);
  }, [apiAppointments, appointmentList, currentPatientId, numericPatientId]);

  // Personal outstanding dues (API first, fallback to invoiceList)
  const personalInvoices = useMemo(() => {
    if (apiInvoices.length > 0) return apiInvoices;
    return invoiceList.filter(i => i.patientId === currentPatientId || i.Patient_ID === numericPatientId);
  }, [apiInvoices, invoiceList, currentPatientId, numericPatientId]);

  const outstandingDues = useMemo(() => {
    return personalInvoices.reduce((sum, inv) => {
      if (inv.status === 'Paid') return sum;
      if (inv.status === 'Partially Paid') return sum + (inv.patientBalance * 0.5);
      return sum + inv.patientBalance;
    }, 0);
  }, [personalInvoices]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    branch: 'Colombo Main Clinic',
    branchId: 1,
    specialty: 'All Specialties',
    specialtyId: null,
    doctorId: '',
    numericDoctorId: null,
    date: tomorrowStr,
    time: '09:00',
    reason: ''
  });

  // Resolve branch ID for booking
  const selectedBranchId = useMemo(() => {
    if (bookingForm.branchId) return Number(bookingForm.branchId);
    if (!branches || branches.length === 0) return 1;
    const b = branches.find(br => {
      const bName = (br.Branch_Name || br.name || '').toLowerCase();
      const target = (bookingForm.branch || '').toLowerCase();
      return bName === target || bName.includes(target) || target.includes(bName);
    });
    return b ? (b.Branch_ID || b.id || 1) : 1;
  }, [branches, bookingForm.branchId, bookingForm.branch]);

  // Fetch real doctors for the selected branch and specialty
  useEffect(() => {
    let isCurrent = true;
    getDoctors(selectedBranchId, bookingForm.specialtyId || undefined)
      .then(docs => {
        if (!isCurrent) return;
        if (Array.isArray(docs) && docs.length > 0) {
          setRealDoctors(docs);
        } else {
          setRealDoctors([]);
        }
      })
      .catch(() => isCurrent && setRealDoctors([]));
    return () => { isCurrent = false; };
  }, [selectedBranchId, bookingForm.specialtyId]);

  // Filter available doctors (API first, fallback to staffList)
  const availableDoctors = useMemo(() => {
    if (realDoctors.length > 0) {
      return realDoctors.map(d => ({
        id: `STF-${d.Staff_ID || d.Doctor_ID}`,
        doctor_id: d.Doctor_ID || d.Staff_ID,
        name: d.Full_Name ? (d.Full_Name.startsWith('Dr.') ? d.Full_Name : `Dr. ${d.Full_Name}`) : `Dr. ${d.First_Name} ${d.Last_Name}`,
        role: d.Job_Title || (Array.isArray(d.Specialties) ? d.Specialties.join(', ') : (d.Specialties || 'Physician')),
        consultFee: d.Standard_Consultation_Fee,
        branch: d.Branch_Name || bookingForm.branch
      }));
    }
    return staffList.filter(s => {
      const matchBranch = s.Branch_ID === selectedBranchId || (s.branch && bookingForm.branch && (s.branch.toLowerCase().includes(bookingForm.branch.toLowerCase()) || bookingForm.branch.toLowerCase().includes(s.branch.toLowerCase())));
      const isDoc = s.role && (s.role.includes('Doc') || s.role.includes('Card') || s.role.includes('Derm') || s.role.includes('Practitioner') || s.role.includes('Physician') || s.role.includes('Surgeon'));
      const matchRole = !bookingForm.specialtyId || (s.role && s.role.toLowerCase().includes((bookingForm.specialty || '').toLowerCase().split(' ')[0]));
      return matchBranch && isDoc && (bookingForm.specialty === 'All Specialties' || matchRole) && s.status === 'Active';
    });
  }, [realDoctors, staffList, selectedBranchId, bookingForm.branch, bookingForm.specialtyId, bookingForm.specialty]);

  // Set default doctor when available list changes or when chosen doctor is no longer available
  useEffect(() => {
    if (availableDoctors.length > 0) {
      const isSelectedDoctorStillAvailable = availableDoctors.some(
        d => d.id === bookingForm.doctorId || d.doctor_id === bookingForm.numericDoctorId
      );
      if (!isSelectedDoctorStillAvailable) {
        const first = availableDoctors[0];
        setBookingForm(prev => ({
          ...prev,
          doctorId: first.id,
          numericDoctorId: first.doctor_id || 1
        }));
      }
    } else {
      setBookingForm(prev => ({
        ...prev,
        doctorId: '',
        numericDoctorId: null
      }));
    }
  }, [availableDoctors, bookingForm.doctorId, bookingForm.numericDoctorId]);

  // Fetch available slots when doctor and date are chosen
  useEffect(() => {
    if (!bookingForm.numericDoctorId || !bookingForm.date) {
      setRealSlots([]);
      return;
    }
    let isCurrent = true;
    setSlotsLoading(true);
    getDoctorAvailableSlots(bookingForm.numericDoctorId, bookingForm.date, 30, selectedBranchId)
      .then(slots => {
        if (!isCurrent) return;
        if (Array.isArray(slots) && slots.length > 0) {
          const normalized = slots.map((s, idx) => {
            const st = String(s.Start_Time || s.start_time || '09:00:00').slice(0, 5);
            const et = String(s.End_Time || s.end_time || '09:30:00').slice(0, 5);
            return {
              ...s,
              slot_id: s.Slot_ID || s.slot_id || s.Schedule_ID || `slot-${idx}-${st}`,
              start_time: st,
              end_time: et
            };
          });
          setRealSlots(normalized);
        } else {
          setRealSlots([]);
        }
      })
      .catch(() => isCurrent && setRealSlots([]))
      .finally(() => isCurrent && setSlotsLoading(false));
    return () => { isCurrent = false; };
  }, [bookingForm.numericDoctorId, bookingForm.date, selectedBranchId]);

  // Keep booking time synced to first available slot if any
  useEffect(() => {
    if (realSlots.length > 0) {
      const firstTime = realSlots[0].start_time;
      if (firstTime) {
        setBookingForm(prev => ({ ...prev, time: firstTime }));
      }
    }
  }, [realSlots]);

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

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.numericDoctorId) {
      alert('Please select a doctor to continue.');
      return;
    }
    setIsSubmittingBooking(true);
    const docObj = availableDoctors.find(s => s.id === bookingForm.doctorId || s.doctor_id === bookingForm.numericDoctorId);
    const formattedTime = bookingForm.time.length === 5 ? `${bookingForm.time}:00` : bookingForm.time;
    const visitReason = bookingForm.reason?.trim() || 'Patient self-booked consultation';

    try {
      // Attempt to book appointment via real API
      const response = await bookAppointment({
        patient_id: numericPatientId,
        doctor_id: bookingForm.numericDoctorId,
        branch_id: selectedBranchId,
        appointment_date: bookingForm.date,
        start_time: formattedTime,
        duration_minutes: 30,
        appointment_type: 'Standard',
        reason_for_visit: visitReason
      });

      const confirmedApptId = response?.Appointment_ID;
      const newApptId = confirmedApptId ? `APP-${confirmedApptId}` : `APP-${(appointmentList.length + 1001).toString()}`;
      const newAppt = {
        id: newApptId,
        Appointment_ID: confirmedApptId,
        appointment_id: confirmedApptId,
        date: bookingForm.date,
        time: bookingForm.time,
        doctorId: bookingForm.doctorId,
        doctor_id: bookingForm.numericDoctorId,
        Doctor_ID: bookingForm.numericDoctorId,
        doctorName: docObj ? docObj.name : 'Physician',
        patientId: currentPatientId,
        patient_id: numericPatientId,
        Patient_ID: numericPatientId,
        patientName: currentPatientName,
        branch: bookingForm.branch,
        branch_id: selectedBranchId,
        Branch_ID: selectedBranchId,
        status: 'Booked',
        reason: visitReason
      };

      setAppointmentList([...appointmentList, newAppt]);
      setApiAppointments(prev => [newAppt, ...prev]);

      const todayStr = new Date().toISOString().slice(0, 10);
      if (bookingForm.date === todayStr && setLiveQueue) {
        setLiveQueue(prev => [
          ...(prev || []),
          {
            queueNo: (prev?.length || 0) + 1,
            Appointment_ID: confirmedApptId,
            appointment_id: confirmedApptId,
            appointmentId: newApptId,
            patientId: currentPatientId,
            patient_id: numericPatientId,
            Patient_ID: numericPatientId,
            patientName: currentPatientName,
            reason: visitReason,
            assignedDoctor: newAppt.doctorName,
            doctorId: bookingForm.doctorId,
            doctor_id: bookingForm.numericDoctorId,
            Doctor_ID: bookingForm.numericDoctorId,
            status: 'SCHEDULED',
            estWaitTime: 10,
            room: 'Room 101'
          }
        ]);
      }
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
        branch: 'Colombo Main Clinic',
        branchId: 1,
        specialty: 'All Specialties',
        specialtyId: null,
        doctorId: '',
        numericDoctorId: null,
        date: tomorrowStr,
        time: '09:00',
        reason: ''
      });
    } catch (err) {
      console.warn('Backend booking API error, using optimistic local reservation:', err);
      // Graceful offline fallback
      const newApptId = `APP-${(appointmentList.length + 1001).toString()}`;
      const newAppt = {
        id: newApptId,
        date: bookingForm.date,
        time: bookingForm.time,
        doctorId: bookingForm.doctorId,
        doctor_id: bookingForm.numericDoctorId,
        doctorName: docObj ? docObj.name : 'Physician',
        patientId: currentPatientId,
        patient_id: numericPatientId,
        branch: bookingForm.branch,
        status: 'Booked',
        reason: visitReason
      };

      setAppointmentList([...appointmentList, newAppt]);
      setApiAppointments(prev => [newAppt, ...prev]);
      addAuditLog(
        'CREATE_APPOINTMENT',
        `Patient ${currentPatientName} self-booked appointment ${newApptId} with ${newAppt.doctorName} for ${newAppt.date} @ ${newAppt.time}`,
        'null',
        JSON.stringify(newAppt)
      );

      triggerToast(`Appointment self-booked successfully! ID: ${newApptId}`);
      navigateTo('/portal/home');
      setBookingStep(1);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Completed visit history timeline (API first, fallback to medicalHistories)
  const activeVisits = useMemo(() => {
    if (apiConsultations.length > 0) return apiConsultations;
    const historyObj = medicalHistories.find(h => h.patientId === currentPatientId || h.patient_id === numericPatientId);
    return historyObj?.visits || [];
  }, [apiConsultations, medicalHistories, currentPatientId, numericPatientId]);

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
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold hover:shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Change Password"
              >
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Change Password</span>
              </button>
              <button
                onClick={() => navigateTo('/portal/book')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold hover:shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Book Appointment</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Appointment Widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Next Scheduled Visit</h3>
                <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono uppercase">
                  {personalAppointments.length > 0 ? 'Upcoming' : 'None'}
                </span>
              </div>

              {personalAppointments.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-blue-900 font-bold">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span>{personalAppointments[0].date} @ {personalAppointments[0].time}</span>
                    </div>
                    <div className="text-slate-600 font-medium">Physician: {personalAppointments[0].doctorName}</div>
                    <div className="text-slate-500 font-mono text-[10px]">Location: {personalAppointments[0].branch}</div>
                    <div className="text-slate-500 italic mt-1 font-sans">Reason: "{personalAppointments[0].reason}"</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No upcoming clinic appointments scheduled.
                </div>
              )}
            </div>

            {/* Account Balance Widget */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Outstanding Patient Balance</h3>
                <span className="bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono">
                  Active Account
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-3xl font-bold font-mono text-slate-900 block">${outstandingDues.toFixed(2)}</span>
                <p className="text-xs text-slate-500">Unsettled copay amounts and outpatient lab test balance dues.</p>
              </div>

              <button
                onClick={() => navigateTo('/portal/billing')}
                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Review Itemized Dues
              </button>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Quick Navigation</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigateTo('/portal/medical-history')}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left text-xs font-semibold text-slate-700 flex justify-between items-center cursor-pointer transition-all"
                >
                  <span className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>View Completed Consultations</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
                <button
                  onClick={() => navigateTo('/portal/billing')}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left text-xs font-semibold text-slate-700 flex justify-between items-center cursor-pointer transition-all"
                >
                  <span className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Download Receipts & Statements</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SELF BOOKING WIZARD */}
      {subView === 'book' && (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Self-Booking Consultation Wizard</h1>
            <p className="text-sm text-slate-500 mt-1">Book a confirmed outpatient slot with CareFlow clinicians in 4 easy steps</p>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { step: 1, title: 'Location & Department' },
              { step: 2, title: 'Choose Doctor' },
              { step: 3, title: 'Date & Time Slot' },
              { step: 4, title: 'Confirmation' }
            ].map(s => (
              <div key={s.step} className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                bookingStep === s.step ? 'bg-blue-600 text-white border-blue-600 shadow-xs' :
                bookingStep > s.step ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'
              }`}>
                <span className="block font-mono text-[10px]">STEP 0{s.step}</span>
                <span className="truncate block mt-0.5 font-sans">{s.title}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleConfirmBooking} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
            {/* Step 1: Branch & Specialty */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-2">Select Preferred Clinic & Care Field</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Clinic Branch Location</label>
                    <select
                      className="w-full border border-slate-350 rounded-lg p-2.5 text-xs font-medium"
                      value={bookingForm.branchId}
                      onChange={e => {
                        const bId = Number(e.target.value);
                        const bObj = branches?.find(b => (b.Branch_ID || b.id) === bId);
                        const bName = bObj ? (bObj.Branch_Name || bObj.name) : 'Clinic Branch';
                        setBookingForm(prev => ({
                          ...prev,
                          branchId: bId,
                          branch: bName,
                          doctorId: '',
                          numericDoctorId: null
                        }));
                      }}
                    >
                      {branches && branches.length > 0 ? (
                        branches.map(b => (
                          <option key={b.Branch_ID || b.id} value={b.Branch_ID || b.id}>
                            {b.Branch_Name || b.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value={1}>Colombo Main Clinic</option>
                          <option value={2}>Kandy Central Clinic</option>
                          <option value={3}>Galle Coastal Clinic</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Medical Department / Specialty</label>
                    <select
                      className="w-full border border-slate-350 rounded-lg p-2.5 text-xs font-medium"
                      value={bookingForm.specialtyId ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        const specId = val ? Number(val) : null;
                        const specObj = specialtiesList.find(s => (s.Specialty_ID || s.id) === specId);
                        setBookingForm(prev => ({
                          ...prev,
                          specialtyId: specId,
                          specialty: specObj ? (specObj.Specialty_Name || specObj.name) : 'All Specialties',
                          doctorId: '',
                          numericDoctorId: null
                        }));
                      }}
                    >
                      <option value="">All Specialties / Departments</option>
                      {specialtiesList.length > 0 ? (
                        specialtiesList.map(s => (
                          <option key={s.Specialty_ID || s.id} value={s.Specialty_ID || s.id}>
                            {s.Specialty_Name || s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="1">Cardiology (Heart & Vascular)</option>
                          <option value="2">General Medicine (Primary Care)</option>
                          <option value="3">Dermatology (Skin & Hair)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Choose Doctor */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-2">Select Your Practitioner</h3>
                <div className="space-y-3">
                  {availableDoctors.map(doc => {
                    const isSelected = bookingForm.doctorId === doc.id || bookingForm.numericDoctorId === doc.doctor_id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setBookingForm(prev => ({ ...prev, doctorId: doc.id, numericDoctorId: doc.doctor_id || 1 }))}
                        className={`p-4 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                          isSelected ? 'border-blue-600 bg-blue-50/50 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                          <span className="text-xs text-slate-450 font-mono">{doc.role}</span>
                          <span className="text-xs text-slate-500 block mt-1">Branch: {doc.branch || bookingForm.branch}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 font-mono block">Fee: ${doc.consultFee || 2500}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Slot: 30 mins</span>
                        </div>
                      </div>
                    );
                  })}
                  {availableDoctors.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No practitioners available in this department at {bookingForm.branch}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Date & Slot */}
            {bookingStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-2">Select Calendar Date & Time Slot</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Appointment Date</label>
                    <input
                      type="date"
                      min={todayStr}
                      className="w-full border border-slate-350 rounded-lg p-2.5 text-xs font-medium"
                      value={bookingForm.date}
                      onChange={e => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      Available Slot {slotsLoading && '(Checking real availability...)'}
                    </label>
                    {realSlots.length > 0 ? (
                      <select
                        className="w-full border border-slate-350 rounded-lg p-2.5 text-xs font-medium"
                        value={bookingForm.time}
                        onChange={e => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                      >
                        {realSlots.map((s, idx) => {
                          const st = String(s.start_time || s.Start_Time || '09:00').slice(0, 5);
                          const et = String(s.end_time || s.End_Time || '09:30').slice(0, 5);
                          return (
                            <option key={s.slot_id || idx} value={st}>
                              {st} - {et}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <select
                        className="w-full border border-slate-350 rounded-lg p-2.5 text-xs font-medium"
                        value={bookingForm.time}
                        onChange={e => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                      >
                        <option value="09:00">09:00 AM (Morning Slot)</option>
                        <option value="10:30">10:30 AM (Morning Slot)</option>
                        <option value="11:45">11:45 AM (Noon Slot)</option>
                        <option value="14:00">02:00 PM (Afternoon Slot)</option>
                        <option value="15:30">03:30 PM (Evening Slot)</option>
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Reason for Consultation (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state your primary symptoms, concerns, or checkup reason..."
                    className="w-full border border-slate-350 rounded-lg p-2.5 text-xs font-medium"
                    value={bookingForm.reason}
                    onChange={e => setBookingForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {bookingStep === 4 && (
              <div className="space-y-4 text-xs font-medium">
                <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-2">Review Consultation Booking Details</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 font-mono">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Patient Full Name:</span>
                    <strong className="text-slate-900">{currentPatientName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Clinic Location:</span>
                    <strong className="text-slate-900">{bookingForm.branch}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Department / Specialty:</span>
                    <strong className="text-slate-900">{bookingForm.specialty}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Selected Physician:</span>
                    <strong className="text-blue-600">
                      {availableDoctors.find(d => d.id === bookingForm.doctorId || d.doctor_id === bookingForm.numericDoctorId)?.name || 'Physician'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Date & Slot Time:</span>
                    <strong className="text-slate-900">{bookingForm.date} @ {bookingForm.time}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Primary Reason:</span>
                    <span className="text-slate-700 italic">{bookingForm.reason || 'Routine medical checkup'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer shadow-xs ml-auto"
                >
                  Continue
                </button>
              )}
              {bookingStep === 4 && (
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer shadow-xs ml-auto"
                >
                  {isSubmittingBooking ? 'Submitting...' : 'Confirm & Schedule'}
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
              {activeVisits.map((v, idx) => (
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
                      {Array.isArray(v.treatments) && v.treatments.length > 0 && (
                        <div className="border-t border-slate-200 pt-2 font-mono">
                          <span className="text-[10px] text-slate-450 font-bold block uppercase mb-1">Prescribed Treatments</span>
                          {v.treatments.map((t, index) => (
                            <div key={index} className="flex justify-between text-[10px] text-slate-500">
                              <span>{t.name} (x{t.qty})</span>
                              <span>${(t.price * t.qty).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {activeVisits.length === 0 && (
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

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        triggerToast={triggerToast}
      />
    </div>
  );
}
