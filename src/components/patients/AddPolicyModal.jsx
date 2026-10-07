// modal for attaching an insurance policy to an existing patient

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { addPolicy, listProviders } from '../../services/insuranceService';
import { isValidPolicyYear, isValidCoverage } from '../../utils/patientFormat';

export default function AddPolicyModal({ isOpen, patientId, onClose, onSuccess, onOpenNewProvider
}) {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyType, setPolicyType] = useState('Comprehensive');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coveragePercent, setCoveragePercent] = useState('80');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // load providers and reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProviderId('');
      setPolicyNumber('');
      setPolicyType('Comprehensive');
      setStartDate('');
      setEndDate('');
      setCoveragePercent('80');
      setErrors({});
      setGeneralError('');
      listProviders()
        .then(list => setProviders(list || []))
        .catch(() => setProviders([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!providerId) newErrors.providerId = 'Select an insurance provider';

    if (!policyNumber.trim()) {
      newErrors.policyNumber = 'Policy number is required';
    } else if (policyNumber.trim().length > 50) {
      newErrors.policyNumber = 'Policy number can be 50 characters at most';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (!isValidPolicyYear(startDate)) {
      newErrors.startDate = 'Start date year looks wrong';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    } else if (!isValidPolicyYear(endDate)) {
      newErrors.endDate = 'End date year looks wrong';
    } else if (startDate && endDate < startDate) {
      newErrors.endDate = 'End date cannot be before start date';
    }

    if (!isValidCoverage(coveragePercent)) {
      newErrors.coveragePercent = 'Coverage must be 0 to 100 with up to 2 decimals';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const policy = await addPolicy(patientId, {
        provider_id: parseInt(providerId, 10),
        policy_number: policyNumber.trim(),
        policy_type: policyType,
        start_date: startDate,
        end_date: endDate,
        default_coverage_percentage: parseFloat(coveragePercent)
      });
      setIsSubmitting(false);
      onSuccess(policy);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setGeneralError(err.message || 'Failed to add policy');
      if (err.fieldErrors) {
        const mapped = {};
        if (err.fieldErrors.provider_id) mapped.providerId = err.fieldErrors.provider_id;
        if (err.fieldErrors.policy_number) mapped.policyNumber = err.fieldErrors.policy_number;
        if (err.fieldErrors.start_date) mapped.startDate = err.fieldErrors.start_date;
        if (err.fieldErrors.end_date) mapped.endDate = err.fieldErrors.end_date;
        if (err.fieldErrors.default_coverage_percentage) mapped.coveragePercent = err.fieldErrors.default_coverage_percentage;
        setErrors(prev => ({ ...prev, ...mapped }));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-md">Add Insurance Policy</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Insurance Provider *
              </label>
              <select
                className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
              >
                <option value="">Select Provider...</option>
                {providers.map(p => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.provider_name}
                  </option>
                ))}
              </select>
              {errors.providerId && <span className="text-[11px] text-red-600">{errors.providerId}</span>}
            </div>
            {onOpenNewProvider && (
              <button
                type="button"
                onClick={onOpenNewProvider}
                className="text-xs text-blue-600 hover:text-blue-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-medium flex items-center shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-0.5" />
                New
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Policy Number *
            </label>
            <input
              type="text"
              placeholder="e.g. UA-88321-A"
              className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
              value={policyNumber}
              onChange={e => setPolicyNumber(e.target.value)}
            />
            {errors.policyNumber && <span className="text-[11px] text-red-600">{errors.policyNumber}</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Policy Type *
            </label>
            <select
              className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={policyType}
              onChange={e => setPolicyType(e.target.value)}
            >
              <option value="Comprehensive">Comprehensive</option>
              <option value="Outpatient_Only">Outpatient Only</option>
              <option value="Catastrophic">Catastrophic</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Start Date *
              </label>
              <input
                type="date"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              {errors.startDate && <span className="text-[11px] text-red-600">{errors.startDate}</span>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                End Date *
              </label>
              <input
                type="date"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              {errors.endDate && <span className="text-[11px] text-red-600">{errors.endDate}</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Coverage % (0 to 100) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
              value={coveragePercent}
              onChange={e => setCoveragePercent(e.target.value)}
            />
            {errors.coveragePercent && <span className="text-[11px] text-red-600">{errors.coveragePercent}</span>}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isSubmitting ? 'Saving...' : 'Attach Policy'}
          </button>
        </div>
      </form>
    </div>
  );
}
