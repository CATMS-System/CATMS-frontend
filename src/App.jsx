import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Building, Calendar, Clock, Search, Plus, Activity, FileText, 
  DollarSign, TrendingUp, Download, LogOut, ClipboardList, AlertCircle, 
  CheckCircle2, Lock, User, ShieldCheck, UserCheck, Menu, X, Keyboard
} from 'lucide-react';

// Import Workspace Panels
import AdminPanel from './components/AdminPanel';
import ManagerPanel from './components/ManagerPanel';
import ReceptionPanel from './components/ReceptionPanel';
import DoctorPanel from './components/DoctorPanel';
import BillingPanel from './components/BillingPanel';
import PatientPanel from './components/PatientPanel';
import ReportsPanel from './components/ReportsPanel';

// ==========================================
// INITIAL MOCK DATA CONFIGURATIONS
// ==========================================
const INITIAL_BRANCHES = [
  { name: 'Colombo Main', address: '100 Galle Rd, Colombo 03', phone: '+94 11 234 5678', managerId: 'STF-004', managerName: 'Marcus Vance' },
  { name: 'Kandy', address: '25 Peradeniya Rd, Kandy', phone: '+94 81 223 4567', managerId: 'STF-006', managerName: 'Samantha Silva' },
  { name: 'Galle', address: '45 Wackwella Rd, Galle', phone: '+94 91 222 3456', managerId: 'STF-007', managerName: 'Rohan De Silva' }
];

const INITIAL_STAFF = [
  { id: 'STF-001', name: 'Dr. Alexander Bennett', role: 'Cardiologist', branch: 'Colombo Main', status: 'Active', details: { email: 'bennett@careflow.com', contact: '+94 77 111 2222', license: 'SLMC-88321', consultFee: 2500, specialties: ['Cardiology'] } },
  { id: 'STF-002', name: 'Dr. Sarah Jenkins', role: 'General Practitioner', branch: 'Kandy', status: 'Active', details: { email: 'jenkins@careflow.com', contact: '+94 77 333 4444', license: 'SLMC-77492', consultFee: 1500, specialties: ['General Medicine'] } },
  { id: 'STF-003', name: 'Nurse Emily Chen', role: 'Lead Triage Nurse', branch: 'Colombo Main', status: 'Active', details: { email: 'chen@careflow.com', contact: '+94 77 555 6666' } },
  { id: 'STF-004', name: 'Marcus Vance', role: 'Branch Manager', branch: 'Colombo Main', status: 'Active', details: { email: 'vance@careflow.com', contact: '+94 77 777 8888' } },
  { id: 'STF-005', name: 'Sophia Patel', role: 'Lead Billing Clerk', branch: 'Colombo Main', status: 'Active', details: { email: 'patel@careflow.com', contact: '+94 77 999 0000' } },
  { id: 'STF-006', name: 'Samantha Silva', role: 'Branch Manager', branch: 'Kandy', status: 'Active', details: { email: 'silva@careflow.com', contact: '+94 81 222 3333' } },
  { id: 'STF-007', name: 'Rohan De Silva', role: 'Branch Manager', branch: 'Galle', status: 'Active', details: { email: 'rohan@careflow.com', contact: '+94 91 333 4444' } },
  { id: 'STF-008', name: 'Dr. Nimal Perera', role: 'Dermatologist', branch: 'Galle', status: 'Active', details: { email: 'nimal@careflow.com', contact: '+94 71 456 7890', license: 'SLMC-66321', consultFee: 2000, specialties: ['Dermatology'] } }
];

const INITIAL_PATIENTS = [
  {
    id: 'PAT-0001',
    name: 'John Doe',
    dob: '1985-05-12',
    nic: '852140938V',
    contact: '+94 77 123 4567',
    address: '12 Flat, Galle Road, Colombo',
    branch: 'Colombo Main',
    insurance: { provider: 'Union Assurance', policyNumber: 'UA-88321-A', expDate: '2027-12-31' },
    emergencyContacts: [{ name: 'Jane Doe', relation: 'Spouse', phone: '+94 77 123 4568' }]
  },
  {
    id: 'PAT-0002',
    name: 'Clara Oswald',
    dob: '1992-11-23',
    nic: '923281029V',
    contact: '+94 77 987 6543',
    address: '45 Lake Round, Kandy',
    branch: 'Kandy',
    insurance: { provider: 'Softlogic Life', policyNumber: 'SL-99321-B', expDate: '2026-06-30' },
    emergencyContacts: [{ name: 'Danny Pink', relation: 'Friend', phone: '+94 77 987 6544' }]
  },
  {
    id: 'PAT-0003',
    name: 'David Miller',
    dob: '1970-02-08',
    nic: '700392109V',
    contact: '+94 71 456 7890',
    address: '78 Fort View, Galle',
    branch: 'Galle',
    insurance: { provider: 'Sri Lanka Insurance', policyNumber: 'SLIC-3341', expDate: '2025-08-23' },
    emergencyContacts: [{ name: 'Susan Miller', relation: 'Wife', phone: '+94 71 456 7891' }]
  }
];

const INITIAL_APPOINTMENTS = [
  { id: 'APP-1001', date: '2026-08-23', time: '09:00', doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', patientId: 'PAT-0001', patientName: 'John Doe', branch: 'Colombo Main', status: 'Completed', reason: 'Chronic chest pain checkup' },
  { id: 'APP-1002', date: '2026-08-23', time: '10:30', doctorId: 'STF-002', doctorName: 'Dr. Sarah Jenkins', patientId: 'PAT-0002', patientName: 'Clara Oswald', branch: 'Kandy', status: 'Booked', reason: 'Severe throat infection' },
  { id: 'APP-1003', date: '2026-08-23', time: '14:00', doctorId: 'STF-008', doctorName: 'Dr. Nimal Perera', patientId: 'PAT-0003', patientName: 'David Miller', branch: 'Galle', status: 'Booked', reason: 'Eczema flare up' },
  { id: 'APP-1004', date: '2026-08-24', time: '11:00', doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', patientId: 'PAT-0001', patientName: 'John Doe', branch: 'Colombo Main', status: 'Booked', reason: 'ECG interpretation review' }
];

const INITIAL_QUEUE = [
  { queueNo: 1, patientId: 'PAT-0002', patientName: 'Clara Oswald', reason: 'Severe throat infection', assignedDoctor: 'Dr. Sarah Jenkins', doctorId: 'STF-002', estWaitTime: 15, room: 'Room 101', status: 'SCHEDULED' },
  { queueNo: 2, patientId: 'PAT-0003', patientName: 'David Miller', reason: 'Eczema flare up', assignedDoctor: 'Dr. Nimal Perera', doctorId: 'STF-008', estWaitTime: 35, room: 'Consultation Room B', status: 'WALK_IN' },
  { queueNo: 3, patientId: 'PAT-0001', patientName: 'John Doe', reason: 'Routine cardiovascular follow-up', assignedDoctor: 'Dr. Alexander Bennett', doctorId: 'STF-001', estWaitTime: 10, room: 'Room 105', status: 'SCHEDULED' }
];

const INITIAL_INVOICES = [
  { invoiceId: 'INV-10001', patientId: 'PAT-0001', patientName: 'John Doe', date: '2026-08-23', items: [{ name: 'ECG / Electrocardiogram', qty: 1, price: 5000 }], doctorFee: 2500, treatmentsSubtotal: 5000, insuranceCoverage: 6000, patientBalance: 1500, status: 'Paid', claimStatus: 'SETTLED', paymentMethod: 'Card' },
  { invoiceId: 'INV-10002', patientId: 'PAT-0002', patientName: 'Clara Oswald', date: '2026-08-23', items: [{ name: 'Blood Sugar Rapid Test', qty: 2, price: 600 }], doctorFee: 1500, treatmentsSubtotal: 1200, insuranceCoverage: 0, patientBalance: 2700, status: 'Partially Paid', claimStatus: 'PENDING', paymentMethod: 'Cash' },
  { invoiceId: 'INV-10003', patientId: 'PAT-0003', patientName: 'David Miller', date: '2026-08-22', items: [{ name: 'Chest X-Ray Digital', qty: 1, price: 8000 }], doctorFee: 2000, treatmentsSubtotal: 8000, insuranceCoverage: 0, patientBalance: 10000, status: 'Unpaid', claimStatus: 'PENDING', paymentMethod: '' }
];

const INITIAL_HISTORY = [
  {
    patientId: 'PAT-0001',
    visits: [
      {
        date: '2026-08-23',
        doctor: 'Dr. Alexander Bennett',
        diagnosis: 'Mild cardiac valve regurgitation. Advised daily checkups.',
        vitals: 'BP: 132/82 mmHg, HR: 74 bpm, Temp: 98.4 F, Weight: 72 kg',
        treatments: [
          { name: 'General Consultation Fee', qty: 1, price: 2500 },
          { name: 'ECG / Electrocardiogram', qty: 1, price: 5000 }
        ]
      }
    ]
  }
];

const INITIAL_AUDITS = [
  { id: 'AUD-001', timestamp: '2026-08-23 09:15:32', userId: 'admin@careflow.com', username: 'System Admin', branch: 'Colombo Main', action: 'CREATE_STAFF', details: 'Created staff member Dr. Nimal Perera (STF-008)', before: 'null', after: '{"id":"STF-008","name":"Dr. Nimal Perera","role":"Dermatologist","branch":"Galle","status":"Active"}' },
  { id: 'AUD-002', timestamp: '2026-08-23 10:20:00', userId: 'doctor@careflow.com', username: 'Dr. Alexander Bennett', branch: 'Colombo Main', action: 'UPDATE_APPOINTMENT', details: 'Completed consultation John Doe (PAT-0001)', before: '{"status":"Booked"}', after: '{"status":"Completed"}' }
];

// Available demo users and their profiles (JWT payload simulations)
const DEMO_LOGINS = [
  { role: 'Admin', roleCode: 'ROLE_ADMIN', email: 'admin@careflow.com', password: 'admin123', name: 'Alana Smith [Admin]', branch: 'All Branches' },
  { role: 'Branch Manager', roleCode: 'ROLE_BRANCH_MANAGER', email: 'manager@careflow.com', password: 'manager123', name: 'Marcus Vance [Manager]', branch: 'Colombo Main' },
  { role: 'Receptionist', roleCode: 'ROLE_RECEPTIONIST', email: 'receptionist@careflow.com', password: 'recept123', name: 'Shenaya Perera [Recept]', branch: 'Colombo Main' },
  { role: 'Doctor', roleCode: 'ROLE_DOCTOR', email: 'doctor@careflow.com', password: 'doc123', name: 'Dr. Alexander Bennett [Doc]', branch: 'Colombo Main', id: 'STF-001' },
  { role: 'Billing Staff', roleCode: 'ROLE_BILLING_STAFF', email: 'billing@careflow.com', password: 'bill123', name: 'Dilhani Fernando [Billing]', branch: 'Colombo Main' },
  { role: 'Patient', roleCode: 'ROLE_PATIENT', email: 'patient@careflow.com', password: 'pat123', name: 'John Doe [Patient]', patientId: 'PAT-0001' }
];

export default function App() {
  // ==========================================
  // PERSISTED STATES
  // ==========================================
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('catms_user');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.name && parsed.roleCode) {
        return parsed;
      }
    } catch (e) {}
    return null;
  });

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [branches, setBranches] = useState(() => {
    const saved = localStorage.getItem('catms_branches');
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [staffList, setStaffList] = useState(() => {
    const saved = localStorage.getItem('catms_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [patientList, setPatientList] = useState(() => {
    const saved = localStorage.getItem('catms_patients');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [appointmentList, setAppointmentList] = useState(() => {
    const saved = localStorage.getItem('catms_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [liveQueue, setLiveQueue] = useState(() => {
    const saved = localStorage.getItem('catms_queue');
    return saved ? JSON.parse(saved) : INITIAL_QUEUE;
  });

  const [invoiceList, setInvoiceList] = useState(() => {
    const saved = localStorage.getItem('catms_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [medicalHistories, setMedicalHistories] = useState(() => {
    const saved = localStorage.getItem('catms_history');
    return saved ? JSON.parse(saved) : INITIAL_HISTORY;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('catms_audits');
    return saved ? JSON.parse(saved) : INITIAL_AUDITS;
  });

  // Global UX settings
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('catms_branches', JSON.stringify(branches));
  }, [branches]);
  useEffect(() => {
    localStorage.setItem('catms_staff', JSON.stringify(staffList));
  }, [staffList]);
  useEffect(() => {
    localStorage.setItem('catms_patients', JSON.stringify(patientList));
  }, [patientList]);
  useEffect(() => {
    localStorage.setItem('catms_appointments', JSON.stringify(appointmentList));
  }, [appointmentList]);
  useEffect(() => {
    localStorage.setItem('catms_queue', JSON.stringify(liveQueue));
  }, [liveQueue]);
  useEffect(() => {
    localStorage.setItem('catms_invoices', JSON.stringify(invoiceList));
  }, [invoiceList]);
  useEffect(() => {
    localStorage.setItem('catms_history', JSON.stringify(medicalHistories));
  }, [medicalHistories]);
  useEffect(() => {
    localStorage.setItem('catms_audits', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // ==========================================
  // SPA ROUTING MANAGEMENT
  // ==========================================
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Redirect to correct dashboard based on role on login
  const getRoleDefaultPath = (role) => {
    switch (role) {
      case 'ROLE_ADMIN': return '/admin/dashboard';
      case 'ROLE_BRANCH_MANAGER': return '/manager/dashboard';
      case 'ROLE_RECEPTIONIST': return '/reception/dashboard';
      case 'ROLE_DOCTOR': return '/doctor/workbench';
      case 'ROLE_BILLING_STAFF': return '/billing/dashboard';
      case 'ROLE_PATIENT': return '/portal/home';
      default: return '/login';
    }
  };

  useEffect(() => {
    // If not logged in, enforce /login
    if (!currentUser) {
      if (currentPath !== '/login') {
        navigateTo('/login');
      }
    } else {
      // If at login or root, redirect to role home
      if (currentPath === '/login' || currentPath === '/') {
        navigateTo(getRoleDefaultPath(currentUser.roleCode));
      }
    }
  }, [currentUser, currentPath]);

  // ==========================================
  // GLOBAL HOTKEYS & UTILITIES
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const addAuditLog = (action, details, before = 'null', after = 'null') => {
    const newLog = {
      id: `AUD-${(auditLogs.length + 1).toString().padStart(3, '0')}`,
      timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
      userId: currentUser ? currentUser.email : 'system@careflow.com',
      username: currentUser ? currentUser.name : 'System Scheduler',
      branch: currentUser ? currentUser.branch : 'All Branches',
      action,
      details,
      before,
      after
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  // Switch default branch lock when user changes
  useEffect(() => {
    if (currentUser) {
      setSelectedBranch(currentUser.branch || 'All Branches');
    }
  }, [currentUser]);

  // Global search filtering
  const searchResults = useMemo(() => {
    if (!globalSearchQuery) return [];
    const query = globalSearchQuery.toLowerCase();
    return patientList.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.contact.toLowerCase().includes(query) ||
      p.nic.toLowerCase().includes(query)
    );
  }, [patientList, globalSearchQuery]);

  // ==========================================
  // AUTHENTICATION HANDLERS
  // ==========================================
  const handleSignIn = (e) => {
    e.preventDefault();
    const user = DEMO_LOGINS.find(u => u.email.toLowerCase() === emailInput.toLowerCase() && u.password === passwordInput);
    if (user) {
      localStorage.setItem('catms_user', JSON.stringify(user));
      setCurrentUser(user);
      setAuthError('');
      setEmailInput('');
      setPasswordInput('');
      triggerToast(`Authenticated successfully as ${user.role}!`);
      navigateTo(getRoleDefaultPath(user.roleCode));
    } else {
      setAuthError('Invalid credentials. Check email or password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('catms_user');
    setCurrentUser(null);
    triggerToast('Session invalidated. Redirecting...');
    navigateTo('/login');
  };

  // Developer rapid role swapper (claim bypass switcher)
  const handleQuickSwitchRole = (roleCode) => {
    const targetUser = DEMO_LOGINS.find(u => u.roleCode === roleCode);
    if (targetUser) {
      localStorage.setItem('catms_user', JSON.stringify(targetUser));
      setCurrentUser(targetUser);
      triggerToast(`Bypassed to role: ${targetUser.role}`);
      navigateTo(getRoleDefaultPath(targetUser.roleCode));
    }
  };

  // State bundle pack
  const db = { staffList, patientList, appointmentList, liveQueue, invoiceList, auditLogs, branches, currentUser, selectedBranch, medicalHistories };
  const handlers = { setStaffList, setPatientList, setAppointmentList, setLiveQueue, setInvoiceList, setMedicalHistories, setAuditLogs, setBranches, addAuditLog, triggerToast, navigateTo };

  // ==========================================
  // RENDER COORDINATOR
  // ==========================================
  
  // 1. AUTH PORTAL (Logged out view)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center items-center space-x-2.5">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg animate-pulse">
              <Activity className="h-6 w-6" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              CareFlow <span className="text-blue-600">OS</span>
            </span>
          </div>
          <h2 className="mt-4 text-sm font-medium text-slate-500 uppercase tracking-widest">
            Clinic Appointment & Treatment Management System
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-200 shadow-2xl rounded-2xl sm:px-10 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 text-center border-b border-slate-100 pb-3">
              Staff Portal Authentication
            </h3>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center space-x-2 text-xs">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSignIn}>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address / Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="name@careflow.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Secure Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs"
              >
                Sign In to System
              </button>
            </form>

            <div className="pt-6 border-t border-slate-200">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                Demo Accounts Quick-Login Selector
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_LOGINS.map((demo) => (
                  <button
                    key={demo.role}
                    onClick={() => {
                      setEmailInput(demo.email);
                      setPasswordInput(demo.password);
                    }}
                    className="p-2.5 border border-slate-200 rounded-xl text-left hover:bg-slate-50 hover:border-slate-300 transition-all text-xs cursor-pointer shadow-2xs"
                  >
                    <span className="font-bold text-slate-900 block">{demo.role}</span>
                    <span className="text-slate-400 truncate block font-mono text-[9px]">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN APP SHELL (Logged in views)
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-900">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4.5 py-3.5 rounded-xl shadow-2xl border border-slate-800 flex items-center space-x-2.5 text-xs animate-bounce font-medium">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Sidebar Navigation */}
      <aside className="w-64 fixed top-0 bottom-0 left-0 bg-slate-950 text-white flex flex-col justify-between z-10 border-r border-slate-900">
        <div>
          {/* Logo brand */}
          <div className="px-6 py-5 border-b border-slate-900 flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">CareFlow CATMS</span>
          </div>

          {/* Navigation Links based on user claims */}
          <nav className="mt-6 px-4 space-y-1.5">
            {currentUser.roleCode === 'ROLE_ADMIN' && (
              <>
                <button
                  onClick={() => navigateTo('/admin/dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/admin/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Executive Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/staff')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/admin/staff' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Staff Directory</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/branches')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/admin/branches' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Clinic Branches</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/audit-logs')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/admin/audit-logs' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <ClipboardList className="h-4.5 w-4.5" />
                  <span>Security Audit Logs</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/admin/reports' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-4.5 w-4.5" />
                  <span>Reports Suite</span>
                </button>
              </>
            )}

            {currentUser.roleCode === 'ROLE_BRANCH_MANAGER' && (
              <>
                <button
                  onClick={() => navigateTo('/manager/dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/manager/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Branch Operations</span>
                </button>
                <button
                  onClick={() => navigateTo('/manager/roster')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/manager/roster' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Doctor Roster Planner</span>
                </button>
                <button
                  onClick={() => navigateTo('/manager/staff')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/manager/staff' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Local Staff Directory</span>
                </button>
                <button
                  onClick={() => navigateTo('/manager/reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/manager/reports' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-4.5 w-4.5" />
                  <span>Branch Reports</span>
                </button>
              </>
            )}

            {currentUser.roleCode === 'ROLE_RECEPTIONIST' && (
              <>
                <button
                  onClick={() => navigateTo('/reception/dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/reception/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <ClipboardList className="h-4.5 w-4.5" />
                  <span>Triage Workbench</span>
                </button>
                <button
                  onClick={() => navigateTo('/reception/patients')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/reception/patients' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Patient Registry</span>
                </button>
                <button
                  onClick={() => navigateTo('/reception/appointments')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/reception/appointments' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Schedules Calendar</span>
                </button>
                <button
                  onClick={() => navigateTo('/reception/walkin')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/reception/walkin' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Clock className="h-4.5 w-4.5" />
                  <span>Walk-in Intake</span>
                </button>
              </>
            )}

            {currentUser.roleCode === 'ROLE_DOCTOR' && (
              <>
                <button
                  onClick={() => navigateTo('/doctor/workbench')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath.startsWith('/doctor/') ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Activity className="h-4.5 w-4.5" />
                  <span>Consult Workbench</span>
                </button>
              </>
            )}

            {currentUser.roleCode === 'ROLE_BILLING_STAFF' && (
              <>
                <button
                  onClick={() => navigateTo('/billing/dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/billing/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <DollarSign className="h-4.5 w-4.5" />
                  <span>Billing Desk</span>
                </button>
                <button
                  onClick={() => navigateTo('/billing/invoices')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/billing/invoices' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span>Invoice Ledger</span>
                </button>
                <button
                  onClick={() => navigateTo('/billing/claims')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/billing/claims' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>Insurance Claims</span>
                </button>
                <button
                  onClick={() => navigateTo('/billing/reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/billing/reports' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <TrendingUp className="h-4.5 w-4.5" />
                  <span>Finance Reports</span>
                </button>
              </>
            )}

            {currentUser.roleCode === 'ROLE_PATIENT' && (
              <>
                <button
                  onClick={() => navigateTo('/portal/home')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/portal/home' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Home Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('/portal/book')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/portal/book' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Self Booking Wizard</span>
                </button>
                <button
                  onClick={() => navigateTo('/portal/medical-history')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/portal/medical-history' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span>My Consultations</span>
                </button>
                <button
                  onClick={() => navigateTo('/portal/billing')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    currentPath === '/portal/billing' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <DollarSign className="h-4.5 w-4.5" />
                  <span>My Receipts</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* System log details */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50 space-y-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
            Role Bypasses (Bypass Switcher)
          </div>
          <div className="grid grid-cols-2 gap-1 text-[9px] font-semibold">
            {DEMO_LOGINS.map(demo => (
              <button
                key={demo.role}
                onClick={() => handleQuickSwitchRole(demo.roleCode)}
                className={`py-1 border rounded text-center transition-all cursor-pointer ${
                  currentUser.roleCode === demo.roleCode ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-transparent border-slate-800 text-slate-450 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {demo.role.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        
        {/* Global Top Header Bar */}
        <header className="bg-white border-b border-slate-200 h-16 px-8 flex justify-between items-center shrink-0 z-20 shadow-xs">
          <div className="flex items-center space-x-4">
            {/* Brand Logo Identity */}
            <span className="text-sm font-bold text-slate-800 tracking-tight">CareFlow CATMS</span>

            {/* Active Branch Switcher */}
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center space-x-1.5">
              {currentUser.roleCode === 'ROLE_ADMIN' ? (
                <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50/50">
                  <Building className="h-4 w-4 text-slate-400" />
                  <select
                    className="border-none bg-transparent rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                  >
                    <option value="All Branches">All Branches</option>
                    <option value="Colombo Main">Colombo Main</option>
                    <option value="Kandy">Kandy</option>
                    <option value="Galle">Galle</option>
                  </select>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span>Branch: <strong>{currentUser.branch || 'None'}</strong> [Locked]</span>
                </span>
              )}
            </div>
          </div>

          {/* Center search indicator button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setGlobalSearchOpen(true)}
              className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-xs text-slate-450 hover:bg-slate-100 hover:border-slate-300 transition-all font-medium cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search Patient Code / Name...</span>
              <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-2xs">Ctrl + K</kbd>
            </button>

            {/* User Profile & Badge */}
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>{currentUser.name.split(' [')[0]}</span>
                  <span className="bg-slate-100 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    {currentUser.roleCode.replace('ROLE_', '')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{currentUser.email}</span>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                title="Instant Logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Work Area Container */}
        <main className="max-w-7xl mx-auto w-full px-8 py-8 flex-1">
          {(() => {
            // Simple path routing mapping
            const path = currentPath;
            
            if (path.startsWith('/admin/')) {
              const subView = path.replace('/admin/', '');
              return <AdminPanel subView={subView} db={db} handlers={handlers} />;
            }
            if (path.startsWith('/manager/')) {
              const subView = path.replace('/manager/', '');
              return <ManagerPanel subView={subView} db={db} handlers={handlers} />;
            }
            if (path.startsWith('/reception/')) {
              const subView = path.replace('/reception/', '');
              return <ReceptionPanel subView={subView} db={db} handlers={handlers} />;
            }
            if (path.startsWith('/doctor/')) {
              if (path.startsWith('/doctor/consultation/')) {
                const paramId = path.replace('/doctor/consultation/', '');
                return <DoctorPanel subView="consultation" paramId={paramId} db={db} handlers={handlers} />;
              }
              const subView = path.replace('/doctor/', '');
              return <DoctorPanel subView={subView} db={db} handlers={handlers} />;
            }
            if (path.startsWith('/billing/')) {
              const subView = path.replace('/billing/', '');
              return <BillingPanel subView={subView} db={db} handlers={handlers} />;
            }
            if (path.startsWith('/portal/')) {
              const subView = path.replace('/portal/', '');
              return <PatientPanel subView={subView} db={db} handlers={handlers} />;
            }
            // Fallback default view
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-450">
                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-bounce" />
                <h3 className="font-bold text-slate-800">Workspace View Not Found</h3>
                <p className="text-xs text-slate-400 mt-1">Please select one of the sidebar workspaces to begin operations.</p>
              </div>
            );
          })()}
        </main>
      </div>

      {/* ==========================================
          GLOBAL OVERLAY MODALS
          ========================================== */}
      
      {/* GLOBAL PATIENT SEARCH MODAL (Ctrl+K) */}
      {globalSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setGlobalSearchOpen(false)} />
          <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Search Input bar */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 relative flex items-center">
              <Search className="h-5 w-5 text-slate-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Type Patient ID, NIC, or Name to lookup..."
                className="w-full bg-transparent border-none text-sm font-semibold focus:outline-none"
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
              />
              <button
                onClick={() => setGlobalSearchOpen(false)}
                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-650 px-2 py-1 rounded font-bold font-mono transition-all cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-4 space-y-2">
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    // Navigate depending on user role
                    if (currentUser.roleCode === 'ROLE_RECEPTIONIST') {
                      navigateTo('/reception/patients');
                    } else if (currentUser.roleCode === 'ROLE_DOCTOR') {
                      navigateTo('/doctor/workbench');
                    }
                    setGlobalSearchOpen(false);
                    triggerToast(`Selected patient ${p.name}`);
                  }}
                  className="p-3 border border-slate-200 hover:border-blue-500 rounded-xl bg-slate-50/50 hover:bg-white transition-all cursor-pointer text-left"
                >
                  <div className="flex justify-between items-center font-sans text-xs">
                    <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                    <span className="font-mono text-slate-450">{p.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-450 mt-2 font-mono">
                    <span>NIC: {p.nic}</span>
                    <span>Contact: {p.contact}</span>
                    <span>Branch: {p.branch}</span>
                  </div>
                </div>
              ))}
              {globalSearchQuery && searchResults.length === 0 && (
                <div className="text-center text-slate-400 text-xs py-8 font-sans">
                  No cross-branch patients matched your query.
                </div>
              )}
              {!globalSearchQuery && (
                <div className="text-center text-slate-400 text-xs py-8 font-sans flex flex-col items-center space-y-2.5">
                  <Keyboard className="h-8 w-8 text-slate-300" />
                  <span>Start typing to search global patient files instantly...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
