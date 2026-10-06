import React, { useState } from 'react';
import { X, Zap, CheckCircle2, AlertTriangle, UserCheck, Stethoscope } from 'lucide-react';
import { PatientSearchField, type PatientOption } from './PatientSearchField';
import { TriageUrgencySelector, type TriageUrgency } from './TriageUrgencySelector';
import { bookWalkIn } from '../../services/appointmentService';
import type { DoctorProfile } from '../../types/doctor';
import type { AppointmentResponse } from '../../types/appointment';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: AppointmentResponse) => void;
  doctors: DoctorProfile[];
  patients: PatientOption[];
  currentBranchId?: number;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  doctors,
  patients,
  currentBranchId = 1,
}) => {
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(
    doctors.length > 0 ? doctors[0].Doctor_ID : null
  );
  const [urgency, setUrgency] = useState<TriageUrgency>('Normal');
  const [reasonForVisit, setReasonForVisit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedWalkIn, setConfirmedWalkIn] = useState<AppointmentResponse | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPatient) return setFormError('Please select a patient.');
    if (!selectedDoctorId) return setFormError('Please select an assigned doctor on duty.');
    if (!reasonForVisit.trim()) return setFormError('Please enter clinical triage reason / symptoms.');

    const selectedDoc = doctors.find((d) => d.Doctor_ID === selectedDoctorId);
    const branchId = selectedDoc ? selectedDoc.Branch_ID : currentBranchId;

    setIsSubmitting(true);
    try {
      const response = await bookWalkIn({
        patient_id: selectedPatient.Patient_ID,
        doctor_id: selectedDoctorId,
        branch_id: branchId,
        reason_for_visit: `[${urgency.toUpperCase()}] ${reasonForVisit.trim()}`,
        duration_minutes: urgency === 'Critical' ? 30 : 15,
        triage_urgency: urgency,
      });

      setConfirmedWalkIn(response);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register walk-in patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (confirmedWalkIn) {
      onSuccess(confirmedWalkIn);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-gray-900 text-base">Emergency Walk-In Registration</h2>
              <p className="text-[11px] text-gray-500">Fast-path reception intake bypassing slot booking</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedWalkIn ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Walk-In Intake Confirmed</h3>
              <p className="text-xs text-gray-500 mt-1">Patient assigned to live consultation waiting queue.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Intake Token:</span>
                <span className="font-bold text-blue-600 text-sm">W-{confirmedWalkIn.Appointment_ID}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Patient:</span>
                <span className="font-semibold text-gray-800">{confirmedWalkIn.Patient_Name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Assigned Doctor:</span>
                <span className="font-semibold text-gray-800">{confirmedWalkIn.Doctor_Name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Queue Status:</span>
                <span className="px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800">WALK_IN</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-xs transition-colors"
            >
              Done & Add to Queue
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <PatientSearchField patients={patients} selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Assigned Doctor on Duty *
              </label>
              <select
                value={selectedDoctorId ?? ''}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                {doctors.map((doc) => (
                  <option key={doc.Doctor_ID} value={doc.Doctor_ID}>
                    Dr. {doc.First_Name} {doc.Last_Name} ({doc.Specialties && doc.Specialties.length > 0 ? doc.Specialties.join(', ') : 'General Practice'})
                  </option>
                ))}
              </select>
            </div>

            <TriageUrgencySelector value={urgency} onChange={setUrgency} />

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Clinical Reason & Triage Symptoms *
              </label>
              <textarea
                rows={2}
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="e.g. Acute severe abdominal pain, high fever presentation..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPatient || !selectedDoctorId}
                className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Registering...' : 'Register Walk-In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WalkInModal;
