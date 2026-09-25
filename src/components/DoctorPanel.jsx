import React, { useState, useMemo } from 'react';
import { Clock, Activity, FileText, CheckCircle, Search, Plus, Minus, User, ShieldAlert, ArrowRight, CornerDownRight } from 'lucide-react';

export default function DoctorPanel({ subView, paramId, db, handlers }) {
  const { liveQueue, patientList, staffList, medicalHistories, appointmentList, invoiceList } = db;
  const { setLiveQueue, setMedicalHistories, setInvoiceList, setAppointmentList, triggerToast, addAuditLog, navigateTo } = handlers;

  const currentDoctorId = db.currentUser.id || 'STF-001';
  const currentDoctorName = db.currentUser.name || 'Dr. Alexander Bennett';

  // Find active appointment for consultation
  const activeApptId = paramId;
  const activeAppt = useMemo(() => {
    if (!activeApptId) return null;
    return appointmentList.find(a => a.id === activeApptId);
  }, [appointmentList, activeApptId]);

  const activePatient = useMemo(() => {
    if (!activeAppt) return null;
    return patientList.find(p => p.id === activeAppt.patientId);
  }, [patientList, activeAppt]);

  // Vitals inputs
  const [vitals, setVitals] = useState({
    bp: '120/80',
    pulse: '72',
    temp: '98.6',
    weight: '70'
  });
  const [complaint, setComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [lifestyleAdvice, setLifestyleAdvice] = useState('');

  // Selected treatments for active consult
  const [prescribedItems, setPrescribedItems] = useState([
    { code: 'TRT-001', name: 'General Consultation Fee', category: 'Consultations', price: 1500, qty: 1, instructions: 'Standard clinical checkup fee' }
  ]);
  const [searchCatalogueQuery, setSearchCatalogueQuery] = useState('');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Doctor local queue (only their assigned appointments/triage queue)
  const doctorQueue = useMemo(() => {
    return liveQueue.filter(q => q.doctorId === currentDoctorId || q.assignedDoctor === currentDoctorName);
  }, [liveQueue, currentDoctorId, currentDoctorName]);

  // Standard treatment catalogue
  const CATALOGUE = [
    { code: 'TRT-001', name: 'General Consultation Fee', category: 'Consultations', price: 1500 },
    { code: 'TRT-002', name: 'ECG / Electrocardiogram', category: 'Lab Tests', price: 5000 },
    { code: 'TRT-003', name: 'Blood Sugar Rapid Test', category: 'Lab Tests', price: 600 },
    { code: 'TRT-004', name: 'Chest X-Ray Digital', category: 'Radiology', price: 8000 },
    { code: 'TRT-005', name: 'Nebulizer Therapy Session', category: 'Procedures', price: 2500 },
    { code: 'TRT-006', name: 'Stitch / Laceration Care', category: 'Procedures', price: 4000 },
    { code: 'TRT-007', name: 'IV Saline Infusion 500ml', category: 'Procedures', price: 3000 }
  ];

  const filteredCatalogue = useMemo(() => {
    if (!searchCatalogueQuery) return CATALOGUE;
    return CATALOGUE.filter(c => c.name.toLowerCase().includes(searchCatalogueQuery.toLowerCase()));
  }, [searchCatalogueQuery]);

  const handleCallPatient = (queueItem) => {
    // Transition status to IN_PROGRESS
    const updatedQueue = liveQueue.map(q => {
      if (q.patientId === queueItem.patientId) {
        return { ...q, status: 'IN_PROGRESS' };
      }
      return q;
    });
    setLiveQueue(updatedQueue);

    // Find appointment ID to redirect to
    const appt = appointmentList.find(a => a.patientId === queueItem.patientId && a.date === '2026-08-23' && a.doctorId === currentDoctorId);
    const apptId = appt ? appt.id : 'APP-1002'; // fallback

    // Set appointment status to in_progress
    const updatedAppts = appointmentList.map(a => {
      if (a.id === apptId) return { ...a, status: 'In-Progress' };
      return a;
    });
    setAppointmentList(updatedAppts);

    addAuditLog(
      'UPDATE_APPOINTMENT',
      `Called patient ${queueItem.patientName} into consultation room`,
      'null',
      JSON.stringify(queueItem)
    );

    triggerToast(`Calling ${queueItem.patientName} to console.`);
    navigateTo(`/doctor/consultation/${apptId}`);
  };

  const handleAddTreatment = (item) => {
    const exists = prescribedItems.find(p => p.code === item.code);
    if (exists) {
      setPrescribedItems(prescribedItems.map(p => p.code === item.code ? { ...p, qty: p.qty + 1 } : p));
    } else {
      setPrescribedItems([...prescribedItems, { ...item, qty: 1, instructions: '' }]);
    }
  };

  const handleRemoveTreatment = (code) => {
    setPrescribedItems(prescribedItems.filter(p => p.code !== code));
  };

  const handleUpdateQty = (code, delta) => {
    setPrescribedItems(prescribedItems.map(p => {
      if (p.code === code) {
        const nQty = p.qty + delta;
        return { ...p, qty: nQty > 0 ? nQty : 1 };
      }
      return p;
    }));
  };

  const handleUpdateInstructions = (code, val) => {
    setPrescribedItems(prescribedItems.map(p => p.code === code ? { ...p, instructions: val } : p));
  };

  const handleCompleteConsultation = (e) => {
    e.preventDefault();
    if (!complaint || !diagnosis) {
      alert('Please fill out Chief Complaint and Diagnosis fields.');
      return;
    }

    // 1. Update medical histories
    const newVisit = {
      date: '2026-08-23',
      doctor: currentDoctorName,
      diagnosis,
      vitals: `BP: ${vitals.bp} mmHg, HR: ${vitals.pulse} bpm, Temp: ${vitals.temp} F, Weight: ${vitals.weight} kg`,
      treatments: prescribedItems.map(t => ({ name: t.name, qty: t.qty, price: t.price, instructions: t.instructions }))
    };

    const patientHist = medicalHistories.find(h => h.patientId === activePatient.id);
    let updatedHistory;
    if (patientHist) {
      updatedHistory = medicalHistories.map(h => {
        if (h.patientId === activePatient.id) {
          return { ...h, visits: [newVisit, ...h.visits] };
        }
        return h;
      });
    } else {
      updatedHistory = [...medicalHistories, { patientId: activePatient.id, visits: [newVisit] }];
    }
    setMedicalHistories(updatedHistory);

    // 2. Generate billing invoice
    const docFee = parseFloat(staffList.find(s => s.id === currentDoctorId)?.details?.consultFee || '1500');
    const treatmentsTotal = prescribedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const subtotal = docFee + treatmentsTotal;

    // Estimate insurance coverage
    const hasInsurance = activePatient.insurance?.provider && activePatient.insurance?.provider !== 'None / Cash';
    const insCover = hasInsurance ? Math.min(treatmentsTotal * 0.8, 10000) : 0;
    const balance = subtotal - insCover;

    const newInvoiceId = `INV-${(invoiceList.length + 10001).toString()}`;
    const newInvoice = {
      invoiceId: newInvoiceId,
      patientId: activePatient.id,
      patientName: activePatient.name,
      date: '2026-08-23',
      items: prescribedItems.map(t => ({ name: t.name, qty: t.qty, price: t.price })),
      doctorFee: docFee,
      treatmentsSubtotal: treatmentsTotal,
      insuranceCoverage: insCover,
      patientBalance: balance,
      status: 'Pending',
      claimStatus: hasInsurance ? 'PENDING' : 'N/A'
    };

    setInvoiceList([newInvoice, ...invoiceList]);

    // 3. Mark appointment COMPLETED and remove from liveQueue
    const updatedAppts = appointmentList.map(a => {
      if (a.id === activeApptId) return { ...a, status: 'Completed' };
      return a;
    });
    setAppointmentList(updatedAppts);

    const updatedQueue = liveQueue.filter(q => q.patientId !== activePatient.id);
    setLiveQueue(updatedQueue);

    addAuditLog(
      'UPDATE_APPOINTMENT',
      `Completed consultation and issued invoice ${newInvoiceId} for ${activePatient.name}`,
      JSON.stringify(activeAppt),
      JSON.stringify({ ...activeAppt, status: 'Completed' })
    );

    triggerToast(`Consultation completed! Invoice generated.`);
    navigateTo('/doctor/workbench');
    
    // Reset forms
    setComplaint('');
    setDiagnosis('');
    setLifestyleAdvice('');
    setPrescribedItems([
      { code: 'TRT-001', name: 'General Consultation Fee', category: 'Consultations', price: 1500, qty: 1, instructions: 'Standard clinical checkup fee' }
    ]);
  };

  // Get active patient history log
  const activePatientHistory = useMemo(() => {
    if (!activePatient) return null;
    return medicalHistories.find(h => h.patientId === activePatient.id);
  }, [medicalHistories, activePatient]);

  return (
    <div className="space-y-6">
      {/* 1. DOCTOR WORKBENCH (QUEUE SUMMARY) */}
      {subView === 'workbench' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clinician Triage Workbench</h1>
            <p className="text-sm text-slate-500 mt-1">Manage waiting room queues, recall diagnostics, and open active clinical consoles</p>
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
                  {doctorQueue.map((q, idx) => (
                    <tr key={q.queueNo} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">#{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{q.patientName}</div>
                        <span className="text-xs text-slate-400 font-mono">{q.patientId}</span>
                      </td>
                      <td className="px-6 py-4 font-medium">{q.reason}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${
                          q.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-150 animate-pulse' :
                          q.status === 'WALK_IN' ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-emerald-50 text-emerald-700 border-emerald-150'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {q.status === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => {
                              const appt = appointmentList.find(a => a.patientId === q.patientId && a.date === '2026-08-23' && a.doctorId === currentDoctorId);
                              navigateTo(`/doctor/consultation/${appt ? appt.id : 'APP-1002'}`);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center space-x-1.5 cursor-pointer ml-auto shadow-xs"
                          >
                            <span>Resume Console</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCallPatient(q)}
                            className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center space-x-1.5 cursor-pointer ml-auto shadow-xs"
                          >
                            <span>Call Patient</span>
                            <CornerDownRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {doctorQueue.length === 0 && (
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

      {/* 2. ACTIVE CLINICAL CONSULTATION CONSOLE */}
      {subView === 'consultation' && activePatient && (
        <div className="space-y-6 animate-fade-in">
          {/* Clinical Banner */}
          <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 bg-white/10 text-white rounded-full flex items-center justify-center font-bold text-xl border border-white/20">
                {activePatient.name.charAt(0)}
              </div>
              <div>
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold font-mono">In Consultation</span>
                <h2 className="text-xl font-bold mt-0.5">{activePatient.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70 font-mono mt-1">
                  <span>Code: {activePatient.id}</span>
                  <span>|</span>
                  <span>DOB: {activePatient.dob}</span>
                  <span>|</span>
                  <span>Gender: {activePatient.gender}</span>
                  <span>|</span>
                  <span>NIC: {activePatient.nic}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                <span className="block text-white/50 text-[9px] uppercase tracking-wider mb-0.5 font-bold">Insurance Checking</span>
                <strong className="text-white text-xs">{activePatient.insurance?.provider || 'None'}</strong>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(true)}
                className="bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-xl px-4 py-3 font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="h-4 w-4" />
                <span>Longitudinal History</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleCompleteConsultation} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Vitals & Complaint */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3 flex items-center">
                  <Activity className="h-4.5 w-4.5 text-blue-600 mr-1.5 animate-pulse" />
                  Clinical Findings & Observations
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Blood Pressure (mmHg)</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                      value={vitals.bp}
                      onChange={e => setVitals({ ...vitals, bp: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Heart Rate (bpm)</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                      value={vitals.pulse}
                      onChange={e => setVitals({ ...vitals, pulse: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Temperature (F)</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                      value={vitals.temp}
                      onChange={e => setVitals({ ...vitals, temp: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Weight (kg)</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 font-mono text-sm"
                      value={vitals.weight}
                      onChange={e => setVitals({ ...vitals, weight: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Chief Complaint / Symptoms</label>
                    <textarea
                      required
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                      rows="2"
                      placeholder="Enter patient symptoms and complaints..."
                      value={complaint}
                      onChange={e => setComplaint(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Formal Clinical Diagnosis</label>
                    <textarea
                      required
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800"
                      rows="3"
                      placeholder="Write formal diagnoses and medical summary notes..."
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Lifestyle Advice & Remarks</label>
                    <textarea
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                      rows="2"
                      placeholder="Lifestyle recommendations, drug dosage advisories, next visit check..."
                      value={lifestyleAdvice}
                      onChange={e => setLifestyleAdvice(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptions & Catalogue */}
            <div className="space-y-6">
              {/* Prescribed catalogue */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-md">Treatment & Billings Selector</h3>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    Subtotal: ${prescribedItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search standard treatments..."
                    className="w-full border border-slate-350 rounded-lg pl-9 pr-3 py-1.5 text-xs bg-slate-50"
                    value={searchCatalogueQuery}
                    onChange={e => setSearchCatalogueQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-slate-150 p-2 rounded-lg bg-slate-50/50">
                  {filteredCatalogue.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleAddTreatment(c)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-500 text-[10px] rounded-lg font-medium cursor-pointer transition-colors text-left flex items-center"
                    >
                      + {c.name} (${c.price})
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {prescribedItems.map(item => (
                    <div key={item.code} className="space-y-1.5 pt-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="block text-slate-900 text-xs">{item.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">${item.price} each</span>
                        </div>
                        {item.code !== 'TRT-001' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTreatment(item.code)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.code, -1)}
                            className="px-1 hover:bg-slate-200 rounded cursor-pointer text-[10px] font-bold"
                          >
                            -
                          </button>
                          <span className="px-1 font-mono font-bold text-[10px]">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.code, 1)}
                            className="px-1 hover:bg-slate-200 rounded cursor-pointer text-[10px] font-bold"
                          >
                            +
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Dosage instruction (e.g. 1tds p.c.)"
                          className="border border-slate-350 rounded px-2 py-1 text-[10px] flex-1 mx-3"
                          value={item.instructions}
                          onChange={e => handleUpdateInstructions(item.code, e.target.value)}
                        />
                        <span className="font-mono font-bold text-slate-800 text-xs w-16 text-right">
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Complete & Route to Billing Desk
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* LONGITUDINAL MEDICAL HISTORY DRAWER */}
      {showHistoryDrawer && activePatient && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowHistoryDrawer(false)} />
          <div className="relative bg-white h-full w-full max-w-lg border-l border-slate-200 shadow-2xl p-8 overflow-y-auto animate-slide-in-right flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-950">Patient Longitudinal History</h3>
                <button onClick={() => setShowHistoryDrawer(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-600">
                  <span className="block text-slate-450 uppercase mb-1">Details Summary</span>
                  <strong className="text-slate-900 text-sm">{activePatient.name}</strong>
                  <span className="block mt-0.5">DOB: {activePatient.dob} | Contact: {activePatient.contact}</span>
                  <span className="block text-blue-650">Insurance provider: {activePatient.insurance?.provider || 'None / Cash'}</span>
                </div>

                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Historical Timeline Log</h4>
                <div className="relative border-l border-slate-200 ml-2.5 pl-6 space-y-6">
                  {activePatientHistory?.visits.map((v, idx) => (
                    <div key={idx} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-9.5 top-1 h-6 w-6 bg-blue-50 border border-blue-500 rounded-full flex items-center justify-center">
                        <Activity className="h-3 w-3 text-blue-600" />
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-xs text-slate-450 font-mono">
                          <span>{v.date}</span>
                          <span className="font-semibold text-slate-600">{v.doctor}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                          <div className="mb-1">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Vitals</span>
                            <strong className="text-slate-700">{v.vitals}</strong>
                          </div>
                          <div className="mb-2">
                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Diagnosis Notes</span>
                            <p className="text-slate-600 font-medium">{v.diagnosis}</p>
                          </div>
                          <div className="border-t border-slate-200 pt-2">
                            <span className="text-[10px] text-slate-450 font-semibold block uppercase mb-1">Prescribed Treatments</span>
                            {v.treatments.map((t, index) => (
                              <div key={index} className="flex justify-between text-[10px] text-slate-500 font-mono">
                                <span>{t.name} (x{t.qty}) {t.instructions ? `- "${t.instructions}"` : ''}</span>
                                <span>${(t.price * t.qty).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!activePatientHistory || activePatientHistory.visits.length === 0) && (
                    <div className="text-center text-slate-400 py-10 text-xs">
                      No previous medical history consults found across branches.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
              >
                Close Slide-out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
