// patient profile card showing contacts and insurance policies

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { listPolicies } from '../../services/insuranceService';
import { formatPatientId, formatPatientName, formatAddress } from '../../utils/patientFormat';

export default function PatientProfileCard({
  patient,
  isLoading,
  onOpenUpdate,
  onOpenAddPolicy
}) {
  const [showAllPolicies, setShowAllPolicies] = useState(false);
  const [allPolicies, setAllPolicies] = useState([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [policyError, setPolicyError] = useState('');

  // reset all policies toggle when patient is loaded again
  useEffect(() => {
    setShowAllPolicies(false);
    setAllPolicies([]);
    setPolicyError('');
  }, [patient]);

  // fetch full policy list when user toggles show all
  const handleToggleAllPolicies = () => {
    if (showAllPolicies) {
      setShowAllPolicies(false);
      return;
    }
    setIsLoadingPolicies(true);
    setPolicyError('');
    listPolicies(patient.patient_id)
      .then(policies => {
        setAllPolicies(policies);
        setShowAllPolicies(true);
      })
      .catch(err => setPolicyError(err.message))
      .finally(() => setIsLoadingPolicies(false));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
        <span className="text-xs">Loading patient profile...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 py-20 text-xs">
        Select a patient record to view full medical demographics.
      </div>
    );
  }

  const policiesToDisplay = showAllPolicies
    ? allPolicies
    : (patient.active_policies || []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
      {/* header */}
      <div className="border-b border-slate-150 pb-4 flex justify-between items-start">
        <div>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
            Patient Card File
          </span>
          <h2 className="text-xl font-bold text-slate-950 mt-0.5">
            {formatPatientName(patient.first_name, patient.last_name)}
          </h2>
          <span className="text-xs text-slate-500 font-mono mt-1 block">
            Code: {formatPatientId(patient.patient_id)} | DOB: {patient.date_of_birth} | Gender: {patient.gender}
          </span>
          <span className="text-xs text-slate-400 font-mono block mt-0.5">
            NIC: {patient.nic} | Registered: {patient.registration_date}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenUpdate(patient.patient_id)}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 cursor-pointer"
        >
          Edit Details
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* contact phone */}
        <div>
          <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">
            Primary Contact Phone
          </span>
          <strong className="text-slate-800 text-sm font-mono block mt-0.5">
            {patient.contact_number}
          </strong>
        </div>

        {/* email */}
        <div>
          <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">
            Email Address
          </span>
          <span className="text-slate-700 block mt-0.5 font-mono">
            {patient.email || 'Not recorded'}
          </span>
        </div>

        {/* patient portal login credentials */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider flex items-center space-x-1">
              <Shield className="h-3.5 w-3.5 text-blue-600 inline mr-1" />
              Patient Portal Access
            </span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              Active Login
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 pt-1 border-t border-blue-200/50">
            <div>
              <span className="text-slate-500 text-[11px]">Username: </span>
              <strong className="text-blue-900 font-mono font-semibold">
                {patient.portal_access?.username || `pat_${patient.nic?.toLowerCase()}`}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Default Pass: </span>
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-slate-700 font-mono text-[11px]">
                Password123!
              </code>
            </div>
          </div>
        </div>

        {/* address */}
        <div>
          <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider">
            Residential Address
          </span>
          <span className="text-slate-700 block mt-0.5">
            {formatAddress(
              patient.street_address,
              patient.city,
              patient.state_province,
              patient.postal_code
            )}
          </span>
        </div>

        {/* insurance policies */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center">
              <Shield className="h-3.5 w-3.5 text-blue-600 mr-1" />
              Insurance Policies ({patient.active_policies?.length || 0} active)
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleAllPolicies}
                className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                {isLoadingPolicies ? 'Loading...' : showAllPolicies ? 'Show active only' : 'View all'}
              </button>
              <button
                type="button"
                onClick={() => onOpenAddPolicy(patient.patient_id)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
              >
                <Plus className="h-3 w-3 mr-0.5" />
                Add policy
              </button>
            </div>
          </div>

          {policyError && (
            <div className="text-red-600 text-xs">{policyError}</div>
          )}

          {policiesToDisplay.length === 0 ? (
            <div className="text-slate-400 text-xs italic py-1">
              No insurance policies on record
            </div>
          ) : (
            <div className="space-y-2">
              {policiesToDisplay.map(policy => (
                <div
                  key={policy.policy_id}
                  className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1 font-mono text-xs"
                >
                  <div className="flex justify-between items-start font-sans">
                    <span className="font-bold text-slate-800">
                      {policy.provider_name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center ${policy.is_currently_valid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-150 text-slate-600'
                        }`}
                    >
                      {policy.is_currently_valid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                          Valid
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1 inline" />
                          {policy.policy_status}
                        </>
                      )}
                    </span>
                  </div>
                  <div>Policy No: <strong>{policy.policy_number}</strong></div>
                  <div>Type: {policy.policy_type.replace('_', ' ')}</div>
                  <div>Dates: {policy.start_date} to {policy.end_date}</div>
                  <div>Coverage: {policy.default_coverage_percentage}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* emergency contacts */}
        <div>
          <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider mb-2">
            Emergency Contacts
          </span>
          <div className="space-y-2">
            {(!patient.emergency_contacts || patient.emergency_contacts.length === 0) && (
              <div className="text-slate-400 text-xs italic">
                No emergency contacts recorded
              </div>
            )}
            {patient.emergency_contacts?.map(contact => (
              <div
                key={contact.emergency_contact_id}
                className="border border-slate-150 rounded-lg p-2.5 font-mono"
              >
                <div className="font-bold text-slate-800 font-sans text-xs">
                  {formatPatientName(contact.first_name, contact.last_name)} ({contact.relationship_to_patient})
                </div>
                <div className="text-slate-500 mt-0.5">{contact.contact_number}</div>
                {(contact.street_address || contact.city) && (
                  <div className="text-slate-400 text-[11px] font-sans mt-0.5">
                    {formatAddress(contact.street_address, contact.city, '', contact.postal_code)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
