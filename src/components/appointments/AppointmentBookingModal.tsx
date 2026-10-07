import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { DoctorSelector } from './DoctorSelector';
import { TimeSlotPicker } from './TimeSlotPicker';
import { PatientSearchField, type PatientOption } from './PatientSearchField';
import { ConflictAlertBanner } from './ConflictAlertBanner';
import { bookAppointment, getDoctorAvailableSlots } from '../../services/appointmentService';
import type { DoctorProfile, SpecialtyItem, AvailableSlot } from '../../types/doctor';
import type { AppointmentResponse, AppointmentType } from '../../types/appointment';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: AppointmentResponse) => void;
  doctors: DoctorProfile[];
  specialties: SpecialtyItem[];
  patients: PatientOption[];
  initialDoctorId?: number | null;
  initialDate?: string;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  doctors,
  specialties,
  patients,
  initialDoctorId = null,
  initialDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(initialDoctorId);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('Standard');
  const [reasonForVisit, setReasonForVisit] = useState<string>('');

  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedDoctor = doctors.find((d) => d.Doctor_ID === selectedDoctorId) || null;

  useEffect(() => {
    if (initialDoctorId) setSelectedDoctorId(initialDoctorId);
  }, [initialDoctorId]);

  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }

    let isMounted = true;
    setIsLoadingSlots(true);
    setConflictError(null);

    getDoctorAvailableSlots(selectedDoctorId, selectedDate, 30, selectedBranchId || undefined)
      .then((slots) => {
        if (isMounted) {
          setAvailableSlots(slots);
          setSelectedSlot(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load slots:', err);
          setAvailableSlots([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDoctorId, selectedDate, selectedBranchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setFormError(null);

    if (!selectedPatient) return setFormError('Please select a patient.');
    if (!selectedDoctor) return setFormError('Please select a doctor.');
    if (!selectedSlot) return setFormError('Please select an available time slot.');
    if (!reasonForVisit.trim()) return setFormError('Please enter a reason for visit.');

    setIsSubmitting(true);
    try {
      const response = await bookAppointment({
        patient_id: selectedPatient.Patient_ID,
        doctor_id: selectedDoctor.Doctor_ID,
        branch_id: selectedDoctor.Branch_ID,
        appointment_date: selectedSlot.Date,
        start_time: selectedSlot.Start_Time,
        duration_minutes: selectedSlot.Duration_Minutes,
        appointment_type: appointmentType,
        reason_for_visit: reasonForVisit.trim(),
        schedule_id: selectedSlot.Schedule_ID ?? undefined,
      });

      onSuccess(response);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to book appointment';
      if (msg.toLowerCase().includes('overlap') || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('already has')) {
        setConflictError('The selected physician already has an overlapping appointment in this time window. Please pick an alternate time slot.');
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900 text-lg">Book Clinic Appointment</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <ConflictAlertBanner conflictMessage={conflictError} formError={formError} />

          <PatientSearchField patients={patients} selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

          <DoctorSelector
            doctors={doctors}
            specialties={specialties}
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={(doc) => setSelectedDoctorId(doc.Doctor_ID)}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
            selectedSpecialtyId={selectedSpecialtyId}
            onSpecialtyChange={setSelectedSpecialtyId}
          />

          <TimeSlotPicker
            selectedDoctor={selectedDoctor}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            availableSlots={availableSlots}
            isLoading={isLoadingSlots}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Appointment Type</label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="Standard">Standard Consultation</option>
                <option value="Follow_Up">Follow-Up Review</option>
                <option value="Emergency">Urgent Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Reason for Visit *</label>
              <input
                type="text"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="e.g. Chest discomfort, follow-up ECG review"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              />
            </div>
          </div>
        </form>

        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedSlot || !selectedPatient}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? 'Confirming Booking...' : 'Confirm Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBookingModal;
