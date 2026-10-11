import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const SPECIALTIES_OPTIONS = ['General Practice', 'Cardiology', 'Dermatology', 'Pediatrics', 'Neurology', 'Orthopedics', 'ENT'];

const SPECIALTY_MAP = {
  'Cardiology': 1,
  'General Practice': 2,
  'General Medicine': 2,
  'Dermatology': 3,
  'Pediatrics': 4,
  'Orthopedics': 5
};

export default function AddStaffDrawer({
  isOpen,
  onClose,
  initialStep = 1,
  branches = [],
  lockedBranch = null,
  lockedBranchId = null,
  currentUserRole = 'ADMIN',
  onStaffCreated,
  triggerToast = () => {},
  addAuditLog = () => {}
}) {
  const [onboardingStep, setOnboardingStep] = useState(initialStep);
  const [onboardingData, setOnboardingData] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    contact: '',
    email: '',
    role: 'RECEPTIONIST',
    branch: lockedBranch || 'Colombo Main',
    license: '',
    consultFee: '1500',
    specialties: [],
    username: '',
    tempPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lockedBranch) {
      setOnboardingData(prev => ({ ...prev, branch: lockedBranch }));
    }
  }, [lockedBranch]);

  if (!isOpen) return null;

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
    setIsSubmitting(true);
    try {
      const activeBranchName = lockedBranch || onboardingData.branch;
      const branchObj = branches.find(b => b.Branch_Name === activeBranchName || b.name === activeBranchName);
      const branchId = lockedBranchId || (branchObj ? (branchObj.Branch_ID || 1) : 1);
      const jobTitle = onboardingData.role === 'DOCTOR' 
        ? (onboardingData.specialties[0] || 'Medical Specialist') 
        : onboardingData.role.replace('_', ' ');

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

      if (onboardingData.role === 'DOCTOR') {
        payload.System_Role = 'Doctor';
        payload.License_Number = onboardingData.license;
        payload.Standard_Consultation_Fee = parseFloat(onboardingData.consultFee) || 1500;
        payload.Specialty_IDs = onboardingData.specialties
          .map(s => SPECIALTY_MAP[s])
          .filter(Boolean);
      } else if (onboardingData.role === 'BRANCH_MANAGER') {
        payload.System_Role = 'Branch_Manager';
      } else if (onboardingData.role === 'BILLING_STAFF') {
        payload.System_Role = 'Billing_Staff';
      } else if (onboardingData.role === 'ADMIN') {
        payload.System_Role = 'Admin';
      } else {
        payload.System_Role = 'Receptionist';
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
        branch: activeBranchName,
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

      if (onStaffCreated) {
        onStaffCreated(newStaffMember, s);
      }

      addAuditLog(
        'CREATE_STAFF',
        `Onboarded staff member ${newStaffMember.name} (${newStaffId})`,
        'null',
        JSON.stringify(newStaffMember)
      );

      triggerToast(`Staff member ${newStaffMember.name} successfully created!`);
      handleClose();
    } catch (err) {
      console.error("API Error creating staff", err);
      const msg = err.response?.data?.detail || 'Failed to create staff member.';
      triggerToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOnboardingStep(1);
    setOnboardingData({
      firstName: '',
      lastName: '',
      nic: '',
      contact: '',
      email: '',
      role: 'RECEPTIONIST',
      branch: lockedBranch || 'Colombo Main',
      license: '',
      consultFee: '1500',
      specialties: [],
      username: '',
      tempPassword: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={handleClose}
      />
      <div className="relative bg-white h-full w-full max-w-lg border-l border-slate-200 shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-250 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900">Add New Staff Member</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
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
                    {(!lockedBranch || currentUserRole === 'ADMIN') && (
                      <option value="ADMIN">System Administrator</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Assign Home Branch</label>
                  {lockedBranch ? (
                    <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 flex items-center justify-between">
                      <span>Branch: <strong>{lockedBranch}</strong> [Locked]</span>
                    </div>
                  ) : (
                    <select
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                      value={onboardingData.branch}
                      onChange={e => setOnboardingData({ ...onboardingData, branch: e.target.value })}
                    >
                      <option value="Colombo Main">Colombo Main</option>
                      <option value="Kandy">Kandy</option>
                      <option value="Galle">Galle</option>
                    </select>
                  )}
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
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Onboarding...' : 'Onboard & Save Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
