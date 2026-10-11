import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, Clock, User, Stethoscope } from 'lucide-react';
import { cancelAppointment } from '../../services/appointmentService';
import type { AppointmentResponse } from '../../types/appointment';

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAppointment: AppointmentResponse) => void;
  appointment: AppointmentResponse | null;
}

export const CancelAppointmentModal: React.FC<CancelAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  appointment,
}) => {
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const reasonTrimmed = cancellationReason.trim();
    if (!reasonTrimmed) {
      setErrorMessage('A mandatory cancellation reason is required for compliance audit logging.');
      return;
    }

    if (reasonTrimmed.length < 5) {
      setErrorMessage('Please provide a descriptive reason (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await cancelAppointment(appointment.Appointment_ID, {
        cancellation_reason: reasonTrimmed,
      });
      onSuccess(updated);
      setCancellationReason('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to cancel appointment. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="font-bold text-gray-900 text-base">Cancel Appointment</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Appointment Snapshot */}
          <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-1.5 text-xs text-gray-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-gray-900">
                <User className="w-3.5 h-3.5 text-gray-400" />
                {appointment.Patient_Name}
              </span>
              <span className="text-gray-400">ID #{appointment.Patient_ID}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                {appointment.Doctor_Name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {appointment.Appointment_Date} at {appointment.Start_Time.slice(0, 5)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed">
            Cancelling this appointment will release the consultation time slot back into the clinic schedule and log this change to the compliance audit trail.
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Patient requested cancellation due to family emergency, physician called away..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cancellationReason.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelAppointmentModal;
