// modal for editing a patient, NIC, date of birth and gender stay read only

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getPatient, updatePatient } from '../../services/patientService';
import { formatPatientId, formatPatientName } from '../../utils/patientFormat';
import { makeUpdateForm, validateUpdateForm } from '../../utils/updateForm';
import { buildUpdateBody, readUpdateError } from '../../utils/updatePayload';
import UpdateLockedFields from './update/UpdateLockedFields';
import UpdatePatientFields from './update/UpdatePatientFields';
import UpdateEmergencyFields from './update/UpdateEmergencyFields';

// the parent shows this modal only while editing and gives it a new key when the patient is reloaded
export default function UpdatePatientModal({ patient, onClose, onSaved, onConflict }) {
  const [form, setForm] = useState(() => makeUpdateForm(patient));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // someone else saved first, so load the newest details for the user to check again
  const reloadPatient = () => {
    getPatient(patient.patient_id)
      .then(newest => onConflict(newest))
      .catch(err => setGeneralError(err.message));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setGeneralError('');

    const found = validateUpdateForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = buildUpdateBody(form, patient);
    if (!body) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updatePatient(patient.patient_id, body);
      setIsSubmitting(false);
      onSaved(updated);
      onClose();
    } catch (err) {
      const problem = readUpdateError(err);
      setIsSubmitting(false);
      setErrors(problem.fieldErrors);
      setGeneralError(problem.message);
      if (problem.isConflict) reloadPatient();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
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

          <UpdateLockedFields patient={patient} />
          <UpdatePatientFields form={form} errors={errors} onChange={handleChange} />
          {form.contactId && <UpdateEmergencyFields form={form} errors={errors} onChange={handleChange} />}

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