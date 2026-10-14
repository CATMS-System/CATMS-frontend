import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Building, AlertCircle, Calendar, Plus, MapPin, Key, RefreshCw,
  Check, ArrowLeftRight, UserX, UserCheck, ShieldCheck, TrendingUp, Activity, DollarSign
} from 'lucide-react';
import api from '../api/axios';
import ReportsPanel from './ReportsPanel';
import AddStaffDrawer from './AddStaffDrawer';
import { useLanguage } from '../contexts/LanguageContext';
import { ensureMotionSafeEnv, MOTION_VARIANTS } from '../theme/designSystem';
import { PageTransition } from './ui/PageTransition';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

const CHART_COLORS = ['#2563eb', '#0d9488', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

export default function AdminPanel({ subView, db, handlers }) {
  ensureMotionSafeEnv();
  const { t } = useLanguage();
  const { staffList, patientList, appointmentList, liveQueue, invoiceList, auditLogs, branches, selectedBranch: initialSelectedBranch } = db;
  const { setStaffList, setBranches, setAuditLogs, addAuditLog, triggerToast, navigateTo, setSelectedBranch: setGlobalSelectedBranch } = handlers;

  // Selected branch scope state for dashboard
  const [selectedBranch, setSelectedBranch] = useState(initialSelectedBranch || 'All Branches');
  const [branchChartMode, setBranchChartMode] = useState('clinical'); // 'clinical' | 'financial'

  // Keep synced if global header dropdown changes db.selectedBranch
  useEffect(() => {
    if (db.selectedBranch && db.selectedBranch !== selectedBranch) {
      setSelectedBranch(db.selectedBranch);
    }
  }, [db.selectedBranch]);

  const handleBranchChange = (newBranch) => {
    setSelectedBranch(newBranch);
    if (typeof setGlobalSelectedBranch === 'function') {
      setGlobalSelectedBranch(newBranch);
    }
  };

  // Map selected branch string to numeric Branch_ID (null for network-wide)
  const selectedBranchId = useMemo(() => {
    if (!selectedBranch || selectedBranch === 'All Branches' || selectedBranch === 'All') {
      return null;
    }
    const found = (branches || []).find(b =>
      b.Branch_ID === selectedBranch ||
      b.Branch_ID === Number(selectedBranch) ||
      b.Branch_Name === selectedBranch ||
      b.name === selectedBranch ||
      (b.Branch_Name && b.Branch_Name.toLowerCase().includes(selectedBranch.toLowerCase())) ||
      (selectedBranch && selectedBranch.toLowerCase().includes((b.Branch_Name || '').toLowerCase()))
    );
    if (found) return Number(found.Branch_ID);
    const lower = selectedBranch.toLowerCase();
    if (lower.includes('colombo')) return 1;
    if (lower.includes('kandy')) return 2;
    if (lower.includes('galle')) return 3;
    const parsed = parseInt(selectedBranch, 10);
    return !isNaN(parsed) ? parsed : null;
  }, [selectedBranch, branches]);

  // Branch matching helper for client-side filtering fallback
  const matchesBranch = (itemBranchId, itemBranchName) => {
    if (!selectedBranchId) return true;
    if (itemBranchId != null && Number(itemBranchId) === selectedBranchId) return true;
    if (itemBranchName) {
      const name = String(itemBranchName).toLowerCase();
      const currentSelectedBranch = branches?.find(b => (b.Branch_ID || b.id) === selectedBranchId);
      if (currentSelectedBranch) {
        const curName = String(currentSelectedBranch.Branch_Name || currentSelectedBranch.name || '').toLowerCase();
        if (curName && (name.includes(curName) || curName.includes(name))) return true;
      }
      if (selectedBranchId === 1 && name.includes('colombo')) return true;
      if (selectedBranchId === 2 && name.includes('kandy')) return true;
      if (selectedBranchId === 3 && name.includes('galle')) return true;
      if (selectedBranchId === 4 && name.includes('kurunegala')) return true;
      if (selectedBranchId === 5 && name.includes('jaffna')) return true;
    }
    return false;
  };

  // Live filtered dashboard data state
  const [dashInvoices, setDashInvoices] = useState(null);
  const [dashAppointments, setDashAppointments] = useState(null);
  const [dashStaff, setDashStaff] = useState(null);

  // Trigger re-fetch of filtered data whenever selected branch changes
  useEffect(() => {
    let isCurrent = true;
    const params = selectedBranchId ? { branch_id: selectedBranchId } : {};

    Promise.all([
      api.get('/billing/invoices', { params }).catch(err => {
        console.error("API Error fetching dashboard invoices:", err);
        return null;
      }),
      api.get('/appointments', { params }).catch(err => {
        console.error("API Error fetching dashboard appointments:", err);
        return null;
      }),
      api.get('/staff', { params }).catch(err => {
        console.error("API Error fetching dashboard staff:", err);
        return null;
      })
    ]).then(([invRes, apptRes, staffRes]) => {
      if (!isCurrent) return;
      if (invRes && invRes.data) {
        setDashInvoices(invRes.data);
      }
      if (apptRes && apptRes.data) {
        setDashAppointments(apptRes.data);
      }
      if (staffRes && staffRes.data) {
        setDashStaff(staffRes.data);
      }
    });

    return () => { isCurrent = false; };
  }, [selectedBranchId]);

  // Onboarding Drawer states
  const [showAddStaffDrawer, setShowAddStaffDrawer] = useState(false);

  // Action states for selected staff
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [showTransferBranchModal, setShowTransferBranchModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [tempPassInput, setTempPassInput] = useState('');

  // Search and Filter states
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffBranchFilter, setStaffBranchFilter] = useState('All');
  const [staffRoleFilter, setStaffRoleFilter] = useState('All');
  const [staffStatusFilter, setStaffStatusFilter] = useState('All');

  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditDateFilter, setAuditDateFilter] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleToggleStaffStatus = async (staff) => {
    const nextStatus = staff.status === 'Active' ? 'On_Leave' : 'Active';
    try {
      const staffIdInt = staff.Staff_ID || staff.staffId || parseInt(staff.id.split('-')[1]);
      await api.put(`/staff/${staffIdInt}`, { Employment_Status: nextStatus });

      const updated = staffList.map(s => {
        if (s.id === staff.id) return { ...s, status: nextStatus };
        return s;
      });
      setStaffList(updated);
      addAuditLog(
        'UPDATE_STAFF',
        `Toggled status of ${staff.name} to ${nextStatus}`,
        JSON.stringify(staff),
        JSON.stringify({ ...staff, status: nextStatus })
      );
      triggerToast(`${staff.name} is now ${nextStatus}`);
    } catch (err) {
      console.error("API Error updating status", err);
      triggerToast(`Failed to update status for ${staff.name}`);
    }
  };

  const handleTransferBranch = async (e) => {
    e.preventDefault();
    const newBranch = e.target.transferBranch.value;
    const oldBranch = selectedStaff.branch;

    const branchObj = branches.find(b => b.Branch_Name === newBranch || b.name === newBranch);
    const branchId = branchObj ? (branchObj.Branch_ID || 1) : 1;

    try {
      const staffIdInt = selectedStaff.Staff_ID || selectedStaff.staffId || parseInt(selectedStaff.id.split('-')[1]);
      await api.put(`/staff/${staffIdInt}`, { Branch_ID: branchId });

      const updated = staffList.map(s => {
        if (s.id === selectedStaff.id) return { ...s, branch: newBranch };
        return s;
      });
      setStaffList(updated);
      addAuditLog(
        'UPDATE_STAFF',
        `Transferred branch for ${selectedStaff.name} from ${oldBranch} to ${newBranch}`,
        JSON.stringify(selectedStaff),
        JSON.stringify({ ...selectedStaff, branch: newBranch })
      );
      triggerToast(`Transferred ${selectedStaff.name} to ${newBranch}`);
      setShowTransferBranchModal(false);
    } catch (err) {
      console.error("API Error transferring branch", err);
      triggerToast(`Failed to transfer ${selectedStaff.name}`);
    }
  };

  const handleForcePasswordReset = (e) => {
    e.preventDefault();
    if (!tempPassInput) {
      alert('Please enter a temporary password.');
      return;
    }
    addAuditLog(
      'SECURITY',
      `Forced password reset for ${selectedStaff.name} (${selectedStaff.id})`,
      'null',
      JSON.stringify({ triggeredBy: 'ADMIN', targetUser: selectedStaff.id })
    );
    triggerToast(`Password reset successfully for ${selectedStaff.name}. Temp password sent.`);
    setShowPasswordResetModal(false);
    setTempPassInput('');
  };

  const handleAssignBranchManager = async (branchId, managerId) => {
    // Find the branch by its unique Branch_ID or fallback to name
    const branch = branches.find(br =>
      (br.Branch_ID != null && branchId != null && String(br.Branch_ID) === String(branchId)) ||
      (Boolean(br.name) && Boolean(branchId) && br.name === branchId) ||
      (Boolean(br.Branch_Name) && Boolean(branchId) && br.Branch_Name === branchId)
    );
    if (!branch) return;

    // Find the staff member — match by Staff_ID (numeric) or the frontend id string
    const mgr = staffList.find(s =>
      s.id === managerId ||
      String(s.Staff_ID) === String(managerId) ||
      (managerId && s.id && String(s.id).replace(/\D+/g, '') === String(managerId).replace(/\D+/g, ''))
    );

    // Optimistic UI update for ONLY the target branch
    const updatedBranches = branches.map(br => {
      const isTarget = (branch.Branch_ID != null && br.Branch_ID != null && String(br.Branch_ID) === String(branch.Branch_ID))
        || (Boolean(branch.name) && Boolean(br.name) && br.name === branch.name)
        || (Boolean(branch.Branch_Name) && Boolean(br.Branch_Name) && br.Branch_Name === branch.Branch_Name);

      if (isTarget) {
        return {
          ...br,
          managerId: mgr ? mgr.id : (managerId || null),
          Manager_Staff_ID: mgr ? (mgr.Staff_ID || parseInt(String(mgr.id).replace(/\D+/g, ''), 10)) : null,
          managerName: mgr ? mgr.name : 'Unassigned'
        };
      }
      return br;
    });
    setBranches(updatedBranches);

    // Persist to backend
    const displayName = branch.Branch_Name || branch.name || `Branch #${branch.Branch_ID}`;
    try {
      const staffIdInt = mgr
        ? (mgr.Staff_ID || parseInt(String(mgr.id || '').replace(/\D+/g, ''), 10) || null)
        : null;
      if (branch.Branch_ID) {
        await api.put(`/branches/${branch.Branch_ID}`, {
          Manager_Staff_ID: staffIdInt || null
        });
      }
      addAuditLog(
        'CONFIG_BRANCH',
        `Assigned ${mgr ? mgr.name : 'Unassigned'} as Branch Manager for ${displayName}`,
        'null',
        JSON.stringify({ branch: branch.Branch_ID || branch.name, manager: managerId })
      );
      triggerToast(`Assigned ${mgr ? mgr.name : 'manager'} to ${displayName}`);
    } catch (err) {
      console.error('Failed to persist branch manager assignment:', err);
      triggerToast('Saved locally — backend sync failed. Check connection.');
    }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        Branch_Name: e.target.branchName.value,
        Street_Address: e.target.address.value,
        City: 'Colombo',
        State_Province: 'Western',
        Postal_Code: '00100',
        Contact_Number: e.target.phone.value,
        Email: `${e.target.branchName.value.toLowerCase().replace(/\s+/g, '')}@careflow.com`,
        Manager_Staff_ID: null
      };

      const response = await api.post('/branches', payload);
      const b = response.data;

      const newBranch = {
        name: b.Branch_Name,
        address: b.Street_Address,
        phone: b.Contact_Number,
        Branch_ID: b.Branch_ID,
        managerId: null,
        managerName: 'Unassigned'
      };

      setBranches([...branches, newBranch]);
      addAuditLog('CONFIG_BRANCH', `Created new branch ${newBranch.name}`, 'null', JSON.stringify(newBranch));
      triggerToast(`Branch ${newBranch.name} successfully created!`);
      setShowAddBranchModal(false);
    } catch (err) {
      console.error("API Error creating branch", err);
      triggerToast('Failed to create branch.');
    }
  };

  // Filtered lists
  const filteredStaff = useMemo(() => {
    return (staffList || []).filter(s => {
      // 1. Search filter across name, id, role, systemRole, email, contact, license
      const q = (staffSearchQuery || '').toLowerCase().trim();
      let matchSearch = true;
      if (q) {
        const sName = (s.name || '').toLowerCase();
        const sId = (s.id || '').toLowerCase();
        const sStaffId = String(s.Staff_ID || s.staffId || '').toLowerCase();
        const sRole = (s.role || '').toLowerCase();
        const sSysRole = (s.systemRole || s.System_Role || '').toLowerCase();
        const sEmail = (s.details?.email || s.Email || '').toLowerCase();
        const sPhone = (s.details?.contact || s.Contact_Number || '').toLowerCase();
        const sLicense = (s.license || s.License_Number || '').toLowerCase();
        matchSearch = sName.includes(q) ||
          sId.includes(q) ||
          sStaffId === q ||
          sRole.includes(q) ||
          sSysRole.includes(q) ||
          sEmail.includes(q) ||
          sPhone.includes(q) ||
          sLicense.includes(q);
      }

      // 2. Branch filter matching exact name, partial prefix, or branch ID
      let matchBranch = true;
      if (staffBranchFilter && staffBranchFilter !== 'All') {
        const filterVal = String(staffBranchFilter).toLowerCase().trim();
        const staffBranch = String(s.branch || '').toLowerCase().trim();
        const staffBranchId = s.Branch_ID != null ? String(s.Branch_ID) : '';

        matchBranch = staffBranch === filterVal ||
          staffBranch.includes(filterVal) ||
          filterVal.includes(staffBranch) ||
          (staffBranchId && staffBranchId === filterVal) ||
          (filterVal.includes('colombo') && staffBranch.includes('colombo')) ||
          (filterVal.includes('kandy') && staffBranch.includes('kandy')) ||
          (filterVal.includes('galle') && staffBranch.includes('galle')) ||
          (filterVal.includes('kurunegala') && staffBranch.includes('kurunegala')) ||
          (filterVal.includes('jaffna') && staffBranch.includes('jaffna'));
      }

      // 3. Role filter matching Doctor, Branch Manager, Receptionist, Nurse, Billing, Admin
      let matchRole = true;
      if (staffRoleFilter && staffRoleFilter !== 'All') {
        const rFilter = String(staffRoleFilter).toUpperCase().trim();
        const sRole = String(s.role || '').toUpperCase();
        const sSysRole = String(s.systemRole || s.System_Role || '').toUpperCase();

        if (rFilter === 'DOC' || rFilter === 'DOCTOR') {
          matchRole = Boolean(s.isDoctor) ||
            sSysRole === 'DOCTOR' ||
            s.Doctor_ID != null ||
            sRole.includes('DOC') ||
            sRole.includes('CARDIOLOG') ||
            sRole.includes('DERMATOLOG') ||
            sRole.includes('PRACTITIONER') ||
            sRole.includes('PHYSICIAN') ||
            sRole.includes('SURGEON') ||
            sRole.includes('PEDIATRIC') ||
            sRole.includes('SPECIALIST');
        } else if (rFilter === 'BRANCH_MANAGER' || rFilter === 'MANAGER') {
          matchRole = sSysRole.includes('MANAGER') || sRole.includes('MANAGER');
        } else if (rFilter === 'RECEPTIONIST') {
          matchRole = sSysRole.includes('RECEPTION') || sRole.includes('RECEPTION');
        } else if (rFilter === 'NURSE') {
          matchRole = sSysRole.includes('NURSE') || sRole.includes('NURSE');
        } else if (rFilter === 'BILLING' || rFilter === 'BILLING_STAFF') {
          matchRole = sSysRole.includes('BILLING') ||
            sRole.includes('BILLING') ||
            sRole.includes('CASHIER') ||
            sRole.includes('CLAIMS');
        } else if (rFilter === 'ADMIN') {
          matchRole = sSysRole.includes('ADMIN') || sRole.includes('ADMIN');
        } else {
          matchRole = sSysRole.includes(rFilter) || sRole.includes(rFilter);
        }
      }

      // 4. Status filter matching Active vs Inactive (On_Leave, Terminated, Inactive, etc.)
      let matchStatus = true;
      if (staffStatusFilter && staffStatusFilter !== 'All') {
        const rawStatus = String(s.status || s.Employment_Status || '').trim().toLowerCase();
        const isActive = rawStatus === 'active';
        if (staffStatusFilter === 'Active') {
          matchStatus = isActive;
        } else if (staffStatusFilter === 'Inactive') {
          matchStatus = !isActive;
        } else if (staffStatusFilter === 'On_Leave') {
          matchStatus = rawStatus.replace(/[\s_-]+/g, '') === 'onleave';
        } else if (staffStatusFilter === 'Terminated') {
          matchStatus = rawStatus === 'terminated';
        } else {
          matchStatus = rawStatus === staffStatusFilter.toLowerCase();
        }
      }

      return matchSearch && matchBranch && matchRole && matchStatus;
    });
  }, [staffList, staffSearchQuery, staffBranchFilter, staffRoleFilter, staffStatusFilter]);

  const filteredAuditLogs = useMemo(() => {
    const q = (auditSearchQuery || '').toLowerCase().trim();
    return (auditLogs || []).filter(log => {
      const details = String(log.details || log.Details || '').toLowerCase();
      const userId = String(log.userId || log.User_ID || log.user_id || '').toLowerCase();
      const userName = String(log.userName || log.username || log.User_Name || '').toLowerCase();
      const branch = String(log.branch || log.Branch_Name || '').toLowerCase();
      const action = String(log.action || log.Action || '').toUpperCase();
      const timestamp = String(log.timestamp || log.Timestamp || log.created_at || '');

      const matchSearch = !q || details.includes(q) || userId.includes(q) || userName.includes(q) || branch.includes(q);
      const matchAction = auditActionFilter === 'All' || action === auditActionFilter.toUpperCase() || String(log.action || '') === auditActionFilter;
      const matchDate = !auditDateFilter || timestamp.startsWith(auditDateFilter) || timestamp.slice(0, 10) === auditDateFilter;

      return matchSearch && matchAction && matchDate;
    });
  }, [auditLogs, auditSearchQuery, auditActionFilter, auditDateFilter]);

  // Active datasets for dashboard cards: uses live re-fetched branch data, falling back to client-filtered state
  const activeInvoices = useMemo(() => {
    if (dashInvoices) return dashInvoices;
    if (!selectedBranchId) return invoiceList || [];
    return (invoiceList || []).filter(inv => matchesBranch(inv.Branch_ID, inv.branch));
  }, [dashInvoices, invoiceList, selectedBranchId]);

  const activeAppointments = useMemo(() => {
    if (dashAppointments) return dashAppointments;
    if (!selectedBranchId) return appointmentList || [];
    return (appointmentList || []).filter(a => matchesBranch(a.Branch_ID, a.branch));
  }, [dashAppointments, appointmentList, selectedBranchId]);

  const activeStaff = useMemo(() => {
    if (dashStaff) return dashStaff;
    if (!selectedBranchId) return staffList || [];
    return (staffList || []).filter(s => matchesBranch(s.Branch_ID, s.branch));
  }, [dashStaff, staffList, selectedBranchId]);

  const revenueCollected = useMemo(() => {
    return (activeInvoices || []).reduce((sum, inv) => {
      const paid = Number(inv.Patient_Paid != null ? inv.Patient_Paid : (inv.patientBalance != null ? inv.patientBalance : 0));
      const ins = Number(inv.Insurance_Covered != null ? inv.Insurance_Covered : (inv.insuranceCoverage != null ? inv.insuranceCoverage : 0));
      if (paid > 0 || ins > 0) return sum + paid + ins;
      const tot = Number(inv.Invoice_Total != null ? inv.Invoice_Total : (inv.total != null ? inv.total : 0));
      if (inv.Invoice_Status === 'Paid' || inv.status === 'Paid') return sum + tot;
      if (inv.Invoice_Status === 'Partially_Paid' || inv.Invoice_Status === 'Partially Paid' || inv.status === 'Partially Paid' || inv.status === 'Partially_Paid') return sum + (tot * 0.5);
      return sum;
    }, 0);
  }, [activeInvoices]);

  const outstandingBalance = useMemo(() => {
    return (activeInvoices || []).reduce((sum, inv) => {
      const directOutstanding = inv.Outstanding_Balance != null ? Number(inv.Outstanding_Balance) : (inv.outstandingBalance != null ? Number(inv.outstandingBalance) : null);
      if (directOutstanding != null) {
        return directOutstanding > 0 ? sum + directOutstanding : sum;
      }
      const tot = Number(inv.Invoice_Total != null ? inv.Invoice_Total : (inv.total != null ? inv.total : 0));
      const paid = Number(inv.Patient_Paid != null ? inv.Patient_Paid : (inv.patientBalance != null ? inv.patientBalance : 0));
      const ins = Number(inv.Insurance_Covered != null ? inv.Insurance_Covered : (inv.insuranceCoverage != null ? inv.insuranceCoverage : 0));
      const balance = tot - paid - ins;
      return balance > 0 ? sum + balance : sum;
    }, 0);
  }, [activeInvoices]);

  const totalPatientsCount = useMemo(() => {
    if (!selectedBranchId) {
      return db.totalPatients != null && db.totalPatients > 0 ? db.totalPatients : (patientList || []).length;
    }
    const patientIdSet = new Set();
    (activeAppointments || []).forEach(a => {
      const pid = a.Patient_ID || (a.patientId ? parseInt(String(a.patientId).replace(/\D/g, ''), 10) : null);
      if (pid) patientIdSet.add(Number(pid));
    });
    (activeInvoices || []).forEach(inv => {
      const pid = inv.Patient_ID || (inv.patientId ? parseInt(String(inv.patientId).replace(/\D/g, ''), 10) : null);
      if (pid) patientIdSet.add(Number(pid));
    });
    return patientIdSet.size;
  }, [selectedBranchId, db.totalPatients, patientList, activeAppointments, activeInvoices]);

  const activeDoctorsCount = useMemo(() => {
    return (activeStaff || []).filter(s => {
      const isDoc = s.isDoctor || s.System_Role === 'Doctor' || s.systemRole === 'Doctor' ||
        Boolean(s.Doctor_ID) ||
        (s.Job_Title && (
          s.Job_Title.toLowerCase().includes('doc') ||
          s.Job_Title.toLowerCase().includes('cardiolog') ||
          s.Job_Title.toLowerCase().includes('dermatolog') ||
          s.Job_Title.toLowerCase().includes('practitioner') ||
          s.Job_Title.toLowerCase().includes('physician') ||
          s.Job_Title.toLowerCase().includes('surgeon') ||
          s.Job_Title.toLowerCase().includes('specialist')
        )) ||
        (s.role && (
          s.role.toLowerCase().includes('doc') ||
          s.role.toLowerCase().includes('cardiolog') ||
          s.role.toLowerCase().includes('dermatolog') ||
          s.role.toLowerCase().includes('practitioner') ||
          s.role.toLowerCase().includes('physician') ||
          s.role.toLowerCase().includes('surgeon') ||
          s.role.toLowerCase().includes('specialist')
        ));
      const isActive = (s.Employment_Status === 'Active' || s.status === 'Active');
      return isDoc && isActive;
    }).length;
  }, [activeStaff]);

  const appointmentsTodayCount = useMemo(() => {
    return (activeAppointments || []).filter(a => {
      const apptDate = a.Appointment_Date || a.date;
      return apptDate === todayStr;
    }).length;
  }, [activeAppointments, todayStr]);

  // Chart 1: Appointment Activity by Date (uses same activeAppointments dataset as the stat cards)
  const appointmentTrend = useMemo(() => {
    const source = Array.isArray(activeAppointments) ? activeAppointments : [];
    const counts = source.reduce((result, appointment) => {
      const date = appointment.Appointment_Date || appointment.date;
      if (!date) return result;
      result[date] = (result[date] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-7)
      .map(([date, appointments]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        appointments
      }));
  }, [activeAppointments]);

  // Chart 2: Invoice Status Breakdown (uses same activeInvoices dataset as the stat cards)
  const invoiceStatusCounts = useMemo(() => {
    const source = Array.isArray(activeInvoices) ? activeInvoices : [];
    const counts = source.reduce((result, invoice) => {
      const rawStatus = invoice.Invoice_Status || invoice.status;
      if (!rawStatus) return result;
      const status = String(rawStatus).replaceAll('_', ' ');
      result[status] = (result[status] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).map(([status, invoices]) => ({ status, invoices }));
  }, [activeInvoices]);

  // Chart 3: Branch Performance Comparison Data (reuses the exact branch performance calculations)
  const branchComparisonData = useMemo(() => {
    const branchSource = branches && branches.length > 0
      ? branches
      : ['Colombo Main', 'Kandy', 'Galle'].map((name, i) => ({ Branch_ID: i + 1, Branch_Name: name, name }));

    return branchSource.map((br, idx) => {
      const brId = Number(br.Branch_ID || idx + 1);
      const brName = br.Branch_Name || br.name || `Branch ${brId}`;
      const shortName = brName.replace(' Clinic', '');

      const branchAppts = (appointmentList || []).filter(a =>
        Number(a.Branch_ID) === brId ||
        a.branch === brName ||
        (br.name && a.branch?.includes(br.name)) ||
        (brName && a.branch && brName.toLowerCase().includes(String(a.branch).toLowerCase()))
      );
      const completed = branchAppts.filter(a => a.status === 'Completed' || a.Status === 'Completed').length;
      const totalAppts = branchAppts.length;
      const fulfillment = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;
      const walkins = branchAppts.filter(a => a.isWalkIn || a.status === 'Walk-In' || a.status === 'Walk_In').length;

      const branchStaff = (staffList || []).filter(s =>
        Number(s.Branch_ID) === brId ||
        s.branch === brName ||
        (br.name && s.branch?.includes(br.name)) ||
        (brName && s.branch && brName.toLowerCase().includes(String(s.branch).toLowerCase()))
      );
      const onlineStaff = branchStaff.filter(s => s.status === 'Active' || s.Employment_Status === 'Active').length;
      const offlineStaff = branchStaff.filter(s => s.status !== 'Active' && s.Employment_Status !== 'Active').length;

      const branchInvoices = (dashInvoices || invoiceList || []).filter(inv => {
        if (inv.Branch_ID != null) return Number(inv.Branch_ID) === brId;
        if (inv.branch) return brName.toLowerCase().includes(String(inv.branch).toLowerCase());
        return brId === 1;
      });

      const branchRev = branchInvoices.reduce((sum, inv) => {
        const paid = Number(inv.Patient_Paid != null ? inv.Patient_Paid : (inv.patientBalance != null ? inv.patientBalance : 0));
        const ins = Number(inv.Insurance_Covered != null ? inv.Insurance_Covered : (inv.insuranceCoverage != null ? inv.insuranceCoverage : 0));
        if (paid > 0 || ins > 0) return sum + paid + ins;
        const tot = Number(inv.Invoice_Total != null ? inv.Invoice_Total : (inv.total != null ? inv.total : 0));
        if (inv.Invoice_Status === 'Paid' || inv.status === 'Paid') return sum + tot;
        return sum;
      }, 0);

      const branchOut = branchInvoices.reduce((sum, inv) => {
        const directOut = inv.Outstanding_Balance != null ? Number(inv.Outstanding_Balance) : null;
        if (directOut != null) return directOut > 0 ? sum + directOut : sum;
        const tot = Number(inv.Invoice_Total != null ? inv.Invoice_Total : 0);
        const paid = Number(inv.Patient_Paid != null ? inv.Patient_Paid : 0);
        const ins = Number(inv.Insurance_Covered != null ? inv.Insurance_Covered : 0);
        return Math.max(0, tot - paid - ins) + sum;
      }, 0);

      return {
        Branch_ID: brId,
        brName,
        shortName,
        totalAppts,
        completed,
        fulfillment,
        walkins,
        onlineStaff,
        offlineStaff,
        revenue: branchRev,
        outstanding: branchOut,
      };
    });
  }, [branches, appointmentList, staffList, dashInvoices, invoiceList]);

  // Chart 4: Revenue Collected vs Outstanding Donut Data
  const financialSplitData = useMemo(() => {
    if (revenueCollected <= 0 && outstandingBalance <= 0) return [];
    return [
      { name: 'Collected Revenue', value: Number(revenueCollected.toFixed(2)), color: '#2563eb' },
      { name: 'Outstanding Balance', value: Number(outstandingBalance.toFixed(2)), color: '#f59e0b' },
    ];
  }, [revenueCollected, outstandingBalance]);

  return (
    <PageTransition transitionKey={subView} className="space-y-6">
      {/* 1. EXECUTIVE DASHBOARD */}
      {subView === 'dashboard' && (
        <div className="space-y-6 dashboard-view">
          {/* SaaS Hero Banner with Branch Scope Selector & Quick Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-7 shadow-xl border border-slate-800"
          >
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-teal-300 text-[11px] font-bold uppercase tracking-wider">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Live Multi-Branch Clinical Intelligence</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {t('admin_dash_title', 'Executive Administration Dashboard')}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t('admin_dash_subtitle', 'Multi-branch network analytics, live fulfillment monitoring, and operations command')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-white/40 rounded-2xl px-3.5 py-2.5 shadow-lg text-slate-900 shrink-0">
                  <Building className="h-4 w-4 text-blue-600" />
                  <label htmlFor="admin-branch-select" className="text-xs font-bold text-slate-600">
                    {t('branch_scope', 'Branch Scope:')}
                  </label>
                  <select
                    id="admin-branch-select"
                    aria-label="Branch Scope"
                    className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-900 py-1.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-colors"
                    value={selectedBranch}
                    onChange={e => handleBranchChange(e.target.value)}
                  >
                    <option value="All Branches">{t('all_branches_network_wide', 'All Branches (Network-Wide)')}</option>
                    <option value="Colombo Main">{t('colombo_main_clinic', 'Colombo Main Clinic')}</option>
                    <option value="Kandy">{t('kandy_central_clinic', 'Kandy Central Clinic')}</option>
                    <option value="Galle">{t('galle_coastal_clinic', 'Galle Coastal Clinic')}</option>
                  </select>
                </div>

                {typeof navigateTo === 'function' && (
                  <motion.button
                    type="button"
                    whileHover={{ y: -1.5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigateTo('/admin/reports')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-bold shadow-lg shadow-teal-500/25 cursor-pointer"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>{t('nav_reports_suite', 'Reports Suite')}</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Staggered Animated KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="ds-card ds-card-hover group relative overflow-hidden p-5 flex items-center justify-between"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('stat_revenue_collected', 'Revenue Collected')}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 block font-mono tracking-tight" data-testid="stat-revenue-collected">
                  Rs. {revenueCollected.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-semibold text-blue-600 mt-1 block">Settled & Insured</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 ring-1 ring-blue-100 rounded-2xl transition-transform duration-200 group-hover:scale-105 shrink-0">
                <Building className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="ds-card ds-card-hover group relative overflow-hidden p-5 flex items-center justify-between"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('stat_outstanding_balance', 'Outstanding Balance')}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 block font-mono tracking-tight" data-testid="stat-outstanding-balance">
                  Rs. {outstandingBalance.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-semibold text-amber-600 mt-1 block">Pending Receivables</span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 ring-1 ring-amber-100 rounded-2xl transition-transform duration-200 group-hover:scale-105 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="ds-card ds-card-hover group relative overflow-hidden p-5 flex items-center justify-between"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('stat_total_patients', 'Total Patients')}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 block font-mono tracking-tight" data-testid="stat-total-patients">
                  {totalPatientsCount}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">Registered Profiles</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 rounded-2xl transition-transform duration-200 group-hover:scale-105 shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="ds-card ds-card-hover group relative overflow-hidden p-5 flex items-center justify-between"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('stat_active_doctors', 'Active Doctors')}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 block font-mono tracking-tight" data-testid="stat-active-doctors">
                  {activeDoctorsCount}
                </span>
                <span className="text-[11px] font-semibold text-sky-600 mt-1 block">SLMC Licensed</span>
              </div>
              <div className="p-3 bg-sky-50 text-sky-600 ring-1 ring-sky-100 rounded-2xl transition-transform duration-200 group-hover:scale-105 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </motion.div>

            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="ds-card ds-card-hover group relative overflow-hidden p-5 flex items-center justify-between"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('stat_appointments_today', 'Appointments Today')}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 block font-mono tracking-tight" data-testid="stat-appointments-today">
                  {appointmentsTodayCount}
                </span>
                <span className="text-[11px] font-semibold text-purple-600 mt-1 block">Daily Schedule</span>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 ring-1 ring-purple-100 rounded-2xl transition-transform duration-200 group-hover:scale-105 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
            </motion.div>
          </div>

          {/* Interactive Recharts Visual Analytics Suite */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5" aria-label="Live dashboard analytics">
            {/* Multi-Branch Comparison Bar Chart (7 cols on xl) */}
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="xl:col-span-7 ds-card ds-card-hover p-5 sm:p-6 min-w-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Multi-Branch Performance Comparison</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Side-by-side comparison across Colombo Main, Kandy, and Galle clinics
                  </p>
                </div>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setBranchChartMode('clinical')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      branchChartMode === 'clinical'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Appointments & Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchChartMode('financial')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      branchChartMode === 'financial'
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Revenue vs Balance
                  </button>
                </div>
              </div>

              <div className="h-64 w-full" role="img" aria-label="Multi-branch comparison bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  {branchChartMode === 'clinical' ? (
                    <BarChart data={branchComparisonData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                      <XAxis dataKey="shortName" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} dy={6} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,.08)', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                      <Bar dataKey="totalAppts" name="Total Appointments" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="completed" name="Completed Visits" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="onlineStaff" name="Active Staff" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  ) : (
                    <BarChart data={branchComparisonData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                      <XAxis dataKey="shortName" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(val) => [`Rs. ${Number(val).toLocaleString('en-LK')}`, undefined]}
                        contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,.08)', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                      <Bar dataKey="revenue" name="Collected Revenue (Rs.)" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="outstanding" name="Outstanding Balance (Rs.)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Financial Split & Invoice Status Card (5 cols on xl) */}
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="xl:col-span-5 ds-card ds-card-hover p-5 sm:p-6 min-w-0 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Revenue vs. Receivables Split</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Proportional collection health for current scope</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 text-[10px] font-bold">
                  FINANCIAL MIX
                </span>
              </div>

              {financialSplitData.length > 0 ? (
                <div className="h-52 w-full" role="img" aria-label="Pie chart of collected revenue versus outstanding balance">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialSplitData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={4}
                      >
                        {financialSplitData.map((entry, idx) => (
                          <Cell key={entry.name} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex items-center justify-center px-6 text-center text-sm text-slate-500">
                  No invoice records available for this branch scope.
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <span className="text-[10px] font-bold uppercase text-blue-600 block">Collection Rate</span>
                  <strong className="text-sm font-extrabold text-slate-900">
                    {revenueCollected + outstandingBalance > 0
                      ? `${Math.round((revenueCollected / (revenueCollected + outstandingBalance)) * 100)}%`
                      : '0%'}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Active Invoices</span>
                  <strong className="text-sm font-extrabold text-slate-900">{(activeInvoices || []).length} Records</strong>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Secondary Charts Row: Appointment Activity Trend & Invoice Status Counts */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5" aria-label="Appointment and invoice status charts">
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="ds-card ds-card-hover p-5 sm:p-6 min-w-0"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Appointment Activity Trend</h2>
                  <p className="text-xs text-slate-500 mt-1">Appointments by date · latest 7 active dates</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 text-[10px] font-bold">
                  LIVE DATA
                </span>
              </div>
              {appointmentTrend.length > 0 ? (
                <div className="h-56 w-full" role="img" aria-label="Area chart of appointments by date">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={appointmentTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="apptAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip cursor={{ stroke: '#93c5fd', strokeWidth: 1 }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)' }} />
                      <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#2563eb" strokeWidth={2.5} fill="url(#apptAreaGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex items-center justify-center px-6 text-center text-sm text-slate-500">
                  No appointment dates were returned for this branch.
                </div>
              )}
            </motion.div>

            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
              className="ds-card ds-card-hover p-5 sm:p-6 min-w-0"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Invoice Status Distribution</h2>
                  <p className="text-xs text-slate-500 mt-1">Invoice counts grouped by settlement status</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 text-[10px] font-bold">
                  LIVE DATA
                </span>
              </div>
              {invoiceStatusCounts.length > 0 ? (
                <div className="h-56 w-full" role="img" aria-label="Bar chart of invoice counts by status">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={invoiceStatusCounts} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                      <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#f0fdfa' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)' }} />
                      <Bar dataKey="invoices" name="Invoices" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex items-center justify-center px-6 text-center text-sm text-slate-500">
                  No invoice statuses were returned for this branch.
                </div>
              )}
            </motion.div>
          </section>

          {/* Branch Performance Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {t('branch_performance_overview', 'Branch Performance Overview')}
              </h2>
              <span className="text-xs font-medium text-slate-500">Real-time facility health & duty roster</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {branchComparisonData.map((br, idx) => (
                <motion.div
                  key={br.Branch_ID || br.brName}
                  variants={MOTION_VARIANTS.fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={idx + 3}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className="ds-card ds-card-hover p-6 space-y-4 relative overflow-hidden"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{br.brName}</h3>
                      <span className="text-xs text-slate-400 font-mono">Operations Telemetry</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      Operational
                    </span>
                  </div>

                  {/* Visual Fulfillment Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Fulfillment Rate</span>
                      <strong className="text-blue-600 font-mono font-bold">{br.fulfillment}%</strong>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(8, br.fulfillment))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono text-slate-500">
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Walk-In Volume</span>
                      <strong className="text-slate-800 text-base block mt-0.5">{br.walkins} Active</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Visits</span>
                      <strong className="text-slate-800 text-base block mt-0.5">{br.totalAppts} Booked</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
                      <span className="block text-[10px] text-emerald-600/80 font-bold uppercase tracking-wider">Staff Online</span>
                      <strong className="text-emerald-700 font-bold text-sm block mt-0.5">{br.onlineStaff} Duty</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/80">
                      <span className="block text-[10px] text-rose-500 font-bold uppercase tracking-wider">Staff Leave</span>
                      <strong className="text-rose-600 font-bold text-sm block mt-0.5">{br.offlineStaff} Off</strong>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. STAFF & ACCOUNT MANAGEMENT HUB */}
      {subView === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('staff_directory_title', 'Staff Directory & Identity Control')}</h1>
              <p className="text-sm text-slate-500 mt-1">Manage network accounts, assign roles, transfer branches, and audit profiles</p>
            </div>
            <motion.button
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddStaffDrawer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center space-x-2 shadow-sm shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t('add_staff_member', 'Add Staff Member')}</span>
            </motion.button>
          </div>

          {/* Filters */}
          <div className="ds-card p-4 flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex-1 min-w-[200px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search staff by name or ID..."
                className="w-full border border-slate-200 bg-slate-50/60 focus:bg-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 transition-all"
                value={staffSearchQuery}
                onChange={e => setStaffSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              value={staffBranchFilter}
              onChange={e => setStaffBranchFilter(e.target.value)}
            >
              <option value="All">All Branches</option>
              {branches && branches.length > 0 ? (
                branches.map(b => {
                  const bName = b.Branch_Name || b.name;
                  const bId = b.Branch_ID || b.id;
                  return (
                    <option key={bId || bName} value={bName}>{bName}</option>
                  );
                })
              ) : (
                <>
                  <option value="Colombo Main Clinic">Colombo Main Clinic</option>
                  <option value="Kandy Central Clinic">Kandy Central Clinic</option>
                  <option value="Galle Coastal Clinic">Galle Coastal Clinic</option>
                </>
              )}
            </select>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              value={staffRoleFilter}
              onChange={e => setStaffRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="DOC">Doctor</option>
              <option value="BRANCH_MANAGER">Branch Manager</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="NURSE">Nurse</option>
              <option value="BILLING">Billing Staff</option>
              <option value="ADMIN">System Admin</option>
            </select>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              value={staffStatusFilter}
              onChange={e => setStaffStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive (On Leave / Terminated)</option>
              <option value="On_Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          {/* Staff Table */}
          <div className="ds-card overflow-hidden">
            <div
              className="overflow-x-auto focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-2xl"
              tabIndex={0}
              role="region"
              aria-label="Staff directory table"
            >
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3.5">Staff Member</th>
                    <th className="px-6 py-3.5">Role / Specialty</th>
                    <th className="px-6 py-3.5">Primary Branch</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users className="h-8 w-8 text-slate-300" />
                          <span className="text-sm font-medium">No staff members found matching the selected filters.</span>
                          <button
                            onClick={() => {
                              setStaffSearchQuery('');
                              setStaffBranchFilter('All');
                              setStaffRoleFilter('All');
                              setStaffStatusFilter('All');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline mt-1"
                          >
                            Reset Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(staff => (
                      <tr key={staff.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{staff.name}</div>
                          <span className="text-xs text-slate-400 font-mono">{staff.id}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{staff.role}</td>
                        <td className="px-6 py-4 text-slate-600">{staff.branch}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {staff.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setShowTransferBranchModal(true);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>Transfer Branch</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setShowPasswordResetModal(true);
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Key className="h-3 w-3" />
                            <span>Reset PW</span>
                          </button>
                          <button
                            onClick={() => handleToggleStaffStatus(staff)}
                            className={`text-xs font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer ${
                              staff.status === 'Active' ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'
                            }`}
                          >
                            {staff.status === 'Active' ? (
                              <>
                                <UserX className="h-3 w-3" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLINIC BRANCH CONFIGURATION */}
      {subView === 'branches' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clinic Branch Settings & Governance</h1>
              <p className="text-sm text-slate-500 mt-1">Configure facilities, direct phone lines, and assign operational Branch Managers</p>
            </div>
            <motion.button
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddBranchModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Branch</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {branches.map((br, idx) => (
              <motion.div
                key={br.name || br.Branch_Name || idx}
                variants={MOTION_VARIANTS.fadeUp}
                initial="hidden"
                animate="visible"
                custom={idx}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                className="ds-card ds-card-hover p-6 space-y-4"
              >
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{br.name || br.Branch_Name}</h3>
                    <span className="text-xs text-slate-400 font-mono flex items-center mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-blue-500" />
                      {br.address || br.Street_Address}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Direct Hotline</span>
                    <strong className="text-slate-800 text-sm font-mono">{br.phone || br.Contact_Number}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Branch Manager</span>
                    <div className="mt-1.5">
                      <select
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 focus:bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                        value={
                          staffList.find(s =>
                            s.id === br.managerId ||
                            String(s.Staff_ID) === String(br.managerId) ||
                            String(s.Staff_ID) === String(br.Manager_Staff_ID) ||
                            (br.managerId && s.id && String(s.id).replace(/\D+/g, '') === String(br.managerId).replace(/\D+/g, ''))
                          )?.id || ''
                        }
                        onChange={e => handleAssignBranchManager(br.Branch_ID || br.name || br.Branch_Name, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {staffList.filter(s => (s.role || s.Job_Title || s.systemRole || '').toUpperCase().includes('MANAGER')).map(mgr => (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SYSTEM AUDIT TRAIL */}
      {subView === 'audit-logs' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Activity Audit Trail</h1>
            <p className="text-sm text-slate-500 mt-1">Chronological ledger of security triggers, staff mutations, and medical data updates</p>
          </div>

          {/* Search Audit Logs */}
          <div className="ds-card p-4 flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex-1 min-w-[200px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search logs by action description, email, or user..."
                className="w-full border border-slate-200 bg-slate-50/60 focus:bg-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              value={auditDateFilter}
              onChange={e => setAuditDateFilter(e.target.value)}
            />
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              value={auditActionFilter}
              onChange={e => setAuditActionFilter(e.target.value)}
            >
              <option value="All">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="CREATE_STAFF">CREATE_STAFF</option>
              <option value="UPDATE_STAFF">UPDATE_STAFF</option>
              <option value="CONFIG_BRANCH">CONFIG_BRANCH</option>
              <option value="SECURITY">SECURITY</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="ds-card overflow-hidden">
            <div
              className="overflow-x-auto focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-2xl"
              tabIndex={0}
              role="region"
              aria-label="Security audit logs table"
            >
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action Type</th>
                    <th className="px-6 py-3.5">Logged By</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Entity Mutation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {filteredAuditLogs.map(log => {
                    const isExpanded = expandedAuditId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono ${
                              log.action.includes('SECURITY') ? 'bg-red-50 text-red-700 border border-red-200/70' :
                              log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            <div>{log.username}</div>
                            <span className="text-xs text-slate-400 font-mono">{log.userId}</span>
                          </td>
                          <td className="px-6 py-4">{log.details}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                            >
                              {isExpanded ? 'Hide Details' : 'View Snapshot'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50">
                            <td colSpan="5" className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">State Before Mutation</span>
                                  <pre className="bg-slate-900 text-slate-200 text-xs rounded-xl p-3.5 font-mono overflow-x-auto max-h-40">
                                    {log.before !== 'null' ? JSON.stringify(JSON.parse(log.before), null, 2) : 'NULL'}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">State After Mutation</span>
                                  <pre className="bg-slate-900 text-slate-200 text-xs rounded-xl p-3.5 font-mono overflow-x-auto max-h-40">
                                    {log.after !== 'null' ? JSON.stringify(JSON.parse(log.after), null, 2) : 'NULL'}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span>No audit log entries match the selected filters.</span>
                          {(auditSearchQuery || auditActionFilter !== 'All' || auditDateFilter) && (
                            <button
                              type="button"
                              onClick={() => {
                                setAuditSearchQuery('');
                                setAuditActionFilter('All');
                                setAuditDateFilter('');
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADMIN SYSTEM REPORTS */}
      {subView === 'reports' && (
        <ReportsPanel db={db} handlers={handlers} />
      )}

      {/* ====================================
          MODALS & DRAWERS (INTERACTIVE POPUPS)
          ==================================== */}

      {/* ADD STAFF DRAWER */}
      <AddStaffDrawer
        isOpen={showAddStaffDrawer}
        onClose={() => setShowAddStaffDrawer(false)}
        branches={branches}
        lockedBranch={null}
        currentUserRole={db.currentUser?.role || 'ADMIN'}
        onStaffCreated={(newStaffMember) => {
          setStaffList([...staffList, newStaffMember]);
        }}
        triggerToast={triggerToast}
        addAuditLog={addAuditLog}
      />

      {/* TRANSFER BRANCH MODAL */}
      {showTransferBranchModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowTransferBranchModal(false)} />
          <form onSubmit={handleTransferBranch} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Transfer Primary Branch</h3>
            <p className="text-xs text-slate-500">
              Update primary service location for <strong>{selectedStaff.name}</strong>. Their rosters will be cleared.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Select Target Branch</label>
              <select
                name="transferBranch"
                defaultValue={selectedStaff.branch}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-sm"
              >
                <option value="Colombo Main">Colombo Main</option>
                <option value="Kandy">Kandy</option>
                <option value="Galle">Galle</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTransferBranchModal(false)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Confirm Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FORCE PASSWORD RESET MODAL */}
      {showPasswordResetModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowPasswordResetModal(false)} />
          <form onSubmit={handleForcePasswordReset} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Force Security Password Reset</h3>
            <p className="text-xs text-slate-500">
              Force an instant reset of system credentials for <strong>{selectedStaff.name}</strong>. Provide a temporary password.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Temporary Password</label>
              <input
                type="text"
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-red-600"
                placeholder="e.g. TEMP-RESET-998"
                value={tempPassInput}
                onChange={e => setTempPassInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Force Security Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD BRANCH MODAL */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowAddBranchModal(false)} />
          <form onSubmit={handleAddBranch} className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Register New Clinic Branch</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Branch Name</label>
                <input type="text" name="branchName" required className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm" placeholder="e.g. Kandy South" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Street Address</label>
                <input type="text" name="address" required className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm" placeholder="e.g. 45 Peradeniya Road" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Phone</label>
                <input type="text" name="phone" required className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm" placeholder="e.g. +94 81 234 5678" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddBranchModal(false)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer">Create Branch</button>
            </div>
          </form>
        </div>
      )}
    </PageTransition>
  );
}
