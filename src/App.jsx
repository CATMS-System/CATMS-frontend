import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ensureMotionSafeEnv } from './theme/designSystem';
import {
  Users, Building, Calendar, Clock, Search, Plus, Activity, FileText,
  DollarSign, TrendingUp, Download, LogOut, ClipboardList, AlertCircle,
  CheckCircle2, Lock, User, ShieldCheck, UserCheck, Menu, X, Keyboard, KeyRound
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
import ChangePasswordModal from './components/ChangePasswordModal';
import LanguageSelector from './components/LanguageSelector';
import { useLanguage } from './contexts/LanguageContext';
import { searchPatients } from './services/patientService';
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
  { id: 'STF-008', name: 'Dr. Nimal Perera', role: 'Dermatologist', branch: 'Galle', status: 'Active', details: { email: 'nimal@careflow.com', contact: '+94 71 456 7890', license: 'SLMC-66321', consultFee: 2000, specialties: ['Dermatology'] } },
  { id: 'STF-011', name: 'Kamal Perera', role: 'Billing Officer', branch: 'Kandy', status: 'Active', details: { email: 'kamal.perera@careflow.com', contact: '+94 81 223 9999' } },
  { id: 'STF-012', name: 'Nirosha Silva', role: 'Billing Officer', branch: 'Galle', status: 'Active', details: { email: 'nirosha.silva@careflow.com', contact: '+94 91 222 8888' } }
];

const INITIAL_APPOINTMENTS = [
  { id: 'APP-1001', date: '2026-08-23', time: '09:00', doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', patientId: 'PAT-0001', patientName: 'John Doe', branch: 'Colombo Main', status: 'Completed', reason: 'Chronic chest pain checkup' },
  { id: 'APP-1002', date: '2026-08-23', time: '10:30', doctorId: 'STF-002', doctorName: 'Dr. Sarah Jenkins', patientId: 'PAT-0002', patientName: 'Clara Oswald', branch: 'Kandy', status: 'Booked', reason: 'Severe throat infection' },
  { id: 'APP-1003', date: '2026-08-23', time: '14:00', doctorId: 'STF-008', doctorName: 'Dr. Nimal Perera', patientId: 'PAT-0003', patientName: 'David Miller', branch: 'Galle', status: 'Booked', reason: 'Eczema flare up' },
  { id: 'APP-1004', date: '2026-08-24', time: '11:00', doctorId: 'STF-001', doctorName: 'Dr. Alexander Bennett', patientId: 'PAT-0001', patientName: 'John Doe', branch: 'Colombo Main', status: 'Booked', reason: 'ECG interpretation review' }
];

const INITIAL_QUEUE = [
  { queueNo: 1, appointmentId: 'APP-0008', appointment_id: 8, Appointment_ID: 8, patientId: 'PAT-0002', patient_id: 2, Patient_ID: 2, patientName: 'Clara Oswald', reason: 'Recurrent severe throat infection and hoarseness', assignedDoctor: 'Dr. Alexander Bennett', doctorId: 'STF-001', doctor_id: 1, Doctor_ID: 1, estWaitTime: 15, room: 'Room 101', status: 'SCHEDULED' },
  { queueNo: 2, appointmentId: 'APP-0010', appointment_id: 10, Appointment_ID: 10, patientId: 'PAT-0001', patient_id: 1, Patient_ID: 1, patientName: 'John Doe', reason: 'Hypertension evaluation and chest follow-up', assignedDoctor: 'Dr. Alexander Bennett', doctorId: 'STF-001', doctor_id: 1, Doctor_ID: 1, estWaitTime: 25, room: 'Room 105', status: 'SCHEDULED' },
  { queueNo: 3, appointmentId: 'APP-0011', appointment_id: 11, Appointment_ID: 11, patientId: 'PAT-0004', patient_id: 4, Patient_ID: 4, patientName: 'Ananya Jayawardena', reason: 'General health checkup', assignedDoctor: 'Dr. Alexander Bennett', doctorId: 'STF-001', doctor_id: 1, Doctor_ID: 1, estWaitTime: 40, room: 'Room 102', status: 'SCHEDULED' }
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
  ensureMotionSafeEnv();
  // ==========================================
  // AUTH CONTEXT & I18N
  // ==========================================
  const { currentUser, isHydrated, login, logout } = useAuth();
  const { t } = useLanguage();

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
  const [totalPatients, setTotalPatients] = useState(0);

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
          const mapped = res.data.map(s => {
            const isDoc = s.System_Role === 'Doctor' ||
              Boolean(s.Doctor_ID) ||
              (s.Job_Title && (
                s.Job_Title.toLowerCase().includes('doc') ||
                s.Job_Title.toLowerCase().includes('cardiolog') ||
                s.Job_Title.toLowerCase().includes('dermatolog') ||
                s.Job_Title.toLowerCase().includes('practitioner')
              ));
            return {
              id: `STF-${s.Staff_ID}`,
              Staff_ID: s.Staff_ID,
              staffId: s.Staff_ID,
              Account_ID: s.Account_ID,
              name: `${s.First_Name} ${s.Last_Name}`,
              role: s.Job_Title,
              branch: branches.find(b => b.Branch_ID === s.Branch_ID)?.Branch_Name || 'Colombo Main Clinic',
              Branch_ID: s.Branch_ID,
              status: s.Employment_Status,
              systemRole: s.System_Role,
              isDoctor: isDoc,
              license: s.License_Number,
              details: { email: s.Email, contact: s.Contact_Number }
            };
          });
          setStaffList(mapped);
        }
      }).catch(err => console.error("API Error (Staff):", err));

      api.get('/appointments').then(res => {
        if (res.data && res.data.length > 0) {
          const mappedAppts = res.data.map(a => ({
            id: `APP-${a.Appointment_ID}`,
            Appointment_ID: a.Appointment_ID,
            date: a.Appointment_Date,
            time: a.Start_Time ? a.Start_Time.slice(0, 5) : '09:00',
            doctorId: `STF-${a.Doctor_ID}`,
            Doctor_ID: a.Doctor_ID,
            doctorName: a.Doctor_Name ? `Dr. ${a.Doctor_Name}` : `Doctor #${a.Doctor_ID}`,
            patientId: `PAT-${a.Patient_ID}`,
            Patient_ID: a.Patient_ID,
            patientName: a.Patient_Name || `Patient #${a.Patient_ID}`,
            branch: a.Branch_Name || 'Colombo Main Clinic',
            Branch_ID: a.Branch_ID,
            status: a.Status,
            reason: a.Reason_For_Visit,
            isWalkIn: a.Appointment_Type === 'Walk_In'
          }));
          setAppointmentList(mappedAppts);
        }
      }).catch(err => console.error("API Error (Appointments):", err));

      api.get('/billing/invoices').then(res => {
        if (res.data && res.data.length > 0) {
          const mappedInvoices = res.data.map(inv => ({
            id: `INV-${inv.Invoice_ID}`,
            Invoice_ID: inv.Invoice_ID,
            invoiceId: inv.Invoice_ID,
            appointmentId: `APP-${inv.Appointment_ID}`,
            patientName: inv.Patient_Name,
            patientId: inv.Patient_ID ? `PAT-${inv.Patient_ID}` : undefined,
            Patient_ID: inv.Patient_ID,
            doctorFee: Number(inv.Billed_Consultation_Fee || 0),
            treatmentsSubtotal: Number(inv.Total_Treatments_Fee || 0),
            patientBalance: Number(inv.Patient_Paid || 0),
            outstandingBalance: Number(inv.Outstanding_Balance || 0),
            insuranceCoverage: Number(inv.Insurance_Covered || 0),
            total: Number(inv.Invoice_Total != null ? inv.Invoice_Total : (Number(inv.Billed_Consultation_Fee || 0) + Number(inv.Total_Treatments_Fee || 0))),
            status: inv.Invoice_Status,
            Invoice_Status: inv.Invoice_Status,
            branch: inv.Branch_Name || 'Colombo Main Clinic',
            Branch_ID: inv.Branch_ID,
            date: inv.Invoice_Date
          }));
          setInvoiceList(mappedInvoices);
        }
      }).catch(err => console.error("API Error (Invoices):", err));

      if (currentUser.roleCode === 'ROLE_ADMIN') {
        api.get('/audit-logs').then(res => {
          if (res.data && res.data.length > 0) {
            const mapped = res.data.map(log => ({
              id: `AUD-${log.Audit_ID}`,
              timestamp: log.Timestamp,
              userId: log.Account_ID.toString(),
              username: log.Performed_By || `Account ${log.Account_ID}`,
              branch: log.Affected_Branch || 'All Branches',
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Focus & accessible interaction refs
  const hamburgerButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerCloseBtnRef = useRef(null);
  const searchInputRef = useRef(null);

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
      .then(res => {
        if (!isCurrent) return;
        setTotalPatients(res.total != null ? res.total : (res.items || []).length);
        setPatientList((res.items || []).map(adaptPatientForPanels));
      })
      .catch(() => {
        if (isCurrent) {
          setPatientList([]);
          setTotalPatients(0);
        }
      });
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
    setMobileNavOpen(false);
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

  // Mobile navigation drawer focus management, Escape key listener, and scroll lock
  useEffect(() => {
    if (!mobileNavOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      drawerCloseBtnRef.current?.focus();
    }, 50);

    const handleDrawerKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileNavOpen(false);
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleDrawerKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleDrawerKeyDown);
      hamburgerButtonRef.current?.focus();
    };
  }, [mobileNavOpen]);

  // Global Patient Search Escape key listener
  useEffect(() => {
    if (!globalSearchOpen) return;

    const handleSearchKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setGlobalSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleSearchKeyDown);
    return () => window.removeEventListener('keydown', handleSearchKeyDown);
  }, [globalSearchOpen]);

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
      // admins start on the whole network, everyone else on their own branch
      setSelectedBranch(currentUser.roleCode === 'ROLE_ADMIN' ? 'All Branches' : (currentUser.branch || 'All Branches'));
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
        triggerToast(result.isDemo ? t('auth_demo_success', `Authenticated as ${result.user.role} (Demo mode)!`, { role: result.user.role }) : t('auth_success', 'Authenticated successfully!'));
        navigateTo(getRoleDefaultPath(result.user.roleCode));
      }
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(t('invalid_credentials', 'Invalid credentials. Check username or password.'));
    }
  };

  const handleLogout = () => {
    logout();
    triggerToast(t('session_invalidated', 'Session invalidated. Redirecting...'));
    navigateTo('/login');
  };


  // State bundle pack
  const db = { staffList, patientList, totalPatients, appointmentList, liveQueue, invoiceList, auditLogs, branches, currentUser, selectedBranch, medicalHistories };
  const handlers = { setStaffList, setAppointmentList, setLiveQueue, setInvoiceList, setMedicalHistories, setAuditLogs, setBranches, addAuditLog, triggerToast, navigateTo, reloadPatients, setSelectedBranch };

  // ==========================================
  // RENDER COORDINATOR
  // ==========================================

  // 1. AUTH PORTAL (Logged out view)
  // Background style: Clinic waiting room photo with SaaS ambient gradient & floating shapes
  const LOGIN_BG_STYLE = {
    backgroundImage: "url('/clinic-bg.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  if (!currentUser) {
    return (
      <div
        className="min-h-screen login-bg flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden"
        style={LOGIN_BG_STYLE}
      >
        {/* Subtle dark clinical-modern mesh backdrop + GPU-accelerated floating ambient shapes */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-blue-950/65 to-slate-900/80 backdrop-blur-[2px] pointer-events-none"
          aria-hidden="true"
        />
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.45, scale: 0.9, x: -30, y: -20 }}
          animate={{ opacity: [0.4, 0.65, 0.4], scale: [0.95, 1.08, 0.95], x: [-20, 25, -20], y: [-15, 20, -15] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl will-change-transform"
        />
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.35, scale: 1, x: 20, y: 20 }}
          animate={{ opacity: [0.3, 0.55, 0.3], scale: [1, 1.12, 1], x: [20, -30, 20], y: [15, -25, 15] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -bottom-28 -right-20 h-[26rem] w-[26rem] rounded-full bg-teal-400/20 blur-3xl will-change-transform"
        />
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.25, scale: 0.95 }}
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.95, 1.06, 0.95], y: [0, -18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl will-change-transform"
        />

        {/* Top-right language selector on login portal */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
          <LanguageSelector variant="portal" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Zocdoc / Doctolib Inspired Healthcare Landing Hero */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 text-center lg:text-left space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-blue-200 text-[11px] font-semibold tracking-wide shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
              <span>Enterprise Healthcare Cloud • Multi-Branch Clinical Suite</span>
            </div>

            <div className="flex justify-center lg:justify-start items-center space-x-3.5">
              <motion.div
                initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.08, type: 'spring', stiffness: 220, damping: 16 }}
                whileHover={{ scale: 1.06, rotate: 3 }}
                className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-xl shadow-blue-600/35 ring-2 ring-white/25"
              >
                <Activity className="h-7 w-7" />
              </motion.div>
              <div>
                <span className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-xs block">
                  CareFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-300">CATMS</span>
                </span>
              </div>
            </div>

            <h2 className="text-xs sm:text-sm font-bold text-blue-200/95 uppercase tracking-widest">
              {t('system_subtitle', 'CLINIC APPOINTMENT & TREATMENT MANAGEMENT SYSTEM')}
            </h2>

            <p className="text-sm sm:text-base text-slate-200/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Book verified specialists in seconds, track real-time outpatient waiting queues, manage electronic medical records, and process insurance claims across our 3-branch hospital network.
            </p>

            {/* Zocdoc / Doctolib Style Specialty Showcase Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                { spec: 'Cardiology', sub: 'Heart & Vascular', rating: '4.9 ★' },
                { spec: 'General Medicine', sub: 'Primary & Family Care', rating: '4.9 ★' },
                { spec: 'Dermatology', sub: 'Skin & Aesthetics', rating: '4.8 ★' },
                { spec: 'Pediatrics', sub: 'Child & Infant Specialists', rating: '5.0 ★' },
                { spec: 'Orthopedics', sub: 'Bone, Joint & Spine', rating: '4.9 ★' },
                { spec: 'Diagnostics & Lab', sub: 'ECG, Blood & Imaging', rating: '4.9 ★' }
              ].map((item) => (
                <div
                  key={item.spec}
                  className="p-3 rounded-2xl bg-slate-900/55 border border-white/15 backdrop-blur-md text-left hover:bg-slate-900/75 hover:border-blue-400/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">{item.spec}</span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded-full">
                      {item.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/80 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Live Hospital Branch Network Status Bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.16 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-[11px] text-slate-200/90 pt-1"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/15 backdrop-blur-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Colombo Main Hospital
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/15 backdrop-blur-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Kandy Regional Clinic
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/15 backdrop-blur-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Galle Southern Center
              </span>
            </motion.div>
          </motion.div>

          {/* Right Column: Animated Glassmorphic Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 w-full max-w-md mx-auto relative z-10"
          >
            <div className="relative overflow-hidden bg-white/95 backdrop-blur-xl py-8 px-6 border border-white/80 shadow-2xl rounded-3xl sm:px-9 space-y-6">
              {/* Top SaaS accent gradient strip */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-500" />

              <div className="text-center border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-200/60">
                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                  <span>Unified Patient & Staff Portal</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {t('welcome_back', 'Welcome Back')}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  {t('sign_in_subtitle', 'Sign in to access your account')}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {authError && (
                  <motion.div
                    key="auth-error"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    role="alert"
                    className="bg-red-50/95 border border-red-200 text-red-700 p-3.5 rounded-2xl flex items-center space-x-2.5 text-xs font-medium shadow-2xs"
                  >
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                    <span>{authError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form className="space-y-4" onSubmit={handleSignIn} noValidate>
                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    {t('email_or_username', 'Email Address / Username')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder={t('username_placeholder', 'username or name@careflow.com')}
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    {t('password', 'Password')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ y: -1.5, scale: 1.01 }}
                  whileTap={{ scale: 0.98, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/25"
                >
                  <span>{t('sign_in_button', 'Sign In to System')}</span>
                </motion.button>
              </form>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-500" /> TLS Role-Based Access
                </span>
                <span>Colombo • Kandy • Galle</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const navItemClass = (isActive) =>
    `w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
        : 'text-slate-400 hover:bg-slate-900/90 hover:text-white'
    }`;

  const renderNavLinks = () => (
    <>
      {currentUser.roleCode === 'ROLE_ADMIN' && (
        <>
          <button
            onClick={() => navigateTo('/admin/dashboard')}
            className={navItemClass(currentPath === '/admin/dashboard')}
          >
            <Building className="h-4.5 w-4.5" />
            <span>{t('nav_executive_dashboard', 'Executive Dashboard')}</span>
          </button>
          <button
            onClick={() => navigateTo('/admin/staff')}
            className={navItemClass(currentPath === '/admin/staff')}
          >
            <Users className="h-4.5 w-4.5" />
            <span>{t('nav_staff_directory', 'Staff Directory')}</span>
          </button>
          <button
            onClick={() => navigateTo('/admin/branches')}
            className={navItemClass(currentPath === '/admin/branches')}
          >
            <Building className="h-4.5 w-4.5" />
            <span>{t('nav_clinic_branches', 'Clinic Branches')}</span>
          </button>
          <button
            onClick={() => navigateTo('/admin/audit-logs')}
            className={navItemClass(currentPath === '/admin/audit-logs')}
          >
            <ClipboardList className="h-4.5 w-4.5" />
            <span>{t('nav_security_audit_logs', 'Security Audit Logs')}</span>
          </button>
          <button
            onClick={() => navigateTo('/admin/reports')}
            className={navItemClass(currentPath === '/admin/reports')}
          >
            <TrendingUp className="h-4.5 w-4.5" />
            <span>{t('nav_reports_suite', 'Reports Suite')}</span>
          </button>
        </>
      )}

      {currentUser.roleCode === 'ROLE_BRANCH_MANAGER' && (
        <>
          <button
            onClick={() => navigateTo('/manager/dashboard')}
            className={navItemClass(currentPath === '/manager/dashboard')}
          >
            <Building className="h-4.5 w-4.5" />
            <span>{t('nav_branch_operations', 'Branch Operations')}</span>
          </button>
          <button
            onClick={() => navigateTo('/manager/roster')}
            className={navItemClass(currentPath === '/manager/roster')}
          >
            <Calendar className="h-4.5 w-4.5" />
            <span>{t('nav_doctor_roster_planner', 'Doctor Roster Planner')}</span>
          </button>
          <button
            onClick={() => navigateTo('/manager/staff')}
            className={navItemClass(currentPath === '/manager/staff')}
          >
            <Users className="h-4.5 w-4.5" />
            <span>{t('nav_local_staff_directory', 'Local Staff Directory')}</span>
          </button>
          <button
            onClick={() => navigateTo('/manager/reports')}
            className={navItemClass(currentPath === '/manager/reports')}
          >
            <TrendingUp className="h-4.5 w-4.5" />
            <span>{t('nav_branch_reports', 'Branch Reports')}</span>
          </button>
        </>
      )}

      {currentUser.roleCode === 'ROLE_RECEPTIONIST' && (
        <>
          <button
            onClick={() => navigateTo('/reception/dashboard')}
            className={navItemClass(currentPath === '/reception/dashboard')}
          >
            <ClipboardList className="h-4.5 w-4.5" />
            <span>{t('nav_triage_workbench', 'Triage Workbench')}</span>
          </button>
          <button
            onClick={() => navigateTo('/reception/patients')}
            className={navItemClass(currentPath === '/reception/patients')}
          >
            <Users className="h-4.5 w-4.5" />
            <span>{t('nav_patient_registry', 'Patient Registry')}</span>
          </button>
          <button
            onClick={() => navigateTo('/reception/appointments')}
            className={navItemClass(currentPath === '/reception/appointments')}
          >
            <Calendar className="h-4.5 w-4.5" />
            <span>{t('nav_schedules_calendar', 'Schedules Calendar')}</span>
          </button>
          <button
            onClick={() => navigateTo('/reception/walkin')}
            className={navItemClass(currentPath === '/reception/walkin')}
          >
            <Clock className="h-4.5 w-4.5" />
            <span>{t('nav_walkin_intake', 'Walk-in Intake')}</span>
          </button>
        </>
      )}

      {currentUser.roleCode === 'ROLE_DOCTOR' && (
        <>
          <button
            onClick={() => navigateTo('/doctor/workbench')}
            className={navItemClass(currentPath === '/doctor/workbench' || currentPath.startsWith('/doctor/consultation'))}
          >
            <Activity className="h-4.5 w-4.5" />
            <span>{t('nav_consult_workbench', 'Consult Workbench')}</span>
          </button>
          <button
            onClick={() => navigateTo('/doctor/appointments')}
            className={navItemClass(currentPath === '/doctor/appointments')}
          >
            <Calendar className="h-4.5 w-4.5" />
            <span>{t('nav_upcoming_bookings', 'Upcoming Bookings')}</span>
          </button>
        </>
      )}

      {currentUser.roleCode === 'ROLE_BILLING_STAFF' && (
        <>
          <button
            onClick={() => navigateTo('/billing/dashboard')}
            className={navItemClass(currentPath === '/billing/dashboard')}
          >
            <DollarSign className="h-4.5 w-4.5" />
            <span>{t('nav_billing_desk', 'Billing Desk')}</span>
          </button>
          <button
            onClick={() => navigateTo('/billing/invoices')}
            className={navItemClass(currentPath === '/billing/invoices')}
          >
            <FileText className="h-4.5 w-4.5" />
            <span>{t('nav_invoice_ledger', 'Invoice Ledger')}</span>
          </button>
          <button
            onClick={() => navigateTo('/billing/claims')}
            className={navItemClass(currentPath === '/billing/claims')}
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            <span>{t('nav_insurance_claims', 'Insurance Claims')}</span>
          </button>
          <button
            onClick={() => navigateTo('/billing/reports')}
            className={navItemClass(currentPath === '/billing/reports')}
          >
            <TrendingUp className="h-4.5 w-4.5" />
            <span>{t('nav_finance_reports', 'Finance Reports')}</span>
          </button>
        </>
      )}

      {currentUser.roleCode === 'ROLE_PATIENT' && (
        <>
          <button
            onClick={() => navigateTo('/portal/home')}
            className={navItemClass(currentPath === '/portal/home')}
          >
            <Building className="h-4.5 w-4.5" />
            <span>{t('nav_home_dashboard', 'Home Dashboard')}</span>
          </button>
          <button
            onClick={() => navigateTo('/portal/book')}
            className={navItemClass(currentPath === '/portal/book')}
          >
            <Calendar className="h-4.5 w-4.5" />
            <span>{t('nav_self_booking_wizard', 'Self Booking Wizard')}</span>
          </button>
          <button
            onClick={() => navigateTo('/portal/medical-history')}
            className={navItemClass(currentPath === '/portal/medical-history')}
          >
            <FileText className="h-4.5 w-4.5" />
            <span>{t('nav_my_consultations', 'My Consultations')}</span>
          </button>
          <button
            onClick={() => navigateTo('/portal/billing')}
            className={navItemClass(currentPath === '/portal/billing')}
          >
            <DollarSign className="h-4.5 w-4.5" />
            <span>{t('nav_my_receipts', 'My Receipts')}</span>
          </button>
        </>
      )}
    </>
  );

  // 2. MAIN APP SHELL (Logged in views)
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-900">

      {/* Smooth Animated Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="global-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4.5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center space-x-3 text-xs font-semibold"
          >
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Backdrop & Sidebar (< lg viewports) */}
      {mobileNavOpen && (
        <div
          ref={drawerRef}
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Sidebar"
        >
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 text-white flex flex-col justify-between shadow-2xl z-50 border-r border-slate-900">
            <div>
              <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-sm">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-extrabold tracking-tight">CareFlow CATMS</span>
                </div>
                <button
                  ref={drawerCloseBtnRef}
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 px-4 space-y-1.5 overflow-y-auto max-h-[calc(100dvh-180px)]">
                {renderNavLinks()}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-900 bg-slate-950/50 space-y-3">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('active_session', 'Active Session')}
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="truncate">{currentUser.name.split(' [')[0]} ({currentUser.roleCode.replace('ROLE_', '')})</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setShowChangePasswordModal(true);
                  }}
                  className="flex-1 flex items-center justify-center space-x-1.5 min-h-[44px] py-2 px-3 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{t('change_password', 'Password')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-100 rounded-lg transition-colors cursor-pointer"
                  title={t('instant_logout', 'Instant Logout')}
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar (lg+ viewports) */}
      <aside className="hidden lg:flex w-64 fixed top-0 bottom-0 left-0 bg-slate-950 text-white flex-col justify-between z-10 border-r border-slate-900/90 shadow-xl">
        <div>
          {/* Logo brand */}
          <div className="px-6 py-5 border-b border-slate-900 flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-600/25">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight block leading-none">CareFlow CATMS</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 block">Clinical Cloud</span>
            </div>
          </div>

          {/* Navigation Links based on user claims */}
          <nav className="mt-5 px-3.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {renderNavLinks()}
          </nav>
        </div>

        {/* User Session Info */}
        <div className="p-4 border-t border-slate-900 bg-slate-900/40">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {t('active_session', 'Active Session')}
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-1 flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/15 inline-block"></span>
            <span>{currentUser.roleCode.replace('ROLE_', '')}</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="pl-0 lg:pl-64 flex-1 flex flex-col min-w-0">

        {/* Global Top Header Bar */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-16 px-2.5 sm:px-6 lg:px-8 flex justify-between items-center shrink-0 z-20 shadow-2xs gap-1.5 sm:gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
            {/* Mobile Hamburger button (< lg) */}
            <button
              ref={hamburgerButtonRef}
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer"
              aria-label="Open navigation sidebar"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Brand Logo Identity */}
            <span className="text-sm font-extrabold text-slate-800 tracking-tight shrink-0 hidden md:inline">CareFlow CATMS</span>

            {/* Active Branch Switcher */}
            <div className="hidden md:block h-5 w-px bg-slate-200" />
            <div className="flex items-center space-x-1 min-w-0">
              {currentUser.roleCode === 'ROLE_ADMIN' ? (
                <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50/50 min-w-0 max-w-[100px] xs:max-w-[130px] sm:max-w-none">
                  <Building className="h-4 w-4 text-slate-400 shrink-0" />
                  <select
                    className="border-none bg-transparent rounded-lg text-xs font-bold focus:outline-none cursor-pointer w-full truncate"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    aria-label="Select active branch"
                  >
                    <option value="All Branches">{t('all_branches', 'All Branches')}</option>
                    <option value="Colombo Main">{t('colombo_main', 'Colombo Main')}</option>
                    <option value="Kandy">{t('kandy', 'Kandy')}</option>
                    <option value="Galle">{t('galle', 'Galle')}</option>
                  </select>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1 min-w-0 truncate">
                  <Building className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none">{t('branch', 'Branch')}: <strong>{currentUser.branch || 'None'}</strong></span>
                </span>
              )}
            </div>
          </div>

          {/* Center search & actions cluster */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex md:hidden min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title={t('search_placeholder', 'Search Patient Code / Name...')}
              aria-label="Search patients"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Desktop search bar */}
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(true)}
              className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-xs text-slate-450 hover:bg-slate-100 hover:border-slate-300 transition-all font-medium cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{t('search_placeholder', 'Search Patient Code / Name...')}</span>
              <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-2xs">Ctrl + K</kbd>
            </button>

            {/* Language Selector Dropdown in Top Bar */}
            <LanguageSelector />

            {/* User Profile & Badge */}
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="h-8 w-8 bg-blue-100 text-blue-800 rounded-xl hidden sm:flex items-center justify-center font-bold text-sm shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="truncate max-w-[120px] lg:max-w-none">{currentUser.name.split(' [')[0]}</span>
                  <span className="bg-slate-100 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    {currentUser.roleCode.replace('ROLE_', '')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate max-w-[140px] lg:max-w-none">{currentUser.email}</span>
              </div>

              {/* Change Password button */}
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl transition-all cursor-pointer"
                title={t('change_password', 'Change Password')}
                aria-label="Change password"
              >
                <KeyRound className="h-4.5 w-4.5" />
              </button>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-red-50/70 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200/60 rounded-xl transition-all cursor-pointer shadow-2xs"
                title={t('instant_logout', 'Instant Logout')}
                aria-label="Logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Work Area Container */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1 min-w-0">
          {(() => {
            // Simple path routing mapping
            const path = currentPath;

            // Enforce role-versus-path workspace guard
            if (!isPathAllowed(currentUser.roleCode, path)) {
              return (
                <div className="bg-white border border-red-200 rounded-xl p-10 text-center text-slate-700 shadow-xs">
                  <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 text-lg">{t('access_denied', 'Access Denied')}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('access_denied_desc', `Your account role (${currentUser.roleCode.replace('ROLE_', '')}) does not have permission to access ${path}.`, {
                      role: currentUser.roleCode.replace('ROLE_', ''),
                      path
                    })}
                  </p>
                  <button
                    onClick={() => navigateTo(getRoleDefaultPath(currentUser.roleCode))}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {t('return_to_workspace', 'Return to My Workspace')}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setGlobalSearchOpen(false)} aria-hidden="true" />
          <div
            className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[85vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Search patients"
          >

            {/* Search Input bar */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/50 relative flex items-center shrink-0">
              <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder="Type Patient ID, NIC, or Name to lookup..."
                className="w-full bg-transparent border-none text-sm font-semibold focus:outline-none min-w-0"
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
                aria-label="Search patients by ID, NIC, or name"
              />
              <button
                type="button"
                onClick={() => setGlobalSearchOpen(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-xs bg-slate-200 hover:bg-slate-300 text-slate-650 px-2 py-1 rounded-lg font-bold font-mono transition-all cursor-pointer shrink-0 ml-2"
                aria-label="Close search modal"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 sm:p-4 space-y-2 min-h-0">
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
                    <span className="font-bold text-slate-900 text-sm truncate mr-2">{formatPatientName(p.first_name, p.last_name)}</span>
                    <span className="font-mono text-slate-450 shrink-0">{formatPatientId(p.patient_id)}</span>
                  </div>
                  <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-450 mt-2 font-mono gap-1">
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        triggerToast={triggerToast}
      />
    </div>
  );
}
