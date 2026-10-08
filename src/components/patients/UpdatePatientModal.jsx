// modal for editing patient demographics and emergency contact
// nic, date_of_birth and gender are shown read-only (locked after registration)

import React, { useState, useEffect } from 'react';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { updatePatient } from '../../services/patientService';
import {
  formatPatientId,
  formatPatientName,
  isValidPhone,
  isValidPostalCode
} from '../../utils/patientFormat';

export default function UpdatePatientModal({
  isOpen,
  patient,
  onClose,
  onSuccess
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // populate form when patient changes
  useEffect(() => {
    if (isOpen && patient) {
      const ec = patient.emergency_contacts?.[0] || {};
      setFormData({
        firstName: patient.first_name || '',
        lastName: patient.last_name || '',
        contactNumber: patient.contact_number || '',
        email: patient.email || '',
        streetAddress: patient.street_address || '',
        city: patient.city || '',
        stateProvince: patient.state_province || '',
        postalCode: patient.postal_code || '',
        ecId: ec.emergency_contact_id || null,
        ecFirstName: ec.first_name || '',
        ecLastName: ec.last_name || '',
        ecRelation: ec.relationship_to_patient || '',
        ecPhone: ec.contact_number || '',
        ecStreet: ec.street_address || '',
        ecCity: ec.city || '',
        ecPostal: ec.postal_code || ''
      });
      setErrors({});
      setGeneralError('');
    }
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // build partial update body with only changed fields
  const buildUpdatePayload = () => {
    const body = {};
    const ec = patient.emergency_contacts?.[0] || {};

    // patient fields
    if (formData.firstName.trim() !== patient.first_name) {
      body.first_name = formData.firstName.trim();
    }
    if (formData.lastName.trim() !== patient.last_name) {
      body.last_name = formData.lastName.trim();
    }
    if (formData.contactNumber.trim() !== patient.contact_number) {
      body.contact_number = formData.contactNumber.trim();
    }

    // email: empty string means clear it (send null)
    const currentEmail = patient.email || '';
    const newEmail = formData.email.trim();
    if (newEmail !== currentEmail) {
      body.email = newEmail || null;
    }

    if (formData.streetAddress.trim() !== patient.street_address) {
      body.street_address = formData.streetAddress.trim();
    }
    if (formData.city.trim() !== patient.city) {
      body.city = formData.city.trim();
    }
    if (formData.stateProvince.trim() !== patient.state_province) {
      body.state_province = formData.stateProvince.trim();
    }
    if (formData.postalCode.trim() !== patient.postal_code) {
      body.postal_code = formData.postalCode.trim();
    }

    // emergency contact changes
    if (formData.ecId) {
      const ecChanges = {};
      if (formData.ecFirstName.trim() !== (ec.first_name || '')) {
        ecChanges.first_name = formData.ecFirstName.trim();
      }
      if (formData.ecLastName.trim() !== (ec.last_name || '')) {
        ecChanges.last_name = formData.ecLastName.trim();
      }
      if (formData.ecRelation.trim() !== (ec.relationship_to_patient || '')) {
        ecChanges.relationship_to_patient = formData.ecRelation.trim();
      }
      if (formData.ecPhone.trim() !== (ec.contact_number || '')) {
        ecChanges.contact_number = formData.ecPhone.trim();
      }

      const ecStreetVal = formData.ecStreet.trim() || null;
      if (ecStreetVal !== (ec.street_address || null)) {
        ecChanges.street_address = ecStreetVal;
      }
      const ecCityVal = formData.ecCity.trim() || null;
      if (ecCityVal !== (ec.city || null)) {
        ecChanges.city = ecCityVal;
      }
      const ecPostalVal = formData.ecPostal.trim() || null;
      if (ecPostalVal !== (ec.postal_code || null)) {
        ecChanges.postal_code = ecPostalVal;
      }

      if (Object.keys(ecChanges).length > 0) {
        body.emergency_contact = {
          emergency_contact_id: formData.ecId,
          ...ecChanges
        };
      }
    }

    return body;
  };

  const validate = () => {
    const newErrors = {};
    if (formData.contactNumber && !isValidPhone(formData.contactNumber)) {
      newErrors.contactNumber = 'Enter a valid phone number (7 to 20 digits)';
    }
    if (formData.postalCode && !isValidPostalCode(formData.postalCode)) {
      newErrors.postalCode = 'Postal code must be exactly 5 digits';
    }
    if (formData.ecPhone && !isValidPhone(formData.ecPhone)) {
      newErrors.ecPhone = 'Enter a valid phone number';
    }
    if (formData.ecPostal && !isValidPostalCode(formData.ecPostal)) {
      newErrors.ecPostal = 'Postal code must be exactly 5 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;

    const payload = buildUpdatePayload();

    // nothing changed, skip the api call
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    // attach the optimistic lock timestamp
    payload.last_known_updated_at = patient.updated_at;

    setIsSubmitting(true);
    try {
      const updatedPatient = await updatePatient(patient.patient_id, payload);
      setIsSubmitting(false);
      onSuccess(updatedPatient);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setGeneralError(err.message || 'Failed to update patient');

      if (err.fieldErrors) {
        const mapped = {};
        if (err.fieldErrors.contact_number) mapped.contactNumber = err.fieldErrors.contact_number;
        if (err.fieldErrors.postal_code) mapped.postalCode = err.fieldErrors.postal_code;
        if (err.fieldErrors.email) mapped.email = err.fieldErrors.email;
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
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-slate-900 text-md">Update Patient Profile</h3>
            <span className="text-xs text-slate-400 font-mono">
              {formatPatientId(patient.patient_id)} - {formatPatientName(patient.first_name, patient.last_name)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {generalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* locked fields shown read-only */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center text-slate-500 mb-1">
              <Lock className="h-3.5 w-3.5 mr-1 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Permanent Fields (Cannot Be Changed)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-slate-700">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">NIC</span>
                <strong>{patient.nic}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">DOB</span>
                <strong>{patient.date_of_birth}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase">Gender</span>
                <strong>{patient.gender}</strong>
              </div>
            </div>
          </div>

          {/* editable patient fields */}
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  value={formData.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                />
                {errors.firstName && <span className="text-[11px] text-red-600">{errors.firstName}</span>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  value={formData.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                />
                {errors.lastName && <span className="text-[11px] text-red-600">{errors.lastName}</span>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                value={formData.contactNumber}
                onChange={e => handleChange('contactNumber', e.target.value)}
              />
              {errors.contactNumber && <span className="text-[11px] text-red-600">{errors.contactNumber}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Email (clear to remove)
              </label>
              <input
                type="email"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
              />
              {errors.email && <span className="text-[11px] text-red-600">{errors.email}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Street Address
              </label>
              <input
                type="text"
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={formData.streetAddress}
                onChange={e => handleChange('streetAddress', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">City</label>
                <input
                  type="text"
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Province</label>
                <input
                  type="text"
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                  value={formData.stateProvince}
                  onChange={e => handleChange('stateProvince', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Postal</label>
                <input
                  type="text"
                  maxLength={5}
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  value={formData.postalCode}
                  onChange={e => handleChange('postalCode', e.target.value)}
                />
                {errors.postalCode && <span className="text-[11px] text-red-600">{errors.postalCode}</span>}
              </div>
            </div>

            {/* emergency contact section */}
            {formData.ecId && (
              <div className="border-t border-slate-150 pt-3 space-y-3">
                <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  Emergency Contact
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                      value={formData.ecFirstName}
                      onChange={e => handleChange('ecFirstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                      value={formData.ecLastName}
                      onChange={e => handleChange('ecLastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Relationship</label>
                    <input
                      type="text"
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                      value={formData.ecRelation}
                      onChange={e => handleChange('ecRelation', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                      value={formData.ecPhone}
                      onChange={e => handleChange('ecPhone', e.target.value)}
                    />
                    {errors.ecPhone && <span className="text-[11px] text-red-600">{errors.ecPhone}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* footer */}
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
              {isSubmitting ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
