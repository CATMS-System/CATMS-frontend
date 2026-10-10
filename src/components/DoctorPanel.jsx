import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Activity, Clock, ArrowRight, CornerDownRight, ArrowLeft, Heart, Thermometer, User, Calendar, FileText, Stethoscope, AlertCircle, Search, Filter, Layers, Tag, Plus, Minus, Trash2, ClipboardList, Loader2, CheckCircle2, History, X, ChevronDown, ChevronUp, RefreshCw, CalendarDays } from 'lucide-react';
import { useDoctorQueue } from '../hooks/useDoctorQueue';
import { getCatalogue, getCategories } from '../api/treatmentApi';
import { createConsultation, getPatientHistory, getConsultation } from '../api/consultationApi';
import { getAppointments, getAppointmentById } from '../services/appointmentService';

export default function DoctorPanel({ subView = 'workbench', paramId, db, handlers }) {
  const currentDoctorId = db?.currentUser?.doctor_id ?? db?.currentUser?.doctorId ?? db?.currentUser?.id ?? 'STF-001';
  const currentDoctorName = db?.currentUser?.name || 'Dr. Alexander Bennett';
  // TODO: branch_id should come from auth context once Member 1's auth work lands
  const currentBranchId = db?.currentUser?.branch_id || db?.currentUser?.branchId || 1;

  // Numeric doctor id resolution for appointment queries
  const numericDoctorId = useMemo(() => {
    if (db?.currentUser?.Doctor_ID) return Number(db.currentUser.Doctor_ID);
    if (db?.currentUser?.doctor_id && !isNaN(Number(db.currentUser.doctor_id))) return Number(db.currentUser.doctor_id);
    if (db?.currentUser?.doctorId && !isNaN(Number(db.currentUser.doctorId))) return Number(db.currentUser.doctorId);
    if (db?.currentUser?.staff_id && !isNaN(Number(db.currentUser.staff_id))) return Number(db.currentUser.staff_id);
    const parsed = parseInt(String(db?.currentUser?.id || '').replace(/\D/g, ''), 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  }, [db?.currentUser]);

  // Wire doctor's daily appointment queue through isolated hook
  const { queue, loading, updateQueueStatus } = useDoctorQueue(
    currentDoctorId,
    currentBranchId,
    db?.liveQueue
  );

  // Tab navigation between live queue and upcoming schedule
  const [activeTab, setActiveTab] = useState(subView === 'appointments' ? 'appointments' : 'queue');

  useEffect(() => {
    if (subView === 'appointments') {
      setActiveTab('appointments');
    } else if (subView === 'workbench') {
      setActiveTab('queue');
    }
  }, [subView]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'appointments') {
      if (handlers?.navigateTo) handlers.navigateTo('/doctor/appointments');
    } else {
      if (handlers?.navigateTo) handlers.navigateTo('/doctor/workbench');
    }
  };

  // Doctor upcoming appointments state & queries
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);

  // Filter state for upcoming bookings
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchDoctorAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    try {
      const data = await getAppointments({ doctor_id: numericDoctorId });
      setDoctorAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch doctor appointments:', err);
      setAppointmentsError(err?.message || 'Failed to load doctor appointments');
      setDoctorAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [numericDoctorId]);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [fetchDoctorAppointments]);

  // Date boundary calculations
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const weekAheadStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  // Filtered upcoming appointments
  const filteredAppointments = useMemo(() => {
    return doctorAppointments.filter((appt) => {
      const apptDate = appt.Appointment_Date;
      if (dateFilter === 'upcoming') {
        if (apptDate < todayStr) return false;
      } else if (dateFilter === 'today') {
        if (apptDate !== todayStr) return false;
      } else if (dateFilter === 'tomorrow') {
        if (apptDate !== tomorrowStr) return false;
      } else if (dateFilter === 'week') {
        if (apptDate < todayStr || apptDate > weekAheadStr) return false;
      } else if (dateFilter === 'custom' && customDate) {
        if (apptDate !== customDate) return false;
      }

      if (statusFilter === 'active') {
        if (!['Scheduled', 'Confirmed', 'In_Progress'].includes(appt.Status)) return false;
      } else if (statusFilter !== 'ALL') {
        if (appt.Status !== statusFilter) return false;
      }

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchName = (appt.Patient_Name || '').toLowerCase().includes(q);
        const matchId = String(appt.Patient_ID || '').toLowerCase().includes(q);
        const matchReason = (appt.Reason_For_Visit || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchReason) return false;
      }

      return true;
    });
  }, [doctorAppointments, dateFilter, customDate, statusFilter, searchFilter, todayStr, tomorrowStr, weekAheadStr]);

  // Summary statistics for appointments
  const upcomingCount = useMemo(() => {
    return doctorAppointments.filter((a) => a.Appointment_Date >= todayStr && ['Scheduled', 'Confirmed', 'In_Progress'].includes(a.Status)).length;
  }, [doctorAppointments, todayStr]);

  const confirmedCount = useMemo(() => {
    return doctorAppointments.filter((a) => a.Appointment_Date >= todayStr && a.Status === 'Confirmed').length;
  }, [doctorAppointments, todayStr]);

  const scheduledCount = useMemo(() => {
    return doctorAppointments.filter((a) => a.Appointment_Date >= todayStr && a.Status === 'Scheduled').length;
  }, [doctorAppointments, todayStr]);

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

      if (paramId.includes('?')) {
        const queryPart = paramId.split('?')[1];
        const params = new URLSearchParams(queryPart);
        if (!patId && params.get('patient_id')) {
          patId = params.get('patient_id');
        }
        if (!apptId && params.get('appointment_id')) {
          apptId = params.get('appointment_id');
        }
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

  // Real-time backend appointment fetch by ID for active consultation console
  const [fetchedAppt, setFetchedAppt] = useState(null);

  useEffect(() => {
    if (!activeAppointmentId) {
      setFetchedAppt(null);
      return;
    }
    const cleanId = String(activeAppointmentId).replace(/\D/g, '');
    const numId = cleanId ? parseInt(cleanId, 10) : null;
    if (!numId || numId >= 1000) return;

    let isCurrent = true;
    getAppointmentById(numId)
      .then((data) => {
        if (isCurrent && data) {
          setFetchedAppt(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch appointment by ID from API:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeAppointmentId]);

  // Resolve active appointment and patient data from API and db
  const activeAppt = useMemo(() => {
    if (!activeAppointmentId) return null;
    const cleanId = String(activeAppointmentId).replace(/\D/g, '');
    const numId = cleanId ? parseInt(cleanId, 10) : null;

    if (fetchedAppt) {
      return {
        ...fetchedAppt,
        id: fetchedAppt.Appointment_ID || activeAppointmentId,
        appointment_id: fetchedAppt.Appointment_ID,
        Appointment_ID: fetchedAppt.Appointment_ID,
        patientId: fetchedAppt.Patient_ID ? `PAT-${String(fetchedAppt.Patient_ID).padStart(4, '0')}` : activePatientId,
        patient_id: fetchedAppt.Patient_ID,
        Patient_ID: fetchedAppt.Patient_ID,
        date: fetchedAppt.Appointment_Date,
        time: fetchedAppt.Start_Time ? String(fetchedAppt.Start_Time).slice(0, 5) : '10:00 AM',
        reason: fetchedAppt.Reason_For_Visit || 'Clinical consultation',
        status: fetchedAppt.Status || 'In-Progress',
      };
    }

    const fromDocList = doctorAppointments.find(
      (a) =>
        String(a.Appointment_ID) === String(activeAppointmentId) ||
        (numId && a.Appointment_ID === numId)
    );
    if (fromDocList) {
      return {
        ...fromDocList,
        id: fromDocList.Appointment_ID,
        appointment_id: fromDocList.Appointment_ID,
        Appointment_ID: fromDocList.Appointment_ID,
        patientId: fromDocList.Patient_ID ? `PAT-${String(fromDocList.Patient_ID).padStart(4, '0')}` : activePatientId,
        patient_id: fromDocList.Patient_ID,
        Patient_ID: fromDocList.Patient_ID,
        date: fromDocList.Appointment_Date,
        time: fromDocList.Start_Time ? String(fromDocList.Start_Time).slice(0, 5) : '10:00 AM',
        reason: fromDocList.Reason_For_Visit || 'Clinical consultation',
        status: fromDocList.Status || 'In-Progress',
      };
    }

    const fromDb = db?.appointmentList?.find(
      (a) =>
        String(a.id) === String(activeAppointmentId) ||
        String(a.appointment_id) === String(activeAppointmentId) ||
        String(a.Appointment_ID) === String(activeAppointmentId) ||
        (numId && (a.Appointment_ID === numId || a.appointment_id === numId || parseInt(String(a.id).replace(/\D/g, ''), 10) === numId))
    );
    if (fromDb) return fromDb;

    return {
      id: activeAppointmentId,
      Appointment_ID: numId || undefined,
      appointment_id: numId || undefined,
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      reason: 'Clinical consultation',
      status: 'In-Progress',
    };
  }, [fetchedAppt, doctorAppointments, db?.appointmentList, activeAppointmentId, activePatientId]);

  const activePatient = useMemo(() => {
    const pId = activePatientId || activeAppt?.patientId || activeAppt?.patient_id || activeAppt?.Patient_ID;
    if (!pId) return null;
    const cleanPId = parseInt(String(pId).replace(/\D/g, ''), 10);

    const fromDb = db?.patientList?.find(
      (p) =>
        String(p.id) === String(pId) ||
        String(p.patient_id) === String(pId) ||
        String(p.Patient_ID) === String(pId) ||
        (cleanPId && (p.patient_id === cleanPId || p.Patient_ID === cleanPId || parseInt(String(p.id).replace(/\D/g, ''), 10) === cleanPId))
    );
    if (fromDb) return fromDb;

    if (activeAppt?.Patient_Name) {
      return {
        id: pId,
        patient_id: cleanPId || 1,
        name: activeAppt.Patient_Name,
        dob: '1990-01-01',
        gender: 'Not specified',
        nic: '900000000V',
        phone: activeAppt.Patient_Phone || '',
        insurance: { provider: 'Standard Health' },
      };
    }

    return {
      id: pId,
      patient_id: cleanPId || 1,
      name: 'Patient ' + pId,
      dob: '1990-01-01',
      gender: 'Not specified',
      nic: '900000000V',
      insurance: { provider: 'Standard Health' },
    };
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

  // Inline field validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Field validator helper
  const validateField = (field, value) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setErrors((prev) => {
      const next = { ...prev };
      if (field === 'diagnosis') {
        if (!value || !value.trim()) {
          next.diagnosis = 'Clinical diagnosis is required and cannot be empty.';
        } else {
          delete next.diagnosis;
        }
      }
      if (field === 'followUpDate') {
        if (value && value < todayStr) {
          next.followUpDate = 'Follow-up date cannot be in the past.';
        } else {
          delete next.followUpDate;
        }
      }
      return next;
    });
  };

  // Today's minimum date string for follow-up validation
  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Standard treatment catalogue fallback dataset
  const DEFAULT_CATALOGUE = useMemo(() => [
    { treatment_id: 1, service_code: 'TRT-001', treatment_name: 'General Consultation Fee', category_name: 'Consultations', standard_unit_price: 1500, category_id: 1 },
    { treatment_id: 2, service_code: 'TRT-002', treatment_name: 'ECG / Electrocardiogram', category_name: 'Diagnostic Tests', standard_unit_price: 5000, category_id: 2 },
    { treatment_id: 3, service_code: 'TRT-003', treatment_name: 'Blood Sugar Rapid Test', category_name: 'Diagnostic Tests', standard_unit_price: 600, category_id: 2 },
    { treatment_id: 4, service_code: 'TRT-004', treatment_name: 'Chest X-Ray Digital', category_name: 'Imaging & Radiology', standard_unit_price: 8000, category_id: 3 },
    { treatment_id: 5, service_code: 'TRT-005', treatment_name: 'Nebulizer Therapy Session', category_name: 'Procedures', standard_unit_price: 2500, category_id: 4 },
    { treatment_id: 6, service_code: 'TRT-006', treatment_name: 'Stitch / Laceration Care', category_name: 'Procedures', standard_unit_price: 4000, category_id: 4 },
    { treatment_id: 7, service_code: 'TRT-007', treatment_name: 'IV Saline Infusion 500ml', category_name: 'Procedures', standard_unit_price: 3000, category_id: 4 },
  ], []);

  // Catalogue browser state
  const [catalogue, setCatalogue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);

  // Fetch treatment categories on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        // Silently fallback if backend not running
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch treatment catalogue with search and category filter using getCatalogue API function
  useEffect(() => {
    let isMounted = true;
    const fetchCatalogue = async () => {
      setLoadingCatalogue(true);
      try {
        const params = {};
        if (catalogueSearch.trim()) params.search = catalogueSearch.trim();
        if (selectedCategory) params.category_id = Number(selectedCategory);
        const data = await getCatalogue(params);
        if (isMounted && Array.isArray(data)) {
          setCatalogue(data);
        }
      } catch (err) {
        if (isMounted) {
          // Graceful local fallback filter
          let list = DEFAULT_CATALOGUE;
          if (catalogueSearch.trim()) {
            const q = catalogueSearch.toLowerCase();
            list = list.filter(
              (c) =>
                (c.treatment_name && c.treatment_name.toLowerCase().includes(q)) ||
                (c.service_code && c.service_code.toLowerCase().includes(q))
            );
          }
          if (selectedCategory) {
            list = list.filter((c) => c.category_id === Number(selectedCategory));
          }
          setCatalogue(list);
        }
      } finally {
        if (isMounted) setLoadingCatalogue(false);
      }
    };

    const debounceTimer = setTimeout(fetchCatalogue, 250);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [catalogueSearch, selectedCategory, DEFAULT_CATALOGUE]);

  // Prescribed treatments state (Step F11)
  const [prescribedItems, setPrescribedItems] = useState([]);

  // Add treatment from catalogue browser
  const handleAddTreatment = (item) => {
    setPrescribedItems((prev) => {
      const existingIndex = prev.findIndex(
        (p) =>
          (p.treatment_id && p.treatment_id === item.treatment_id) ||
          p.service_code === item.service_code
      );
      if (existingIndex >= 0) {
        return prev.map((p, idx) =>
          idx === existingIndex ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [
        ...prev,
        {
          treatment_id: item.treatment_id,
          service_code: item.service_code,
          treatment_name: item.treatment_name,
          standard_unit_price: Number(item.standard_unit_price || 0),
          category_name: item.category_name,
          quantity: 1,
          instructions: '',
        },
      ];
    });
  };

  // Remove treatment from prescribing table
  const handleRemoveTreatment = (indexToRemove) => {
    setPrescribedItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Update treatment quantity selector
  const handleUpdateQuantity = (index, delta) => {
    setPrescribedItems((prev) =>
      prev.map((p, idx) => {
        if (idx === index) {
          const newQty = Math.max(1, p.quantity + delta);
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  // Update treatment dosage instructions
  const handleUpdateInstructions = (index, text) => {
    setPrescribedItems((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, instructions: text } : p))
    );
  };

  // Running grand total for prescribed treatments (Step F12 - display only)
  const prescribedGrandTotal = useMemo(() => {
    return prescribedItems.reduce((acc, item) => {
      const price = Number(item.standard_unit_price || 0);
      const qty = Number(item.quantity || 1);
      return acc + price * qty;
    }, 0);
  }, [prescribedItems]);

  // Loading state for consultation submission (Step F13)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success and error feedback toast state (Step F14)
  const [toastState, setToastState] = useState(null);

  // Patient consultation history drawer state (Step F15)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedConsultations, setExpandedConsultations] = useState([]);
  const [consultationDetails, setConsultationDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // Fetch chronological patient consultation history when drawer opens
  useEffect(() => {
    if (!showHistoryDrawer) return;
    let isMounted = true;

    const fetchHistory = async () => {
      const pId = activePatientId || activePatient?.id || 1;
      const numPId =
        typeof pId === 'number'
          ? pId
          : parseInt(String(pId).replace(/\D/g, ''), 10) || 1;

      setLoadingHistory(true);
      try {
        const data = await getPatientHistory(numPId);
        if (isMounted) {
          setPatientHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          // Graceful local history fallback
          const localHist = db?.medicalHistories?.find(
            (h) => h.patientId === (activePatientId || activePatient?.id)
          );
          if (localHist?.visits) {
            setPatientHistory(
              localHist.visits.map((v, i) => ({
                consultation_id: i + 1,
                consultation_date: v.date,
                diagnosis: v.diagnosis,
                doctor_name: v.doctor,
                follow_up_date: v.follow_up_date || null,
                item_count: v.treatments?.length || 0,
                items: v.treatments || [],
              }))
            );
          } else {
            setPatientHistory([]);
          }
        }
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [showHistoryDrawer, activePatientId, activePatient, db?.medicalHistories]);

  // Toggle expandable prescribed items for a consultation in the history timeline
  const toggleExpandConsultation = async (consultId) => {
    const isExpanded = expandedConsultations.includes(consultId);
    if (isExpanded) {
      setExpandedConsultations((prev) => prev.filter((id) => id !== consultId));
    } else {
      setExpandedConsultations((prev) => [...prev, consultId]);
      if (!consultationDetails[consultId]) {
        setLoadingDetails((prev) => ({ ...prev, [consultId]: true }));
        try {
          const detail = await getConsultation(consultId);
          setConsultationDetails((prev) => ({
            ...prev,
            [consultId]: detail?.items || [],
          }));
        } catch {
          const histItem = patientHistory.find((h) => h.consultation_id === consultId);
          setConsultationDetails((prev) => ({
            ...prev,
            [consultId]: histItem?.items || [],
          }));
        } finally {
          setLoadingDetails((prev) => ({ ...prev, [consultId]: false }));
        }
      }
    }
  };

  // Complete consultation and send to billing via createConsultation API
  const handleCompleteVisit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Inline validation check
    if (!diagnosis || !diagnosis.trim()) {
      setTouched((prev) => ({ ...prev, diagnosis: true }));
      validateField('diagnosis', '');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (followUpDate && followUpDate < todayStr) {
      setTouched((prev) => ({ ...prev, followUpDate: true }));
      validateField('followUpDate', followUpDate);
      return;
    }

    setIsSubmitting(true);
    try {
      const rawApptId =
        activeAppt?.Appointment_ID ||
        activeAppt?.appointment_id ||
        (typeof activeAppointmentId === 'number'
          ? activeAppointmentId
          : parseInt(String(activeAppointmentId).replace(/\D/g, ''), 10) || 1);

      const resolvedApptId = Number(rawApptId) || 1;

      const itemsPayload = prescribedItems.map((item) => ({
        treatment_id:
          typeof item.treatment_id === 'number'
            ? item.treatment_id
            : parseInt(String(item.service_code || item.treatment_id || '1').replace(/\D/g, ''), 10) || 1,
        quantity: Number(item.quantity) || 1,
        instructions: item.instructions || undefined,
      }));

      const vitalsPayload = {
        bp: vitals.bp || undefined,
        heart_rate: vitals.hr ? parseInt(vitals.hr, 10) || undefined : undefined,
        temperature: vitals.temp ? parseFloat(vitals.temp) || undefined : undefined,
        spo2: vitals.spo2 ? parseInt(vitals.spo2, 10) || undefined : undefined,
        weight: vitals.weight ? parseFloat(vitals.weight) || undefined : undefined,
      };

      const payload = {
        appointment_id: resolvedApptId,
        diagnosis: diagnosis.trim(),
        clinical_notes: clinicalNotes.trim() || undefined,
        doctor_notes: doctorNotes.trim() || undefined,
        follow_up_date: followUpDate || undefined,
        vitals: vitalsPayload,
        items: itemsPayload,
      };

      const result = await createConsultation(payload);
      const invoiceId = result?.invoice_id || result?.invoiceId || 'INV-Generated';
      const successMsg = `Consultation completed successfully! Invoice #${invoiceId} generated and routed to billing.`;

      // Success feedback (Step F14)
      handlers?.triggerToast?.(successMsg);
      setToastState({
        type: 'success',
        message: successMsg,
        invoiceId,
      });

      if (activePatientId) {
        updateQueueStatus(activePatientId, 'COMPLETED');
      }

      // Navigate back to workbench queue on success
      setTimeout(() => {
        if (handlers?.navigateTo) {
          handlers.navigateTo('/doctor/workbench');
        } else {
          window.history.pushState(null, '', '/doctor/workbench');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, 1200);
    } catch (err) {
      // Error feedback (Step F14)
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to complete consultation. Please check required fields and try again.';

      handlers?.triggerToast?.(`Error: ${errorMsg}`);
      setToastState({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate to consultation room route, passing appointment_id and patient_id
  const handleSelectPatient = (queueItem) => {
    const rawApptId =
      queueItem.Appointment_ID ||
      queueItem.appointment_id ||
      queueItem.appointmentId ||
      queueItem.id;

    const rawPatientId =
      queueItem.Patient_ID ||
      queueItem.patient_id ||
      queueItem.patientId;

    let resolvedApptId = rawApptId;
    if (!resolvedApptId && rawPatientId && db?.appointmentList) {
      const match = db.appointmentList.find(
        (a) =>
          (String(a.patientId) === String(rawPatientId) ||
           String(a.patient_id) === String(rawPatientId) ||
           String(a.Patient_ID) === String(rawPatientId)) &&
          a.status !== 'Completed'
      );
      if (match) {
        resolvedApptId = match.Appointment_ID || match.appointment_id || match.id;
      }
    }

    const apptId = resolvedApptId || 1;
    const patientId = rawPatientId || 'PAT-0001';

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
      {/* 1. DOCTOR WORKBENCH & UPCOMING APPOINTMENTS */}
      {(subView === 'workbench' || subView === 'appointments') && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clinician Triage Workbench</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage waiting room queues, recall diagnostics, review upcoming schedules, and open active clinical consoles
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-blue-50 text-blue-800 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold font-mono">
                Attending: {currentDoctorName}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 space-x-2">
            <button
              type="button"
              onClick={() => handleTabChange('queue')}
              className={`flex items-center space-x-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'queue'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Today's Live Queue</span>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono">
                {queue.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('appointments')}
              className={`flex items-center space-x-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'appointments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Upcoming Appointments</span>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                {upcomingCount}
              </span>
            </button>
          </div>

          {/* TAB 1: DAILY LIVE TRIAGE QUEUE */}
          {activeTab === 'queue' && (
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
          )}

          {/* TAB 2: UPCOMING APPOINTMENTS SCHEDULE */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Metrics Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
                  <div className="h-11 w-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Upcoming Bookings</span>
                    <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{upcomingCount}</div>
                    <span className="text-[11px] text-slate-400">Future scheduled visits</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
                  <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confirmed</span>
                    <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5">{confirmedCount}</div>
                    <span className="text-[11px] text-slate-400">Confirmed upcoming</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
                  <div className="h-11 w-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Scheduled (Pending)</span>
                    <div className="text-xl font-bold text-amber-700 font-mono mt-0.5">{scheduledCount}</div>
                    <span className="text-[11px] text-slate-400">Awaiting confirmation</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
                  <div className="h-11 w-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Live Queue</span>
                    <div className="text-xl font-bold text-indigo-700 font-mono mt-0.5">{queue.length}</div>
                    <span className="text-[11px] text-slate-400">Active patients waiting</span>
                  </div>
                </div>
              </div>

              {/* Filter and Control Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search patient, ID, or reason..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Date Scope Filter */}
                  <div className="flex items-center space-x-1.5">
                    <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="upcoming">Upcoming (Default)</option>
                      <option value="today">Today Only</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="week">Next 7 Days</option>
                      <option value="all">All Dates</option>
                      <option value="custom">Custom Date...</option>
                    </select>
                  </div>

                  {/* Custom Date Input */}
                  {dateFilter === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700"
                    />
                  )}

                  {/* Status Filter */}
                  <div className="flex items-center space-x-1.5">
                    <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="active">Active (Scheduled & Confirmed)</option>
                      <option value="ALL">All Statuses</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={fetchDoctorAppointments}
                  disabled={loadingAppointments}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-lg inline-flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAppointments ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Upcoming Bookings Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h2 className="font-bold text-slate-900 text-md">Upcoming Booked Consultations</h2>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing {filteredAppointments.length} booking{filteredAppointments.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <th className="px-6 py-3">Date & Time</th>
                        <th className="px-6 py-3">Patient Details</th>
                        <th className="px-6 py-3">Reason for Visit</th>
                        <th className="px-6 py-3">Type & Branch</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Consultation Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650">
                      {loadingAppointments ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                            <div className="inline-flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span>Loading upcoming appointments...</span>
                            </div>
                          </td>
                        </tr>
                      ) : appointmentsError ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-red-500">
                            {appointmentsError}
                          </td>
                        </tr>
                      ) : filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appt) => {
                          const isToday = appt.Appointment_Date === todayStr;
                          const isFuture = appt.Appointment_Date > todayStr;
                          return (
                            <tr
                              key={appt.Appointment_ID}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">
                                  {appt.Appointment_Date}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5 font-mono">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>{appt.Start_Time ? String(appt.Start_Time).slice(0, 5) : 'Scheduled'}</span>
                                  <span>({appt.Duration_Minutes || 30}m)</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{appt.Patient_Name || `Patient #${appt.Patient_ID}`}</div>
                                <div className="text-xs text-slate-400 font-mono">
                                  ID: {appt.Patient_ID} {appt.Patient_Phone ? `| ${appt.Patient_Phone}` : ''}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700">
                                {appt.Reason_For_Visit || 'Routine Checkup'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs font-semibold text-slate-800">
                                  {appt.Branch_Name || 'Clinic Branch'}
                                </div>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                  appt.Appointment_Type === 'Walk_In'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {appt.Appointment_Type || 'Scheduled'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                                    appt.Status === 'Confirmed'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : appt.Status === 'Scheduled'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : appt.Status === 'In_Progress'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                      : appt.Status === 'Completed'
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {appt.Status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isToday ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectPatient(appt)}
                                    className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg inline-flex items-center space-x-1.5 cursor-pointer ml-auto shadow-xs"
                                  >
                                    <span>Call Patient</span>
                                    <CornerDownRight className="h-3.5 w-3.5" />
                                  </button>
                                ) : isFuture ? (
                                  <span className="inline-flex items-center space-x-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-medium">
                                    <Calendar className="h-3 w-3" />
                                    <span>Upcoming</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 font-mono">
                                    Past Record
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                            No upcoming appointments found matching your selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
                onClick={() => setShowHistoryDrawer(true)}
                className="bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-xl px-4 py-3 font-semibold transition-all flex items-center space-x-1.5 cursor-pointer text-white shadow-xs"
              >
                <History className="h-4 w-4" />
                <span>Patient History</span>
              </button>

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
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      errors.diagnosis
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20 text-slate-900'
                        : 'border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900'
                    }`}
                    value={diagnosis}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiagnosis(val);
                      if (touched.diagnosis) {
                        validateField('diagnosis', val);
                      }
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, diagnosis: true }));
                      validateField('diagnosis', diagnosis);
                    }}
                  />
                  {errors.diagnosis && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center space-x-1 font-medium animate-fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.diagnosis}</span>
                    </p>
                  )}
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
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono transition-colors ${
                      errors.followUpDate
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20 text-slate-900'
                        : 'border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800'
                    }`}
                    value={followUpDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFollowUpDate(val);
                      validateField('followUpDate', val);
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, followUpDate: true }));
                      validateField('followUpDate', followUpDate);
                    }}
                  />
                  {errors.followUpDate && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center space-x-1 font-medium animate-fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.followUpDate}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Prescribing Table (Step F11 & F12) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-md flex items-center">
                    <ClipboardList className="h-4.5 w-4.5 text-blue-600 mr-1.5" />
                    Prescribed Treatments & Items
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Itemized treatments, procedures, and medications prescribed for this consultation
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full font-mono">
                    {prescribedItems.length} {prescribedItems.length === 1 ? 'item' : 'items'}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full font-mono">
                    Estimated Total: ${prescribedGrandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-2.5 w-12 text-center">#</th>
                      <th className="px-4 py-2.5">Treatment Item</th>
                      <th className="px-4 py-2.5 w-24 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 w-36 text-center">Quantity</th>
                      <th className="px-4 py-2.5">Instructions / Dosage</th>
                      <th className="px-4 py-2.5 w-28 text-right">Line Total</th>
                      <th className="px-4 py-2.5 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prescribedItems.length > 0 ? (
                      prescribedItems.map((item, idx) => (
                        <tr key={item.treatment_id || item.service_code || idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{item.treatment_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1.5">
                              <span>{item.service_code}</span>
                              <span>•</span>
                              <span>{item.category_name || 'General'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600 font-medium">
                            ${Number(item.standard_unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-250 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, -1)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                                title="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-slate-900 text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, 1)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                                title="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="e.g. 1 tab TDS after meals for 5 days..."
                              className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                              value={item.instructions}
                              onChange={(e) => handleUpdateInstructions(idx, e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            ${(Number(item.standard_unit_price || 0) * Number(item.quantity || 1)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveTreatment(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove treatment"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                          No treatments prescribed yet. Select treatments from the catalogue browser below to add them to this prescription.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {prescribedItems.length > 0 && (
                    <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                          Prescription Grand Total (Est.):
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-950 text-sm">
                          ${prescribedGrandTotal.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Display pricing note (backend determines actual price) */}
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg px-3.5 py-2 text-[11px] text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>
                  <strong className="font-semibold">Note:</strong> Pricing and totals shown here are for display and clinical estimation only; the backend sets the actual price upon consultation completion.
                </span>
                <span className="font-mono text-xs font-bold text-amber-900 shrink-0">
                  Grand Total: ${prescribedGrandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Treatment Catalogue Browser (Step F10) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-md flex items-center">
                    <Layers className="h-4.5 w-4.5 text-blue-600 mr-1.5" />
                    Treatment Catalogue Browser
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Filter by category and search active clinical treatments and procedures
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {catalogue.length} items available
                </span>
              </div>

              {/* Category Filter and Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search treatments by name or service code (e.g. ECG, X-Ray)..."
                    className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs bg-slate-50/50"
                    value={catalogueSearch}
                    onChange={(e) => setCatalogueSearch(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Filter className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    className="w-full border border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg pl-8 pr-3 py-2 text-xs bg-slate-50/50 text-slate-700 cursor-pointer"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catalogue Results List with Prescribe button */}
              <div className="border border-slate-150 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {loadingCatalogue ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Loading treatment catalogue from API...
                  </div>
                ) : catalogue.length > 0 ? (
                  catalogue.map((item) => (
                    <div
                      key={item.treatment_id || item.service_code}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">
                            {item.service_code}
                          </span>
                          <strong className="text-xs text-slate-900 font-semibold">
                            {item.treatment_name}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                          <span className="font-medium text-slate-500">{item.category_name || 'Standard Service'}</span>
                          {item.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-sm">{item.description}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 ml-4">
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-slate-900 block">
                            ${Number(item.standard_unit_price || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            Standard Fee
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTreatment(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Prescribe</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No treatment items match the current search or category filter.
                  </div>
                )}
              </div>
            </div>

            {/* Complete Visit Action Button (Step F13) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Complete Clinical Session</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save clinical findings, prescribe itemized treatments, and route invoice to billing desk
                </p>
              </div>

              <button
                type="button"
                onClick={handleCompleteVisit}
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center space-x-2 cursor-pointer ${
                  isSubmitting
                    ? 'bg-emerald-400 cursor-not-allowed opacity-80'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Consultation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Complete Visit & Send to Billing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification (Step F14) */}
      {toastState && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl shadow-2xl border flex items-start space-x-3 animate-fade-in ${
            toastState.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500 shadow-emerald-950/20'
              : 'bg-slate-900 text-white border-red-500 shadow-red-950/20'
          }`}
        >
          {toastState.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-white">
              {toastState.type === 'success' ? 'Consultation Completed' : 'Consultation Error'}
            </div>
            <div className="mt-0.5 text-slate-300">{toastState.message}</div>
            {toastState.invoiceId && (
              <div className="mt-2 inline-flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] px-2 py-0.5 rounded">
                <span>Invoice Issued:</span>
                <span className="font-bold">#{toastState.invoiceId}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastState(null)}
            className="text-slate-400 hover:text-white text-xs font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Patient Consultation History Drawer (Step F15) */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setShowHistoryDrawer(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col z-50">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Patient Consultation History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activePatient?.name || 'Selected Patient'} ({activePatient?.id || activePatientId || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingHistory ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Loading clinical consultation history timeline...
                  </p>
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-8">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Past Consultations Found</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    There are no prior recorded clinical consultations for this patient in the system.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-200 ml-4 pl-6 space-y-6">
                  {patientHistory.map((item) => {
                    const isExpanded = expandedConsultations.includes(item.consultation_id);
                    const items = consultationDetails[item.consultation_id];
                    const isLoadingItemDetail = loadingDetails[item.consultation_id];

                    return (
                      <div key={item.consultation_id} className="relative group">
                        {/* Timeline node */}
                        <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs" />

                        {/* Consultation Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all space-y-3">
                          {/* Card header: Date & Attending Doctor */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center space-x-1.5 text-xs text-blue-700 font-bold font-mono">
                                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                <span>{item.consultation_date}</span>
                              </div>
                              <div className="text-xs text-slate-600 font-medium mt-0.5 flex items-center space-x-1">
                                <Stethoscope className="h-3 w-3 text-slate-400" />
                                <span>Attending: {item.doctor_name}</span>
                              </div>
                            </div>
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-200 font-semibold">
                              #{item.consultation_id}
                            </span>
                          </div>

                          {/* Diagnosis */}
                          <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Clinical Diagnosis
                            </span>
                            <p className="text-xs font-semibold text-slate-800">
                              {item.diagnosis}
                            </p>
                          </div>

                          {/* Follow-up date if available */}
                          {item.follow_up_date && (
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                              <span className="font-semibold text-slate-600">Follow-up:</span>
                              <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] border border-blue-150">
                                {item.follow_up_date}
                              </span>
                            </div>
                          )}

                          {/* Expandable Prescribed Items Section */}
                          <div className="border-t border-slate-100 pt-2.5">
                            <button
                              type="button"
                              onClick={() => toggleExpandConsultation(item.consultation_id)}
                              className="w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer"
                            >
                              <span>
                                Prescribed Items ({item.item_count || item.items?.length || 0})
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2 animate-fade-in">
                                {isLoadingItemDetail ? (
                                  <div className="text-center py-2 text-xs text-slate-400 flex items-center justify-center space-x-1.5">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                    <span>Loading prescribed treatments...</span>
                                  </div>
                                ) : items && items.length > 0 ? (
                                  items.map((trt, idx) => (
                                    <div
                                      key={trt.prescription_item_id || idx}
                                      className="bg-slate-50 rounded-lg p-2 text-xs border border-slate-150 flex justify-between items-start"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          {trt.treatment_name || trt.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          Qty: {trt.quantity || trt.qty || 1}
                                          {trt.instructions && ` • ${trt.instructions}`}
                                        </div>
                                      </div>
                                      <span className="font-mono font-bold text-slate-700 text-[11px]">
                                        ${Number(trt.billed_unit_price || trt.price || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic py-1">
                                    No itemized treatments prescribed for this visit.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
