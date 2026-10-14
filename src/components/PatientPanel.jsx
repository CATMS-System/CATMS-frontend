import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, Clock, Check, Plus, AlertCircle, FileText, Download, ShieldAlert, ArrowRight, CornerRightDown, KeyRound, Sparkles, Stethoscope, MapPin, ShieldCheck, Star, HeartPulse, Activity, CheckCircle2, Building2 } from 'lucide-react';
import { getSpecialties, getDoctors, getDoctorAvailableSlots, bookAppointment, getAppointments } from '../services/appointmentService';
import { getPatientHistory } from '../api/consultationApi';
import { getInvoices } from '../api/billingApi';
import ChangePasswordModal from './ChangePasswordModal';
import { useLanguage } from '../contexts/LanguageContext';
import { PageTransition } from './ui';
import { MOTION_VARIANTS, ensureMotionSafeEnv } from '../theme/designSystem';

export default function PatientPanel({ subView, db, handlers }) {
  ensureMotionSafeEnv();
  const { t } = useLanguage();
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

  const visitCardData = useMemo(() => {
    if (!personalAppointments || personalAppointments.length === 0) {
      return { type: 'none' };
    }

    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    const upcoming = [];
    const past = [];

    personalAppointments.forEach(appt => {
      const apptDate = String(appt.date || '');
      const apptTime = String(appt.time || '00:00').slice(0, 5);
      const s = String(appt.status || '').toLowerCase();
      const isPastDate = apptDate < currentDateStr || (apptDate === currentDateStr && apptTime < currentTimeStr);
      const isTerminal = ['completed', 'cancelled', 'no_show'].includes(s);

      if (!isPastDate && !isTerminal) {
        upcoming.push({ ...appt, apptDate, apptTime, isToday: apptDate === currentDateStr });
      } else {
        past.push({
          ...appt,
          apptDate,
          apptTime,
          isPastDate,
          isCompleted: s === 'completed',
          isCancelled: s === 'cancelled'
        });
      }
    });

    if (upcoming.length > 0) {
      upcoming.sort((a, b) => a.apptDate.localeCompare(b.apptDate) || a.apptTime.localeCompare(b.apptTime));
      const next = upcoming[0];
      return {
        type: 'upcoming',
        title: 'Next Scheduled Visit',
        badge: next.isToday ? 'TODAY' : 'UPCOMING',
        badgeClass: next.isToday
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200',
        appointment: next
      };
    }

    if (past.length > 0) {
      past.sort((a, b) => b.apptDate.localeCompare(a.apptDate) || b.apptTime.localeCompare(a.apptTime));
      const latest = past[0];
      let badge = 'COMPLETED';
      let badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      let title = 'Last Completed Visit';

      if (latest.isCancelled) {
        badge = 'CANCELLED';
        badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
        title = 'Previous Visit';
      } else if (!latest.isCompleted) {
        badge = 'EXPIRED';
        badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
        title = 'Past Appointment (Expired)';
      }

      return {
        type: 'past',
        title,
        badge,
        badgeClass,
        appointment: latest
      };
    }

    return { type: 'none' };
  }, [personalAppointments]);

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
    return (staffList || []).filter(s => {
      const matchBranch = (s.Branch_ID != null && selectedBranchId != null && Number(s.Branch_ID) === Number(selectedBranchId)) ||
        (s.branch && bookingForm.branch && (
          s.branch.toLowerCase().includes(bookingForm.branch.toLowerCase()) ||
          bookingForm.branch.toLowerCase().includes(s.branch.toLowerCase())
        ));

      const roleStr = String(s.role || s.System_Role || s.systemRole || '');
      const isDoc = s.isDoctor ||
        s.systemRole === 'Doctor' ||
        Boolean(s.Doctor_ID) ||
        /doc|cardio|derm|practitioner|physician|surgeon|consultant/i.test(roleStr) ||
        (s.name && s.name.toLowerCase().includes('dr.'));

      const specQuery = (bookingForm.specialty || '').toLowerCase().split(' ')[0];
      const matchRole = !bookingForm.specialtyId || bookingForm.specialty === 'All Specialties' || (specQuery && roleStr.toLowerCase().includes(specQuery));

      const isActive = (s.status || s.Employment_Status || '').toLowerCase() === 'active';

      return matchBranch && isDoc && matchRole && isActive;
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
    getDoctorAvailableSlots(bookingForm.numericDoctorId, bookingForm.date, 30, selectedBranchId, true)
      .then(slots => {
        if (!isCurrent) return;
        if (Array.isArray(slots) && slots.length > 0) {
          const normalized = slots.map((s, idx) => {
            const st = String(s.Start_Time || s.start_time || '09:00:00').slice(0, 5);
            const et = String(s.End_Time || s.end_time || '09:30:00').slice(0, 5);
            const isBooked = Boolean(s.Is_Booked || s.is_booked || s.Status === 'Booked' || s.status === 'Booked');
            return {
              ...s,
              slot_id: s.Slot_ID || s.slot_id || s.Schedule_ID || `slot-${idx}-${st}`,
              start_time: st,
              end_time: et,
              is_booked: isBooked,
              status: isBooked ? 'Booked' : 'Available'
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
      const currentSelected = realSlots.find(s => s.start_time === bookingForm.time);
      if (!currentSelected || currentSelected.is_booked) {
        const firstAvailable = realSlots.find(s => !s.is_booked);
        if (firstAvailable) {
          setBookingForm(prev => ({ ...prev, time: firstAvailable.start_time }));
        }
      }
    }
  }, [realSlots, bookingForm.time]);

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
      const chosenSlot = realSlots.find(s => s.start_time === bookingForm.time);
      if (chosenSlot && chosenSlot.is_booked) {
        alert(`The selected time slot (${bookingForm.time}) is already booked. Please choose an available time slot.`);
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

    const chosenSlot = realSlots.find(s => s.start_time === bookingForm.time);
    if (chosenSlot && chosenSlot.is_booked) {
      alert(`The time slot ${bookingForm.time} is already booked. Please select an available slot.`);
      setBookingStep(3);
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
      console.error('Booking failed:', err);
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'The selected time slot is already booked or unavailable. Please choose an open slot.';
      alert(`Booking Failed: ${errorMsg}`);

      // Refresh slots for this doctor and date so user immediately sees booked states
      if (bookingForm.numericDoctorId && bookingForm.date) {
        setSlotsLoading(true);
        getDoctorAvailableSlots(bookingForm.numericDoctorId, bookingForm.date, 30, selectedBranchId, true)
          .then(slots => {
            if (Array.isArray(slots) && slots.length > 0) {
              const normalized = slots.map((s, idx) => {
                const st = String(s.Start_Time || s.start_time || '09:00:00').slice(0, 5);
                const et = String(s.End_Time || s.end_time || '09:30:00').slice(0, 5);
                const isBooked = Boolean(s.Is_Booked || s.is_booked || s.Status === 'Booked' || s.status === 'Booked');
                return {
                  ...s,
                  slot_id: s.Slot_ID || s.slot_id || s.Schedule_ID || `slot-${idx}-${st}`,
                  start_time: st,
                  end_time: et,
                  is_booked: isBooked,
                  status: isBooked ? 'Booked' : 'Available'
                };
              });
              setRealSlots(normalized);
            } else {
              setRealSlots([]);
            }
          })
          .catch(() => {})
          .finally(() => setSlotsLoading(false));
      }
      setBookingStep(3);
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
    <PageTransition transitionKey={subView} className="space-y-6">
      {/* 1. PATIENT HOME PORTAL */}
      {subView === 'home' && (
        <div className="space-y-6">
          {/* Modern SaaS Patient Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 sm:p-7 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl border border-slate-800"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold mb-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Welcome Back</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">Welcome, {currentPatientName}!</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 font-mono mt-1.5">
                <span>Member ID: {currentPatientId}</span>
                <span>|</span>
                <span>Primary Branch: {patientObj?.branch || 'Colombo Main'}</span>
                <span>|</span>
                <span>Insurance: {patientObj?.insurance?.provider || 'Cash / Self'}</span>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer backdrop-blur-xs"
                title="Change Password"
              >
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Change Password</span>
              </button>
              <button
                onClick={() => navigateTo('/portal/book')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Book Appointment</span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming or Previous Appointment Widget */}
            <motion.div custom={0} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  {visitCardData.type === 'upcoming' ? 'Next Scheduled Visit' : (visitCardData.type === 'past' ? visitCardData.title : 'Next Scheduled Visit')}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase ${visitCardData.badgeClass || 'bg-slate-100 text-slate-500'}`}>
                  {visitCardData.badge || 'None'}
                </span>
              </div>

              {visitCardData.type === 'upcoming' ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-blue-900 font-bold">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span>{visitCardData.appointment.date} @ {visitCardData.appointment.time}</span>
                    </div>
                    <div className="text-slate-600 font-medium">Physician: {visitCardData.appointment.doctorName}</div>
                    <div className="text-slate-500 font-mono text-[10px]">Location: {visitCardData.appointment.branch}</div>
                    <div className="text-slate-500 italic mt-1 font-sans">Reason: "{visitCardData.appointment.reason}"</div>
                  </div>
                </div>
              ) : visitCardData.type === 'past' ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl space-y-2 text-xs border ${
                    visitCardData.badge === 'EXPIRED'
                      ? 'bg-amber-50/60 border-amber-200'
                      : visitCardData.badge === 'CANCELLED'
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-800 font-bold">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span>{visitCardData.appointment.date} @ {visitCardData.appointment.time}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {visitCardData.badge === 'EXPIRED' ? 'Past / Unfulfilled' : visitCardData.badge === 'COMPLETED' ? 'Completed Visit' : 'Cancelled'}
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium">Physician: {visitCardData.appointment.doctorName}</div>
                    <div className="text-slate-500 font-mono text-[10px]">Location: {visitCardData.appointment.branch}</div>
                    <div className="text-slate-500 italic mt-1 font-sans">Reason: "{visitCardData.appointment.reason}"</div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">No active upcoming bookings</span>
                    <button
                      onClick={() => navigateTo('/portal/book')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Book Next Visit</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs space-y-3">
                  <Calendar className="h-8 w-8 mx-auto text-slate-300" />
                  <div>No upcoming clinic appointments scheduled.</div>
                  <button
                    onClick={() => navigateTo('/portal/book')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Book Your First Visit</span>
                  </button>
                </div>
              )}
            </motion.div>

            {/* Account Balance Widget */}
            <motion.div custom={1} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Outstanding Patient Balance</h3>
                <span className="bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono">
                  Active Account
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-3xl font-bold font-mono text-slate-900 block">Rs. {outstandingDues.toFixed(2)}</span>
                <p className="text-xs text-slate-500">Unsettled copay amounts and outpatient lab test balance dues.</p>
              </div>

              <button
                onClick={() => navigateTo('/portal/billing')}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Review Itemized Dues
              </button>
            </motion.div>

            {/* Quick Actions Card */}
            <motion.div custom={2} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Quick Navigation</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigateTo('/portal/medical-history')}
                  className="w-full p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 rounded-xl text-left text-xs font-semibold text-slate-700 flex justify-between items-center cursor-pointer transition-all"
                >
                  <span className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>View Completed Consultations</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
                <button
                  onClick={() => navigateTo('/portal/billing')}
                  className="w-full p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-xl text-left text-xs font-semibold text-slate-700 flex justify-between items-center cursor-pointer transition-all"
                >
                  <span className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Download Receipts & Statements</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Zocdoc / Doctolib Style Specialty Discovery & Instant Booking Bar */}
          <div className="ds-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>Top-Rated Specialists • Instant Online Booking</span>
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Browse by Medical Specialty</h3>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('/portal/book')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View all specialties & doctors</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'Cardiology', desc: 'Heart & Vascular', badge: '4.9 ★', color: 'from-rose-500/10 to-pink-500/5 border-rose-200/70 text-rose-700' },
                { name: 'General Medicine', desc: 'Primary Care & Fever', badge: '4.9 ★', color: 'from-blue-500/10 to-indigo-500/5 border-blue-200/70 text-blue-700' },
                { name: 'Dermatology', desc: 'Skin, Hair & Aesthetics', badge: '4.8 ★', color: 'from-amber-500/10 to-orange-500/5 border-amber-200/70 text-amber-700' },
                { name: 'Pediatrics', desc: 'Child & Infant Care', badge: '5.0 ★', color: 'from-emerald-500/10 to-teal-500/5 border-emerald-200/70 text-emerald-700' },
                { name: 'Orthopedics', desc: 'Bone, Joint & Spine', badge: '4.9 ★', color: 'from-violet-500/10 to-purple-500/5 border-violet-200/70 text-violet-700' },
                { name: 'Neurology', desc: 'Brain & Nerve Care', badge: '4.9 ★', color: 'from-cyan-500/10 to-sky-500/5 border-cyan-200/70 text-cyan-700' }
              ].map((spec) => (
                <button
                  key={spec.name}
                  type="button"
                  onClick={() => {
                    const matched = specialtiesList.find(s => (s.Specialty_Name || s.name || '').toLowerCase().includes(spec.name.toLowerCase()));
                    setBookingForm(prev => ({
                      ...prev,
                      specialtyId: matched ? (matched.Specialty_ID || matched.id) : null,
                      specialty: matched ? (matched.Specialty_Name || matched.name) : spec.name
                    }));
                    setBookingStep(1);
                    navigateTo('/portal/book');
                  }}
                  className={`group text-left p-3.5 rounded-2xl bg-gradient-to-br ${spec.color} border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center">
                      <HeartPulse className="h-4 w-4 text-current" />
                    </div>
                    <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-full text-slate-700 shadow-2xs">
                      {spec.badge}
                    </span>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-xs group-hover:text-blue-700 transition-colors">{spec.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{spec.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2.5 bg-slate-50/90 border border-slate-200/70 rounded-xl px-3.5 py-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-slate-600"><strong className="text-slate-900">100% SLMC Verified</strong> Senior Consultants</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/90 border border-slate-200/70 rounded-xl px-3.5 py-2.5">
                <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-slate-600"><strong className="text-slate-900">Instant Live Queue Token</strong> on Booking</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50/90 border border-slate-200/70 rounded-xl px-3.5 py-2.5">
                <Activity className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-slate-600"><strong className="text-slate-900">Direct Insurance E-Claims</strong> & Digital Prescriptions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SELF BOOKING WIZARD */}
      {subView === 'book' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
          {/* Zocdoc / Doctolib Inspired Booking Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white p-6 sm:p-7 shadow-xl border border-slate-800">
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Instant Confirmed Slot • Zero Booking Fee</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Self-Booking Consultation Wizard</h1>
                <p className="text-sm text-slate-300 mt-1">Book a confirmed outpatient slot with CareFlow clinicians in 4 easy steps</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 backdrop-blur-xs">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-300">Selected Clinic</span>
                  <strong className="text-white font-semibold">{bookingForm.branch}</strong>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 backdrop-blur-xs">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-300">Specialty</span>
                  <strong className="text-cyan-300 font-semibold">{bookingForm.specialty}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          {/* Mobile Sequential Stepper (< sm viewports) */}
          <div className="sm:hidden bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="font-mono text-[11px] text-blue-600 font-bold uppercase tracking-wider">
                Step 0{bookingStep} of 04
              </span>
              <span className="text-slate-900 font-bold text-xs truncate max-w-[190px]">
                {[
                  'Location & Department',
                  'Choose Doctor',
                  'Date & Time Slot',
                  'Confirmation'
                ][bookingStep - 1]}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5" role="progressbar" aria-valuenow={bookingStep} aria-valuemin={1} aria-valuemax={4} aria-label="Booking step progress">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    bookingStep === s
                      ? 'bg-blue-600'
                      : bookingStep > s
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tablet & Desktop Stepper (sm+ viewports) */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-2.5">
            {[
              { step: 1, title: 'Location & Department' },
              { step: 2, title: 'Choose Doctor' },
              { step: 3, title: 'Date & Time Slot' },
              { step: 4, title: 'Confirmation' }
            ].map(s => (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step < bookingStep) setBookingStep(s.step);
                }}
                className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition-all ${
                  bookingStep === s.step ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20' :
                  bookingStep > s.step ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer hover:bg-emerald-100/70' : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-wider">STEP 0{s.step}</span>
                  {bookingStep > s.step && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                </div>
                <span className="truncate block mt-1 font-sans text-xs">{s.title}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleConfirmBooking} className="ds-card bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 space-y-6 shadow-xs">
            {/* Step 1: Branch & Specialty */}
            {bookingStep === 1 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Select Preferred Clinic & Care Field</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Choose a CareFlow hospital branch and specialist department</p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                    {availableDoctors.length} Doctors Ready
                  </span>
                </div>

                {/* Interactive Branch Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(branches && branches.length > 0 ? branches : [
                    { Branch_ID: 1, Branch_Name: 'Colombo Main Clinic', city: 'Colombo 03 • Flagship Center' },
                    { Branch_ID: 2, Branch_Name: 'Kandy Central Clinic', city: 'Kandy • Hill Capital Center' },
                    { Branch_ID: 3, Branch_Name: 'Galle Coastal Clinic', city: 'Galle • Southern Regional Hub' }
                  ]).map(b => {
                    const bId = b.Branch_ID || b.id;
                    const bName = b.Branch_Name || b.name;
                    const isSelected = Number(bookingForm.branchId) === Number(bId);
                    return (
                      <button
                        key={bId}
                        type="button"
                        onClick={() => {
                          setBookingForm(prev => ({
                            ...prev,
                            branchId: Number(bId),
                            branch: bName,
                            doctorId: '',
                            numericDoctorId: null
                          }));
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{bName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{b.city || 'Multi-Specialty Outpatient Center'}</span>
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Clinic Branch Location</label>
                    <select
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500"
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
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500"
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

            {/* Step 2: Choose Doctor (Zocdoc / Doctolib Verified Doctor Cards) */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Select Your Practitioner</h3>
                    <p className="text-xs text-slate-500 mt-0.5">All specialists are SLMC board-certified with verified clinic schedules</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {availableDoctors.length} Available at {bookingForm.branch}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {availableDoctors.map((doc, idx) => {
                    const isSelected = bookingForm.doctorId === doc.id || bookingForm.numericDoctorId === doc.doctor_id;
                    const initials = doc.name
                      .replace(/^Dr\.?\s*/i, '')
                      .split(' ')
                      .map(part => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'DR';
                    const rating = (4.8 + ((idx % 3) * 0.1)).toFixed(1);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setBookingForm(prev => ({ ...prev, doctorId: doc.id, numericDoctorId: doc.doctor_id || 1 }))}
                        className={`p-4 border rounded-2xl flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-600/20'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                                {initials}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Available for booking" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-slate-900 text-sm">{doc.name}</h4>
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                                  Verified
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-blue-600 block mt-0.5">{doc.role}</span>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {rating}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  {doc.branch || bookingForm.branch}
                                </span>
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Consultation Fee</span>
                            <span className="font-extrabold text-emerald-700 font-mono text-sm">Fee: Rs. {doc.consultFee || 2500}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-mono block">Slot: 30 mins</span>
                            <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                              {isSelected ? 'Selected Practitioner ✓' : 'Click to Select →'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {availableDoctors.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No practitioners available in this department at {bookingForm.branch}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Date & Slot */}
            {bookingStep === 3 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Select Calendar Date & Time Slot</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time schedule synced with clinic reception desk</p>
                  </div>
                  {/* Quick Date Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'Today', offset: 0 },
                      { label: 'Tomorrow', offset: 1 },
                      { label: '+2 Days', offset: 2 },
                      { label: '+3 Days', offset: 3 }
                    ].map(({ label, offset }) => {
                      const d = new Date();
                      d.setDate(d.getDate() + offset);
                      const dStr = d.toISOString().split('T')[0];
                      const active = bookingForm.date === dStr;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setBookingForm(prev => ({ ...prev, date: dStr }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Appointment Date</label>
                    <input
                      type="date"
                      min={todayStr}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500"
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
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500"
                        value={bookingForm.time}
                        onChange={e => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                      >
                        {realSlots.map((s, idx) => {
                          const st = String(s.start_time || s.Start_Time || '09:00').slice(0, 5);
                          const et = String(s.end_time || s.End_Time || '09:30').slice(0, 5);
                          const isBooked = Boolean(s.is_booked || s.Is_Booked || s.Status === 'Booked');
                          return (
                            <option key={s.slot_id || idx} value={st} disabled={isBooked}>
                              {st} - {et} {isBooked ? '(Booked - Unavailable)' : '(Available)'}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="w-full border border-amber-200 bg-amber-50 text-amber-800 rounded-xl p-2.5 text-xs font-medium">
                        {slotsLoading ? 'Checking schedule...' : 'No slots scheduled for this date. Please select another date.'}
                      </div>
                    )}
                  </div>
                </div>

                {realSlots.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2.5 font-semibold">
                      <span>Click to Select Time Slot:</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          Available
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                          Selected
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                          Booked
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {realSlots.map((s, idx) => {
                        const st = String(s.start_time || s.Start_Time || '09:00').slice(0, 5);
                        const et = String(s.end_time || s.End_Time || '09:30').slice(0, 5);
                        const isBooked = Boolean(s.is_booked || s.Is_Booked || s.Status === 'Booked');
                        const isSelected = !isBooked && bookingForm.time === st;
                        return (
                          <button
                            key={s.slot_id || idx}
                            type="button"
                            disabled={isBooked}
                            onClick={() => {
                              if (!isBooked) {
                                setBookingForm(prev => ({ ...prev, time: st }));
                              }
                            }}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isBooked
                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-600/30'
                                : 'border-emerald-200 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer'
                            }`}
                          >
                            <div className={`text-xs font-bold font-mono ${isBooked ? 'line-through text-slate-400' : ''}`}>
                              {st} - {et}
                            </div>
                            <div className={`text-[10px] mt-0.5 font-semibold ${isBooked ? 'text-slate-400' : isSelected ? 'text-blue-100' : 'text-emerald-700'}`}>
                              {isBooked ? 'Booked' : isSelected ? 'Selected ✓' : 'Available'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Reason for Consultation (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state your primary symptoms, concerns, or checkup reason..."
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    value={bookingForm.reason}
                    onChange={e => setBookingForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm (Digital Appointment Pass) */}
            {bookingStep === 4 && (
              <div className="space-y-4 text-xs font-medium">
                <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">Review Consultation Booking Details</h3>
                <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3.5 font-mono shadow-xs">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        CF
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">CareFlow Digital Appointment Pass</p>
                        <p className="text-[10px] text-slate-500">Present at Reception or Self Check-in Kiosk</p>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      Ready to Confirm
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500">Patient Full Name:</span>
                    <strong className="text-slate-900">{currentPatientName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500">Clinic Location:</span>
                    <strong className="text-slate-900">{bookingForm.branch}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500">Department / Specialty:</span>
                    <strong className="text-slate-900">{bookingForm.specialty}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500">Selected Physician:</span>
                    <strong className="text-blue-600">
                      {availableDoctors.find(d => d.id === bookingForm.doctorId || d.doctor_id === bookingForm.numericDoctorId)?.name || 'Physician'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/70 pb-2">
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
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors"
                >
                  Back
                </button>
              )}
              {bookingStep < 4 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer shadow-sm ml-auto transition-all"
                >
                  Continue
                </button>
              )}
              {bookingStep === 4 && (
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer shadow-sm ml-auto transition-all"
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
                              <span>Rs. {(t.price * t.qty).toFixed(2)}</span>
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
                  <th className="px-6 py-3 text-right">Insurance Paid (Rs.)</th>
                  <th className="px-6 py-3 text-right">My Balance (Rs.)</th>
                  <th className="px-6 py-3 text-center">Settlement Status</th>
                  <th className="px-6 py-3 text-right">Statements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-mono text-xs">
                {personalInvoices.map(inv => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-700">{inv.invoiceId}</td>
                    <td className="px-6 py-4">{inv.date}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-bold">Rs. {inv.insuranceCoverage.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-blue-650 font-bold">Rs. {inv.patientBalance.toFixed(2)}</td>
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
    </PageTransition>
  );
}
