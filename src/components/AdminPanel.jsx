import React, { useState, useMemo } from 'react';
import { Users, Building, AlertCircle, Calendar, Plus, MapPin, Key, RefreshCw, Check, ArrowLeftRight, UserX, UserCheck, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import ReportsPanel from './ReportsPanel';

export default function AdminPanel({ subView, db, handlers }) {
  const { staffList, patientList, appointmentList, liveQueue, invoiceList, auditLogs, branches } = db;
  const { setStaffList, setBranches, setAuditLogs, addAuditLog, triggerToast, navigateTo } = handlers;

  // Onboarding Drawer states
  const [showAddStaffDrawer, setShowAddStaffDrawer] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    contact: '',
    email: '',
    role: 'RECEPTIONIST',
    branch: 'Colombo Main',
    license: '',
    consultFee: '1500',
    specialties: [],
    username: '',
    tempPassword: ''
  });

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

  // Specialties list for Step 3
  const SPECIALTIES_OPTIONS = ['General Practice', 'Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Orthopedics', 'ENT'];

  // Handle step-by-step validation
  const handleOnboardingNext = () => {
    if (onboardingStep === 1) {
      if (!onboardingData.firstName || !onboardingData.lastName || !onboardingData.nic || !onboardingData.contact || !onboardingData.email) {
        alert('Please fill out all identity fields.');
        return;
      }
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      if (onboardingData.role === 'DOCTOR') {
        setOnboardingStep(3);
      } else {
        // Skip Step 3, generate credentials automatically for step 4
        setOnboardingData(prev => ({
          ...prev,
          username: `${prev.firstName.toLowerCase()}.${prev.lastName.toLowerCase()}`,
          tempPassword: Math.random().toString(36).substring(2, 10).toUpperCase()
        }));
        setOnboardingStep(4);
      }
    } else if (onboardingStep === 3) {
      if (!onboardingData.license || !onboardingData.consultFee) {
        alert('Please provide license and consultation fee details.');
        return;
      }
      setOnboardingData(prev => ({
        ...prev,
        username: `${prev.firstName.toLowerCase()}.${prev.lastName.toLowerCase()}`,
        tempPassword: Math.random().toString(36).substring(2, 10).toUpperCase()
      }));
      setOnboardingStep(4);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    try {
      const branchObj = branches.find(b => b.Branch_Name === onboardingData.branch || b.name === onboardingData.branch);
      const branchId = branchObj ? (branchObj.Branch_ID || 1) : 1;
      const jobTitle = onboardingData.role === 'DOCTOR' ? (onboardingData.specialties[0] || 'Medical Specialist') : onboardingData.role.replace('_', ' ');

      const payload = {
        First_Name: onboardingData.firstName,
        Last_Name: onboardingData.lastName,
        Job_Title: jobTitle,
        Contact_Number: onboardingData.contact,
        Email: onboardingData.email,
        Employment_Status: 'Active',
        Branch_ID: branchId
      };
      if (onboardingData.username) {
        payload.Username = onboardingData.username;
      }
      if (onboardingData.tempPassword) {
        payload.Password = onboardingData.tempPassword;
      }

      const response = await api.post('/staff', payload);
      const s = response.data;
      
      const newStaffId = `STF-${s.Staff_ID}`;
      const newStaffMember = {
        id: newStaffId,
        Staff_ID: s.Staff_ID,
        staffId: s.Staff_ID,
        Account_ID: s.Account_ID,
        name: `${s.First_Name} ${s.Last_Name}`,
        role: s.Job_Title,
        branch: onboardingData.branch,
        Branch_ID: s.Branch_ID,
        status: s.Employment_Status,
        details: {
          firstName: s.First_Name,
          lastName: s.Last_Name,
          nic: onboardingData.nic,
          contact: s.Contact_Number,
          email: s.Email,
          license: onboardingData.license,
          consultFee: parseFloat(onboardingData.consultFee),
          specialties: onboardingData.specialties,
          username: onboardingData.username
        }
      };

      const updatedStaff = [...staffList, newStaffMember];
      setStaffList(updatedStaff);
      addAuditLog(
        'CREATE_STAFF',
        `Onboarded staff member ${newStaffMember.name} (${newStaffId})`,
        'null',
        JSON.stringify(newStaffMember)
      );

      triggerToast(`Staff member ${newStaffMember.name} successfully created!`);
      setShowAddStaffDrawer(false);
      
      // Reset state
      setOnboardingStep(1);
      setOnboardingData({
        firstName: '',
        lastName: '',
        nic: '',
        contact: '',
        email: '',
        role: 'RECEPTIONIST',
        branch: 'Colombo Main',
        license: '',
        consultFee: '1500',
        specialties: [],
        username: '',
        tempPassword: ''
      });
    } catch (err) {
      console.error("API Error creating staff", err);
      triggerToast(`Failed to create staff member.`);
    }
  };

  const handleToggleSpecialty = (spec) => {
    setOnboardingData(prev => {
      const idx = prev.specialties.indexOf(spec);
      if (idx > -1) {
        return { ...prev, specialties: prev.specialties.filter(s => s !== spec) };
      } else {
        return { ...prev, specialties: [...prev.specialties, spec] };
      }
    });
  };

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
      const matchRole = staffRoleFilter === 'All' || s.role.toUpperCase().replace(' ', '_').includes(staffRoleFilter);
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

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE DASHBOARD */}
      {subView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Executive Administration Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Multi-branch network analytics, live fulfillment monitoring, and operations command</p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Network Revenue</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono">
                  ${invoiceList.reduce((sum, inv) => {
                    if (inv.status === 'Paid') return sum + inv.patientBalance + inv.insuranceCoverage;
                    if (inv.status === 'Partially Paid') return sum + (inv.patientBalance * 0.5) + inv.insuranceCoverage;
                    return sum;
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
                <Building className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Total Patients</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono">
                  {patientList.length}
                </span>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Active Doctors</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono">
                  {staffList.filter(s => (s.role.includes('Doc') || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner') && s.status === 'Active').length}
                </span>
              </div>
              <div className="p-3.5 bg-sky-50 text-sky-600 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Appointments Today</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block font-mono">
                  {appointmentList.filter(a => a.date === todayStr).length}
                </span>
              </div>
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Branch Performance Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Branch Performance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Colombo Main', 'Kandy', 'Galle'].map(brName => {
                const branchAppts = appointmentList.filter(a => a.branch === brName);
                const completed = branchAppts.filter(a => a.status === 'Completed').length;
                const total = branchAppts.length || 1;
                const fulfillment = Math.round((completed / total) * 100);
                const walkins = branchAppts.filter(a => a.isWalkIn || a.status === 'Walk-In').length;
                const offlineStaff = staffList.filter(s => s.branch === brName && s.status !== 'Active').length;
                const onlineStaff = staffList.filter(s => s.branch === brName && s.status === 'Active').length;

                return (
                  <div key={brName} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
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
              <h1 className="text-2xl font-bold text-slate-900">Staff Directory & Identity Control</h1>
              <p className="text-sm text-slate-500 mt-1">Manage network accounts, assign roles, transfer branches, and audit profiles</p>
            </div>
            <button
              onClick={() => {
                setOnboardingStep(1);
                setShowAddStaffDrawer(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff Member</span>
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
      {showAddStaffDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowAddStaffDrawer(false)}
          />
          <div className="relative bg-white h-full w-full max-w-lg border-l border-slate-200 shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-250 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">Add New Staff Member</h2>
                <button onClick={() => setShowAddStaffDrawer(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8 text-xs font-semibold text-slate-400">
                <div className={`flex items-center space-x-1 ${onboardingStep >= 1 ? 'text-blue-600 font-bold' : ''}`}>
                  <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">1</span>
                  <span>Identity</span>
                </div>
                <div className="h-px bg-slate-200 flex-1 mx-2" />
                <div className={`flex items-center space-x-1 ${onboardingStep >= 2 ? 'text-blue-600 font-bold' : ''}`}>
                  <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">2</span>
                  <span>Role</span>
                </div>
                {onboardingData.role === 'DOCTOR' && (
                  <>
                    <div className="h-px bg-slate-200 flex-1 mx-2" />
                    <div className={`flex items-center space-x-1 ${onboardingStep >= 3 ? 'text-blue-600 font-bold' : ''}`}>
                      <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">3</span>
                      <span>Doctor Info</span>
                    </div>
                  </>
                )}
                <div className="h-px bg-slate-200 flex-1 mx-2" />
                <div className={`flex items-center space-x-1 ${onboardingStep >= 4 ? 'text-blue-600 font-bold' : ''}`}>
                  <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center">4</span>
                  <span>Credentials</span>
                </div>
              </div>

              {/* Form Steps */}
              <div className="space-y-4">
                {onboardingStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                        <input
                          type="text"
                          className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                          value={onboardingData.firstName}
                          onChange={e => setOnboardingData({ ...onboardingData, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                        <input
                          type="text"
                          className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                          value={onboardingData.lastName}
                          onChange={e => setOnboardingData({ ...onboardingData, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">NIC / Passport Number</label>
                      <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={onboardingData.nic}
                        placeholder="e.g. 850321234V or 19850321234"
                        onChange={e => setOnboardingData({ ...onboardingData, nic: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={onboardingData.contact}
                        placeholder="e.g. +94 77 123 4567"
                        onChange={e => setOnboardingData({ ...onboardingData, contact: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                        value={onboardingData.email}
                        placeholder="e.g. name@careflow.com"
                        onChange={e => setOnboardingData({ ...onboardingData, email: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Assign Role</label>
                      <select
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                        value={onboardingData.role}
                        onChange={e => setOnboardingData({ ...onboardingData, role: e.target.value })}
                      >
                        <option value="RECEPTIONIST">Receptionist</option>
                        <option value="DOCTOR">Doctor / Practitioner</option>
                        <option value="BRANCH_MANAGER">Branch Manager</option>
                        <option value="BILLING_STAFF">Billing & Finance Staff</option>
                        <option value="ADMIN">System Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Assign Home Branch</label>
                      <select
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                        value={onboardingData.branch}
                        onChange={e => setOnboardingData({ ...onboardingData, branch: e.target.value })}
                      >
                        <option value="Colombo Main">Colombo Main</option>
                        <option value="Kandy">Kandy</option>
                        <option value="Galle">Galle</option>
                      </select>
                    </div>
                  </div>
                )}

                {onboardingStep === 3 && onboardingData.role === 'DOCTOR' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">SLMC License Number</label>
                      <input
                        type="text"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        placeholder="e.g. SLMC-88321"
                        value={onboardingData.license}
                        onChange={e => setOnboardingData({ ...onboardingData, license: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Base Consultation Fee (LKR)</label>
                      <input
                        type="number"
                        className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                        value={onboardingData.consultFee}
                        onChange={e => setOnboardingData({ ...onboardingData, consultFee: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Specialties (Select All that Apply)</label>
                      <div className="flex flex-wrap gap-2">
                        {SPECIALTIES_OPTIONS.map(spec => {
                          const isSelected = onboardingData.specialties.includes(spec);
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => handleToggleSpecialty(spec)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {spec}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {onboardingStep === 4 && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div>
                        <span className="text-slate-450 block uppercase text-[10px] font-bold">Recommended System Username</span>
                        <strong className="text-slate-800 text-sm">{onboardingData.username}</strong>
                      </div>
                      <div>
                        <span className="text-slate-450 block uppercase text-[10px] font-bold">Generated Temporary Password</span>
                        <strong className="text-red-600 text-sm">{onboardingData.tempPassword}</strong>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      * On submission, this temporary credential will be cached in the credentials pool. The user will be prompted to reset their password on first login.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-150 flex justify-end space-x-3">
              {onboardingStep > 1 && (
                <button
                  type="button"
                  onClick={() => setOnboardingStep(prev => prev - 1)}
                  className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
                >
                  Back
                </button>
              )}
              {onboardingStep < 4 && (
                <button
                  type="button"
                  onClick={handleOnboardingNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
                >
                  Continue
                </button>
              )}
              {onboardingStep === 4 && (
                <button
                  onClick={handleOnboardingSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
                >
                  Onboard & Save Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
