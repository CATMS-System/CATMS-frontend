// modal for creating a new insurance provider

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { createProvider } from '../../services/insuranceService';
import { isValidPhone, isValidPostalCode, isValidEmail } from '../../utils/patientFormat';

export default function ProviderModal({ isOpen, onClose, onSuccess
}) {
  const [providerName, setProviderName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('Western Province');
  const [postalCode, setPostalCode] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setProviderName('');
    setContactNumber('');
    setEmail('');
    setStreetAddress('');
    setCity('');
    setStateProvince('Western Province');
    setPostalCode('');
    setErrors({});
    setGeneralError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!providerName.trim()) newErrors.providerName = 'Provider name is required';
    if (!contactNumber.trim()) {
      newErrors.contactNumber = 'Phone number is required';
    } else if (!isValidPhone(contactNumber)) {
      newErrors.contactNumber = 'Enter a valid phone number';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!stateProvince.trim()) newErrors.stateProvince = 'Province is required';
    if (!postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!isValidPostalCode(postalCode)) {
      newErrors.postalCode = 'Postal code must be exactly 5 digits';
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
      const provider = await createProvider({
        provider_name: providerName.trim(),
        contact_number: contactNumber.trim(),
        email: email.trim(),
        street_address: streetAddress.trim(),
        city: city.trim(),
        state_province: stateProvince.trim(),
        postal_code: postalCode.trim()
      });
      setIsSubmitting(false);
      resetForm();
      onSuccess(provider);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      const fieldMessages = {};

      if (err.status === 409 && err.message.includes('name')) {
        fieldMessages.providerName = err.message;
      } else if (err.status === 409 && err.message.includes('email')) {
        fieldMessages.email = err.message;
      } else {
        setGeneralError(err.message || 'Failed to create provider');
      }

      if (err.fieldErrors) {
        if (err.fieldErrors.provider_name) fieldMessages.providerName = err.fieldErrors.provider_name;
        if (err.fieldErrors.contact_number) fieldMessages.contactNumber = err.fieldErrors.contact_number;
        if (err.fieldErrors.email) fieldMessages.email = err.fieldErrors.email;
        if (err.fieldErrors.postal_code) fieldMessages.postalCode = err.fieldErrors.postal_code;
      }
      setErrors(prev => ({ ...prev, ...fieldMessages }));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={handleClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-md">New Insurance Provider</h3>
          <button
            type="button"
            onClick={handleClose}
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
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Provider Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Union Assurance PLC"
              className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
              value={providerName}
              onChange={e => setProviderName(e.target.value)}
            />
            {errors.providerName && <span className="text-[11px] text-red-600">{errors.providerName}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Phone *
              </label>
              <input
                type="tel"
                placeholder="+94 11 234 5678"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
              />
              {errors.contactNumber && <span className="text-[11px] text-red-600">{errors.contactNumber}</span>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Email *
              </label>
              <input
                type="email"
                placeholder="claims@provider.lk"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {errors.email && <span className="text-[11px] text-red-600">{errors.email}</span>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Street Address *
            </label>
            <input
              type="text"
              className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
              value={streetAddress}
              onChange={e => setStreetAddress(e.target.value)}
            />
            {errors.streetAddress && <span className="text-[11px] text-red-600">{errors.streetAddress}</span>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">City *</label>
              <input
                type="text"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
              {errors.city && <span className="text-[11px] text-red-600">{errors.city}</span>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Province *</label>
              <input
                type="text"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={stateProvince}
                onChange={e => setStateProvince(e.target.value)}
              />
              {errors.stateProvince && <span className="text-[11px] text-red-600">{errors.stateProvince}</span>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Postal *</label>
              <input
                type="text"
                maxLength={5}
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
              />
              {errors.postalCode && <span className="text-[11px] text-red-600">{errors.postalCode}</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
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
            {isSubmitting ? 'Creating...' : 'Create Provider'}
          </button>
        </div>
      </form>
    </div>
  );
}