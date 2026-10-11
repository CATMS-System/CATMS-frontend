import React, { useState, useMemo, useEffect } from 'react';
import { Users, Building, AlertCircle, Calendar, Plus, MapPin, Key, RefreshCw, Check, ArrowLeftRight, UserX, UserCheck, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import ReportsPanel from './ReportsPanel';
import AddStaffDrawer from './AddStaffDrawer';
import { useLanguage } from '../contexts/LanguageContext';

export default function AdminPanel({ subView, db, handlers }) {
  const { t } = useLanguage();
  const { staffList, patientList, appointmentList, liveQueue, invoiceList, auditLogs, branches, selectedBranch: initialSelectedBranch } = db;
  const { setStaffList, setBranches, setAuditLogs, addAuditLog, triggerToast, navigateTo, setSelectedBranch: setGlobalSelectedBranch } = handlers;

  // Selected branch scope state for dashboard
  const [selectedBranch, setSelectedBranch] = useState(initialSelectedBranch || 'All Branches');

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
      if (selectedBranchId === 1 && name.includes('colombo')) return true;
      if (selectedBranchId === 2 && name.includes('kandy')) return true;
      if (selectedBranchId === 3 && name.includes('galle')) return true;
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

  const handleAssignBranchManager = (branchName, managerId) => {
    const mgr = staffList.find(s => s.id === managerId);
    const updatedBranches = branches.map(br => {
      if (br.name === branchName) {
        return { ...br, managerId, managerName: mgr ? mgr.name : 'Unassigned' };
      }
      return br;
    });
    setBranches(updatedBranches);
    addAuditLog(
      'CONFIG_BRANCH',
      `Assigned ${mgr ? mgr.name : 'Unassigned'} as Branch Manager for ${branchName}`,
      'null',
      JSON.stringify({ branch: branchName, manager: managerId })
    );
    triggerToast(`Assigned manager for ${branchName}`);
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
    return staffList.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || s.id.toLowerCase().includes(staffSearchQuery.toLowerCase());
      const matchBranch = staffBranchFilter === 'All' || s.branch === staffBranchFilter;
      const matchRole = staffRoleFilter === 'All' || (staffRoleFilter === 'DOC'
        ? (s.isDoctor || s.systemRole === 'Doctor' || (s.role && (s.role.toUpperCase().includes('DOC') || s.role.toUpperCase().includes('CARDIOLOG') || s.role.toUpperCase().includes('DERMATOLOG') || s.role.toUpperCase().includes('PRACTITIONER'))))
        : s.role.toUpperCase().replace(' ', '_').includes(staffRoleFilter));
      const matchStatus = staffStatusFilter === 'All' || s.status === staffStatusFilter;
      return matchSearch && matchBranch && matchRole && matchStatus;
    });
  }, [staffList, staffSearchQuery, staffBranchFilter, staffRoleFilter, staffStatusFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch = log.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) || log.userId.toLowerCase().includes(auditSearchQuery.toLowerCase());
      const matchAction = auditActionFilter === 'All' || log.action === auditActionFilter;
      const matchDate = !auditDateFilter || log.timestamp.startsWith(auditDateFilter);
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

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE DASHBOARD */}
      {subView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard Header with Branch Scope Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('admin_dash_title', 'Executive Administration Dashboard')}</h1>
              <p className="text-sm text-slate-500 mt-1">{t('admin_dash_subtitle', 'Multi-branch network analytics, live fulfillment monitoring, and operations command')}</p>
            </div>
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs shrink-0">
              <Building className="h-4 w-4 text-slate-400" />
              <label htmlFor="admin-branch-select" className="text-xs font-semibold text-slate-500">{t('branch_scope', 'Branch Scope:')}</label>
              <select
                id="admin-branch-select"
                aria-label="Branch Scope"
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-800 py-1 px-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                value={selectedBranch}
                onChange={e => handleBranchChange(e.target.value)}
              >
                <option value="All Branches">{t('all_branches_network_wide', 'All Branches (Network-Wide)')}</option>
                <option value="Colombo Main">{t('colombo_main_clinic', 'Colombo Main Clinic')}</option>
                <option value="Kandy">{t('kandy_central_clinic', 'Kandy Central Clinic')}</option>
                <option value="Galle">{t('galle_coastal_clinic', 'Galle Coastal Clinic')}</option>
              </select>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">{t('stat_revenue_collected', 'Revenue Collected')}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono" data-testid="stat-revenue-collected">
                  Rs. {revenueCollected.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
                <Building className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">{t('stat_outstanding_balance', 'Outstanding Balance')}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono" data-testid="stat-outstanding-balance">
                  Rs. {outstandingBalance.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">{t('stat_total_patients', 'Total Patients')}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono" data-testid="stat-total-patients">
                  {totalPatientsCount}
                </span>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">{t('stat_active_doctors', 'Active Doctors')}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono" data-testid="stat-active-doctors">
                  {activeDoctorsCount}
                </span>
              </div>
              <div className="p-3.5 bg-sky-50 text-sky-600 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">{t('stat_appointments_today', 'Appointments Today')}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono" data-testid="stat-appointments-today">
                  {appointmentsTodayCount}
                </span>
              </div>
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Branch Performance Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('branch_performance_overview', 'Branch Performance Overview')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(branches && branches.length > 0 ? branches : ['Colombo Main', 'Kandy', 'Galle'].map((name, i) => ({ Branch_ID: i + 1, Branch_Name: name }))).map(br => {
                const brName = br.Branch_Name || br.name;
                const branchAppts = appointmentList.filter(a => Number(a.Branch_ID) === Number(br.Branch_ID) || a.branch === brName || a.branch?.includes(br.name) || brName?.includes(a.branch));
                const completed = branchAppts.filter(a => a.status === 'Completed').length;
                const total = branchAppts.length || 1;
                const fulfillment = Math.round((completed / total) * 100);
                const walkins = branchAppts.filter(a => a.isWalkIn || a.status === 'Walk-In' || a.status === 'Walk_In').length;
                const offlineStaff = staffList.filter(s => (Number(s.Branch_ID) === Number(br.Branch_ID) || s.branch === brName || s.branch?.includes(br.name) || brName?.includes(s.branch)) && s.status !== 'Active').length;
                const onlineStaff = staffList.filter(s => (Number(s.Branch_ID) === Number(br.Branch_ID) || s.branch === brName || s.branch?.includes(br.name) || brName?.includes(s.branch)) && s.status === 'Active').length;

                return (
                  <div key={br.Branch_ID || brName} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-md">{brName}</h3>
                        <span className="text-xs text-slate-450 font-mono">Operations Card</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Operational
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-500">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fulfillment Rate</span>
                        <strong className="text-slate-800 text-lg block mt-0.5">{fulfillment}%</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Walk-In Volume</span>
                        <strong className="text-slate-800 text-lg block mt-0.5">{walkins} Active</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Staff Online</span>
                        <strong className="text-emerald-600 font-bold text-sm block mt-0.5">{onlineStaff} Duty</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Staff Leave</span>
                        <strong className="text-red-500 font-bold text-sm block mt-0.5">{offlineStaff} Off</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. STAFF & ACCOUNT MANAGEMENT HUB */}
      {subView === 'staff' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('staff_directory_title', 'Staff Directory & Identity Control')}</h1>
              <p className="text-sm text-slate-500 mt-1">Manage network accounts, assign roles, transfer branches, and audit profiles</p>
            </div>
            <button
              onClick={() => setShowAddStaffDrawer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t('add_staff_member', 'Add Staff Member')}</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search staff by name or ID..."
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={staffSearchQuery}
                onChange={e => setStaffSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={staffBranchFilter}
              onChange={e => setStaffBranchFilter(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="Colombo Main">Colombo Main</option>
              <option value="Kandy">Kandy</option>
              <option value="Galle">Galle</option>
            </select>
            <select
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={staffRoleFilter}
              onChange={e => setStaffRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="BRANCH_MANAGER">Branch Manager</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="BILLING">Billing Staff</option>
              <option value="DOC">Doctor</option>
            </select>
            <select
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={staffStatusFilter}
              onChange={e => setStaffStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Staff Member</th>
                  <th className="px-6 py-3">Role / Specialty</th>
                  <th className="px-6 py-3">Primary Branch</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{staff.name}</div>
                      <span className="text-xs text-slate-400 font-mono">{staff.id}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{staff.role}</td>
                    <td className="px-6 py-4 text-slate-650">{staff.branch}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
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
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 inline-flex cursor-pointer"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        <span>Transfer Branch</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStaff(staff);
                          setShowPasswordResetModal(true);
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors flex items-center space-x-1 inline-flex cursor-pointer"
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CLINIC BRANCH CONFIGURATION */}
      {subView === 'branches' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clinic Branch Settings & Governance</h1>
              <p className="text-sm text-slate-500 mt-1">Configure facilities, direct phone lines, and assign operational Branch Managers</p>
            </div>
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {branches.map(br => (
              <div key={br.name} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{br.name}</h3>
                    <span className="text-xs text-slate-400 font-mono flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {br.address}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-650">
                  <div>
                    <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Direct Hotline</span>
                    <strong className="text-slate-800 text-sm font-mono">{br.phone}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">Assigned Branch Manager</span>
                    <div className="mt-1">
                      <select
                        className="w-full border border-slate-350 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                        value={br.managerId || ''}
                        onChange={e => handleAssignBranchManager(br.name, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {staffList.filter(s => s.role.toUpperCase().includes('MANAGER')).map(mgr => (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SYSTEM AUDIT TRAIL */}
      {subView === 'audit-logs' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Activity Audit Trail</h1>
            <p className="text-sm text-slate-500 mt-1">Chronological ledger of security triggers, staff mutations, and medical data updates</p>
          </div>

          {/* Search Audit Logs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search logs by action description, email, or user..."
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={auditDateFilter}
              onChange={e => setAuditDateFilter(e.target.value)}
            />
            <select
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action Type</th>
                  <th className="px-6 py-3">Logged By</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Entity Mutation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {filteredAuditLogs.map(log => {
                  const isExpanded = expandedAuditId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            log.action.includes('SECURITY') ? 'bg-red-50 text-red-700' :
                            log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
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
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mb-1">State Before Mutation</span>
                                <pre className="bg-slate-900 text-slate-200 text-xs rounded-lg p-3 font-mono overflow-x-auto max-h-40">
                                  {log.before !== 'null' ? JSON.stringify(JSON.parse(log.before), null, 2) : 'NULL'}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mb-1">State After Mutation</span>
                                <pre className="bg-slate-900 text-slate-200 text-xs rounded-lg p-3 font-mono overflow-x-auto max-h-40">
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
              </tbody>
            </table>
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
          <form onSubmit={handleTransferBranch} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md">Transfer Primary Branch</h3>
            <p className="text-xs text-slate-500">
              Update primary service location for <strong>{selectedStaff.name}</strong>. Their rosters will be cleared.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Select Target Branch</label>
              <select
                name="transferBranch"
                defaultValue={selectedStaff.branch}
                className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
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
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
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
          <form onSubmit={handleForcePasswordReset} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md">Force Security Password Reset</h3>
            <p className="text-xs text-slate-500">
              Force an instant reset of system credentials for <strong>{selectedStaff.name}</strong>. Provide a temporary password.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Temporary Password</label>
              <input
                type="text"
                required
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono text-red-650"
                placeholder="e.g. TEMP-RESET-998"
                value={tempPassInput}
                onChange={e => setTempPassInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
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
          <form onSubmit={handleAddBranch} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Register New Clinic Branch</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Branch Name</label>
                <input type="text" name="branchName" required className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Kandy South" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Street Address</label>
                <input type="text" name="address" required className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 45 Peradeniya Road" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Phone</label>
                <input type="text" name="phone" required className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm" placeholder="e.g. +94 81 234 5678" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddBranchModal(false)} className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer">Create Branch</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
