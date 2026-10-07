import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, AlertTriangle } from 'lucide-react';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ConflictAlertBanner } from './ConflictAlertBanner';
import { rescheduleAppointment, getDoctorAvailableSlots } from '../../services/appointmentService';
import type { AppointmentResponse } from '../../types/appointment';
import type { DoctorProfile, AvailableSlot } from '../../types/doctor';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAppointment: AppointmentResponse) => void;
  appointment: AppointmentResponse | null;
  doctors: DoctorProfile[];
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  appointment,
  doctors,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const matchedDoctor = appointment
    ? doctors.find((d) => d.Doctor_ID === appointment.Doctor_ID) || {
        Doctor_ID: appointment.Doctor_ID,
        Staff_ID: 0,
        First_Name: appointment.Doctor_Name.replace('Dr. ', ''),
        Last_Name: '',
        Branch_ID: appointment.Branch_ID,
        Branch_Name: appointment.Branch_Name,
        License_Number: appointment.Doctor_License || '',
        Standard_Consultation_Fee: 0,
        Specialties: [],
      }
    : null;

  useEffect(() => {
    if (appointment) {
      setSelectedDate(appointment.Appointment_Date >= todayStr ? appointment.Appointment_Date : todayStr);
      setSelectedSlot(null);
      setConflictError(null);
      setFormError(null);
    }
  }, [appointment, todayStr]);

  // Fetch available slots when doctor or date changes
  useEffect(() => {
    if (!appointment || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    setIsLoadingSlots(true);
    setConflictError(null);

    getDoctorAvailableSlots(appointment.Doctor_ID, selectedDate, appointment.Duration_Minutes || 30, appointment.Branch_ID)
      .then((slots) => {
        if (isMounted) {
          setAvailableSlots(slots);
          setSelectedSlot(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load slots for reschedule:', err);
          setAvailableSlots([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [appointment, selectedDate]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setFormError(null);

    if (!selectedSlot) {
      setFormError('Please select a new available time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await rescheduleAppointment(appointment.Appointment_ID, {
        new_date: selectedSlot.Date,
        new_start_time: selectedSlot.Start_Time,
        duration_minutes: selectedSlot.Duration_Minutes,
        reschedule_reason: rescheduleReason.trim() || undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to reschedule appointment';
      if (
        errMsg.toLowerCase().includes('overlap') ||
        errMsg.toLowerCase().includes('conflict') ||
        errMsg.toLowerCase().includes('already has')
      ) {
        setConflictError(
          'Scheduling Conflict Detected: The selected slot is already occupied. Please pick an alternative time slot.'
        );
      } else {
        setFormError(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-gray-900 text-base">Reschedule Appointment</h2>
              <p className="text-[11px] text-gray-500">Appointment #{appointment.Appointment_ID}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Current Booking Overview */}
          <div className="bg-blue-50/60 p-3.5 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                {appointment.Patient_Name} (ID #{appointment.Patient_ID})
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                Dr. {appointment.Doctor_Name.replace('Dr. ', '')}
              </span>
            </div>
            <p className="text-[11px] text-blue-700">
              Current Slot: {appointment.Appointment_Date} at {appointment.Start_Time.slice(0, 5)} ({appointment.Branch_Name})
            </p>
          </div>

          <ConflictAlertBanner conflictMessage={conflictError} formError={formError} />

          {/* Time Slot Picker for reselection */}
          <TimeSlotPicker
            selectedDoctor={matchedDoctor}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            availableSlots={availableSlots}
            isLoading={isLoadingSlots}
          />

          <div className="space-y-1 pt-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Reason for Rescheduling (Optional)
            </label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. Patient requested afternoon slot instead, conflict resolution..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>
        </form>

        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedSlot}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
