import React, { useState, useEffect } from 'react';
import {
  Users, Building, Calendar, Clock, Search, Plus, Activity, FileText,
  DollarSign, TrendingUp, Download, LogOut, ClipboardList, AlertCircle,
  CheckCircle2, Lock, User, ShieldCheck, UserCheck, Menu, X, Keyboard
} from 'lucide-react';
import api from './api/axios.js';
import { useAuth } from './contexts/AuthContext.jsx';
import { getFrontendRoleCode } from './utils/authRole.js';

export const ROLE_ALLOWED_PREFIXES = {
  ROLE_ADMIN: ['/admin/', '/manager/', '/reception/', '/doctor/', '/billing/', '/portal/'],
  ROLE_BRANCH_MANAGER: ['/manager/'],
  ROLE_RECEPTIONIST: ['/reception/'],
  ROLE_NURSE: ['/reception/', '/nurse/'],
  ROLE_DOCTOR: ['/doctor/'],
  ROLE_BILLING_STAFF: ['/billing/'],
  ROLE_PATIENT: ['/portal/']
};

export function isPathAllowed(roleCode, path) {
  if (!roleCode || !path) return false;
  if (path === '/login' || path === '/') return true;
  const prefixes = ROLE_ALLOWED_PREFIXES[roleCode] || [];
  return prefixes.some(prefix => path.startsWith(prefix));
}

// Import Workspace Panels
import AdminPanel from './components/AdminPanel';
import ManagerPanel from './components/ManagerPanel';
import ReceptionPanel from './components/ReceptionPanel';
import DoctorPanel from './components/DoctorPanel';
import BillingPanel from './components/BillingPanel';
import PatientPanel from './components/PatientPanel';
import ReportsPanel from './components/ReportsPanel';
import { searchPatients, getPatient } from './services/patientService';
import { adaptPatientForPanels } from './utils/patientAdapter';
import { formatPatientId, formatPatientName } from './utils/patientFormat';

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

const INITIAL_APPOINTMENTS = [
  { id: 'APP-1001', date: '2026-08-23', time: '09:00', doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', patientId: 'PAT-0001', patientName: 'John Doe', branch: 'Colombo Main', status: 'Completed', reason: 'Chronic chest pain checkup' },
  { id: 'APP-1002', date: '2026-08-23', time: '10:30', doctorId: 'STF-002', doctorName: 'Dr. Sarah Jenkins', patientId: 'PAT-0002', patientName: 'Clara Oswald', branch: 'Kandy', status: 'Booked', reason: 'Severe throat infection' },
  { id: 'APP-1003', date: '2026-08-23', time: '14:00', doctorId: 'STF-008', doctorName: 'Dr. Nimal Perera', patientId: 'PAT-0003', patientName: 'David Miller', branch: 'Galle', status: 'Booked', reason: 'Eczema flare up' },
  { id: 'APP-1004', date: '2026-08-24', time: '11:00', doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', patientId: 'PAT-0001', patientName: 'John Doe', branch: 'Colombo Main', status: 'Booked', reason: 'ECG interpretation review' }
];

const INITIAL_QUEUE = [
  { queueNo: 1, appointmentId: 'APP-0002', appointment_id: 2, Appointment_ID: 2, patientId: 'PAT-0002', patient_id: 2, Patient_ID: 2, patientName: 'Clara Oswald', reason: 'Severe throat infection', assignedDoctor: 'Dr. Sarah Jenkins', doctorId: 'STF-002', doctor_id: 2, Doctor_ID: 2, estWaitTime: 15, room: 'Room 101', status: 'SCHEDULED' },
  { queueNo: 2, appointmentId: 'APP-0003', appointment_id: 3, Appointment_ID: 3, patientId: 'PAT-0003', patient_id: 3, Patient_ID: 3, patientName: 'David Miller', reason: 'Eczema flare up', assignedDoctor: 'Dr. Nimal Perera', doctorId: 'STF-008', doctor_id: 8, Doctor_ID: 8, estWaitTime: 35, room: 'Consultation Room B', status: 'WALK_IN' },
  { queueNo: 3, appointmentId: 'APP-0004', appointment_id: 4, Appointment_ID: 4, patientId: 'PAT-0001', patient_id: 1, Patient_ID: 1, patientName: 'John Doe', reason: 'Routine cardiovascular follow-up', assignedDoctor: 'Dr. Alexander Bennett', doctorId: 'STF-001', doctor_id: 1, Doctor_ID: 1, estWaitTime: 10, room: 'Room 105', status: 'SCHEDULED' }
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

export default function App() {
  // ==========================================
  // AUTH CONTEXT
  // ==========================================
  const { currentUser, isHydrated, login, logout } = useAuth();

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [branches, setBranches] = useState(() => {
    const saved = localStorage.getItem('catms_branches');
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [staffList, setStaffList] = useState(() => {
    const saved = localStorage.getItem('catms_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [patientList, setPatientList] = useState([]);
  const [patientsVersion, setPatientsVersion] = useState(0);

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

  // Fetch real data from backend API
  useEffect(() => {
    if (currentUser) {
      api.get('/branches').then(res => {
        if (res.data && res.data.length > 0) setBranches(res.data);
      }).catch(err => console.error("API Error (Branches):", err));

      api.get('/staff').then(res => {
        if (res.data && res.data.length > 0) {
          // Map backend staff schema to frontend format
          const mapped = res.data.map(s => ({
            id: `STF-${s.Staff_ID}`,
            Staff_ID: s.Staff_ID,
            staffId: s.Staff_ID,
            Account_ID: s.Account_ID,
            name: `${s.First_Name} ${s.Last_Name}`,
            role: s.Job_Title,
            branch: branches.find(b => b.Branch_ID === s.Branch_ID)?.Branch_Name || 'Colombo Main',
            Branch_ID: s.Branch_ID,
            status: s.Employment_Status,
            details: { email: s.Email, contact: s.Contact_Number }
          }));
          setStaffList(mapped);
        }
      }).catch(err => console.error("API Error (Staff):", err));

      if (currentUser.roleCode === 'ROLE_ADMIN') {
        api.get('/audit-logs').then(res => {
          if (res.data && res.data.length > 0) {
            const mapped = res.data.map(log => ({
              id: `AUD-${log.Audit_ID}`,
              timestamp: log.Timestamp,
              userId: log.Account_ID.toString(),
              username: 'System User',
              branch: 'Global',
              action: log.Action_Type,
              details: `Table: ${log.Table_Name}, Record: ${log.Record_ID}`,
              before: log.Old_Value ? JSON.stringify(log.Old_Value) : 'null',
              after: log.New_Value ? JSON.stringify(log.New_Value) : 'null'
            }));
            setAuditLogs(mapped);
          }
        }).catch(err => console.error("API Error (Audit):", err));
      }
    }
  }, [currentUser]);

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

  // load patients from the backend for the panels that still read patientList
  useEffect(() => {
    if (!currentUser) return;
    let isCurrent = true;
    searchPatients('', 1, 50)
      .then(res => Promise.allSettled((res.items || []).map(p => getPatient(p.patient_id))))
      .then(results => {
        if (!isCurrent) return;
        const full = results
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value);
        setPatientList(full.map(adaptPatientForPanels));
      })
      .catch(() => isCurrent && setPatientList([]));
    return () => {
      isCurrent = false;
    };
  }, [currentUser, patientsVersion]);

  const reloadPatients = () => setPatientsVersion(v => v + 1);

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
    // Wait for hydration before running route checks to prevent redirect loops
    if (!isHydrated) return;

    // If not logged in, enforce /login
    if (!currentUser) {
      if (currentPath !== '/login') {
        navigateTo('/login');
      }
    } else {
      // If at login, root, or unauthorized path, redirect to role default path
      if (currentPath === '/login' || currentPath === '/' || !isPathAllowed(currentUser.roleCode, currentPath)) {
        navigateTo(getRoleDefaultPath(currentUser.roleCode));
      }
    }
  }, [currentUser, currentPath, isHydrated]);

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

  // global search asks the backend after a short pause
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!globalSearchQuery) {
      setSearchResults([]);
      return;
    }
    let isCurrent = true;
    const timer = setTimeout(() => {
      searchPatients(globalSearchQuery, 1, 8)
        .then(res => isCurrent && setSearchResults(res.items || []))
        .catch(() => isCurrent && setSearchResults([]));
    }, 300);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [globalSearchQuery]);

  // ==========================================
  // AUTHENTICATION HANDLERS
  // ==========================================
  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const result = await login(emailInput, passwordInput);
      if (result?.success) {
        setAuthError('');
        setEmailInput('');
        setPasswordInput('');
        triggerToast(result.isDemo ? `Authenticated as ${result.user.role} (Demo mode)!` : 'Authenticated successfully!');
        navigateTo(getRoleDefaultPath(result.user.roleCode));
      }
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError('Invalid credentials. Check username or password.');
    }
  };

  const handleLogout = () => {
    logout();
    triggerToast('Session invalidated. Redirecting...');
    navigateTo('/login');
  };


  // State bundle pack
  const db = { staffList, patientList, appointmentList, liveQueue, invoiceList, auditLogs, branches, currentUser, selectedBranch, medicalHistories };
  const handlers = { setStaffList, setAppointmentList, setLiveQueue, setInvoiceList, setMedicalHistories, setAuditLogs, setBranches, addAuditLog, triggerToast, navigateTo, reloadPatients };

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
              CareFlow <span className="text-blue-600">CATMS</span>
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

            <form className="space-y-4" onSubmit={handleSignIn} noValidate>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address / Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="username or name@careflow.com"
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
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/admin/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Executive Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/staff')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/admin/staff' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Staff Directory</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/branches')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/admin/branches' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Clinic Branches</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/audit-logs')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/admin/audit-logs' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <ClipboardList className="h-4.5 w-4.5" />
                  <span>Security Audit Logs</span>
                </button>
                <button
                  onClick={() => navigateTo('/admin/reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/admin/reports' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
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
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/manager/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Branch Operations</span>
                </button>
                <button
                  onClick={() => navigateTo('/manager/roster')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/manager/roster' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Doctor Roster Planner</span>
                </button>
                <button
                  onClick={() => navigateTo('/manager/staff')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/manager/staff' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Local Staff Directory</span>
                </button>
                <button
                  onClick={() => navigateTo('/manager/reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/manager/reports' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
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
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/reception/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <ClipboardList className="h-4.5 w-4.5" />
                  <span>Triage Workbench</span>
                </button>
                <button
                  onClick={() => navigateTo('/reception/patients')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/reception/patients' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  <span>Patient Registry</span>
                </button>
                <button
                  onClick={() => navigateTo('/reception/appointments')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/reception/appointments' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Schedules Calendar</span>
                </button>
                <button
                  onClick={() => navigateTo('/reception/walkin')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/reception/walkin' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
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
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/doctor/workbench' || currentPath.startsWith('/doctor/consultation') ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Activity className="h-4.5 w-4.5" />
                  <span>Consult Workbench</span>
                </button>
                <button
                  onClick={() => navigateTo('/doctor/appointments')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/doctor/appointments' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Upcoming Bookings</span>
                </button>
              </>
            )}

            {currentUser.roleCode === 'ROLE_BILLING_STAFF' && (
              <>
                <button
                  onClick={() => navigateTo('/billing/dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/billing/dashboard' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <DollarSign className="h-4.5 w-4.5" />
                  <span>Billing Desk</span>
                </button>
                <button
                  onClick={() => navigateTo('/billing/invoices')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/billing/invoices' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span>Invoice Ledger</span>
                </button>
                <button
                  onClick={() => navigateTo('/billing/claims')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/billing/claims' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>Insurance Claims</span>
                </button>
                <button
                  onClick={() => navigateTo('/billing/reports')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/billing/reports' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
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
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/portal/home' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Building className="h-4.5 w-4.5" />
                  <span>Home Dashboard</span>
                </button>
                <button
                  onClick={() => navigateTo('/portal/book')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/portal/book' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <Calendar className="h-4.5 w-4.5" />
                  <span>Self Booking Wizard</span>
                </button>
                <button
                  onClick={() => navigateTo('/portal/medical-history')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/portal/medical-history' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                  <span>My Consultations</span>
                </button>
                <button
                  onClick={() => navigateTo('/portal/billing')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${currentPath === '/portal/billing' ? 'bg-blue-600 text-white' : 'text-slate-450 hover:bg-slate-900 hover:text-white'
                    }`}
                >
                  <DollarSign className="h-4.5 w-4.5" />
                  <span>My Receipts</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Session Info */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Active Session
          </div>
          <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>{currentUser.roleCode.replace('ROLE_', '')}</span>
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

            // Enforce role-versus-path workspace guard
            if (!isPathAllowed(currentUser.roleCode, path)) {
              return (
                <div className="bg-white border border-red-200 rounded-xl p-10 text-center text-slate-700 shadow-xs">
                  <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 text-lg">Access Denied</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your account role ({currentUser.roleCode.replace('ROLE_', '')}) does not have permission to access {path}.
                  </p>
                  <button
                    onClick={() => navigateTo(getRoleDefaultPath(currentUser.roleCode))}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Return to My Workspace
                  </button>
                </div>
              );
            }

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
                  key={p.patient_id}
                  onClick={() => {
                    // Navigate depending on user role
                    if (currentUser.roleCode === 'ROLE_RECEPTIONIST') {
                      navigateTo('/reception/patients');
                    } else if (currentUser.roleCode === 'ROLE_DOCTOR') {
                      navigateTo('/doctor/workbench');
                    }
                    setGlobalSearchOpen(false);
                    triggerToast(`Selected patient ${formatPatientName(p.first_name, p.last_name)}`);
                  }}
                  className="p-3 border border-slate-200 hover:border-blue-500 rounded-xl bg-slate-50/50 hover:bg-white transition-all cursor-pointer text-left"
                >
                  <div className="flex justify-between items-center font-sans text-xs">
                    <span className="font-bold text-slate-900 text-sm">{formatPatientName(p.first_name, p.last_name)}</span>
                    <span className="font-mono text-slate-450">{formatPatientId(p.patient_id)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-450 mt-2 font-mono">
                    <span>NIC: {p.nic}</span>
                    <span>Contact: {p.contact_number}</span>
                    <span>Registered: {p.registration_date}</span>
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
