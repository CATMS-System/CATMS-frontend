// registration modal with a form step and a review step

import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { registerPatient } from '../../services/patientService';
import { listProviders } from '../../services/insuranceService';
import { INITIAL_FORM, validateRegisterForm } from '../../utils/registerForm';
import { buildRegisterBody, readRegisterError } from '../../utils/registerPayload';
import RegisterForm from './register/RegisterForm';
import RegisterReview from './register/RegisterReview';
import ProviderModal from './ProviderModal';

export default function RegisterPatientModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [providers, setProviders] = useState([]);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  // reset the form and load insurance providers when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM);
    setStep(1);
    setErrors({});
    setGeneralError('');
    listProviders()
      .then(list => setProviders(list))
      .catch(() => setProviders([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleReview = (e) => {
    e.preventDefault();
    setGeneralError('');
    const found = validateRegisterForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(2);
  };

  // a provider created from this modal is added to the list and selected
  const handleNewProvider = (provider) => {
    setProviders(prev => [...prev, provider]);
    handleChange('providerId', String(provider.provider_id));
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGeneralError('');

    try {
      const patient = await registerPatient(buildRegisterBody(form));
      setIsSubmitting(false);
      onSuccess(patient);
      onClose();
    } catch (err) {
      const found = readRegisterError(err);
      setIsSubmitting(false);
      setStep(1);
      setErrors(found.fieldErrors);
      setGeneralError(found.message);
    }
  };

  const selectedProvider = providers.find(p => String(p.provider_id) === form.providerId);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

        <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-bold text-slate-900 text-md">
                {step === 1 ? 'Onboard New Patient Record' : 'Review & Confirm Registration'}
              </h3>
              <span className="text-xs text-slate-400">
                {step === 1 ? 'Step 1 of 2: Demographics & Insurance' : 'Step 2 of 2: Verify Unchangeable Data'}
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

          {generalError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2 shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {step === 1 && (
            <RegisterForm
              form={form}
              errors={errors}
              providers={providers}
              onChange={handleChange}
              onSubmit={handleReview}
              onCancel={onClose}
              onOpenNewProvider={() => setShowProviderModal(true)}
            />
          )}

          {step === 2 && (
            <RegisterReview
              form={form}
              providerName={selectedProvider ? selectedProvider.provider_name : ''}
              isSubmitting={isSubmitting}
              onBack={() => setStep(1)}
              onConfirm={handleConfirm}
            />
          )}
        </div>
      </div>

      <ProviderModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSuccess={handleNewProvider}
      />
    </>
  );
}