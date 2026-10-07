import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Clock, ArrowRight, CornerDownRight, ArrowLeft, Heart, Thermometer, User, Calendar, FileText, Stethoscope, AlertCircle, Search, Filter, Layers, Tag, Plus, Minus, Trash2, ClipboardList } from 'lucide-react';
import { useDoctorQueue } from '../hooks/useDoctorQueue';
import { getCatalogue, getCategories } from '../api/treatmentApi';

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

            {/* Prescribing Table (Step F11) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-md flex items-center">
                    <ClipboardList className="h-4.5 w-4.5 text-blue-600 mr-1.5" />
                    Prescribed Treatments & Items
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Itemized treatments, procedures, and medications prescribed for this consultation
                  </p>
                </div>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full font-mono">
                  {prescribedItems.length} {prescribedItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-4 py-2.5 w-12 text-center">#</th>
                      <th className="px-4 py-2.5">Treatment Item</th>
                      <th className="px-4 py-2.5 w-36 text-center">Quantity</th>
                      <th className="px-4 py-2.5">Instructions / Dosage</th>
                      <th className="px-4 py-2.5 w-20 text-center">Action</th>
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
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                          No treatments prescribed yet. Select treatments from the catalogue browser below to add them to this prescription.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
          </div>
        </div>
      )}
    </div>
  );
}
