import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const normalizeQueueItem = (item, idx = 0) => ({
  ...item,
  queueNo: item.Queue_Number || item.queue_number || item.queueNo || idx + 1,
  appointmentId: item.Appointment_ID || item.appointment_id || item.appointmentId || item.id,
  appointment_id: item.Appointment_ID || item.appointment_id || item.appointmentId,
  Appointment_ID: item.Appointment_ID || item.appointment_id || item.appointmentId,
  patientId: item.Patient_ID ? `PAT-${String(item.Patient_ID).padStart(4, '0')}` : (item.patientId || item.patient_id),
  patient_id: item.Patient_ID || item.patient_id,
  Patient_ID: item.Patient_ID || item.patient_id,
  patientName: item.Patient_Name || item.patient_name || item.patientName,
  patientPhone: item.Patient_Phone || item.patient_phone || item.patientPhone,
  doctorId: item.Doctor_ID || item.doctor_id || item.doctorId,
  doctor_id: item.Doctor_ID || item.doctor_id,
  Doctor_ID: item.Doctor_ID || item.doctor_id,
  doctorName: item.Doctor_Name || item.doctor_name || item.assignedDoctor,
  reason: item.Reason_For_Visit || item.reason_for_visit || item.reason || 'Consultation',
  status: item.Status || item.status || 'SCHEDULED',
  Status: item.Status || item.status || 'SCHEDULED',
});

/**
 * Custom hook to isolate doctor's daily appointment queue data source.
 * Attempts to fetch from Member 3's appointment queue endpoint if available on develop,
 * otherwise isolates the data source in this hook with fallback data so it can be swapped later.
 * 
 * TODO: branchId should come from auth context once Member 1's auth work lands
 */
export function useDoctorQueue(doctorIdentifier, branchId = 1, initialQueue = []) {
  // Gracefully handle if branchId is omitted or passed as array (backward compatibility)
  const resolvedBranchId = Array.isArray(branchId) ? 1 : (Number(branchId) || 1);
  const resolvedInitialQueue = Array.isArray(branchId) ? branchId : initialQueue;

  const [queue, setQueue] = useState(() => {
    if (Array.isArray(resolvedInitialQueue) && resolvedInitialQueue.length > 0) {
      return resolvedInitialQueue.map(normalizeQueueItem);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Resolve numeric doctor ID from doctorIdentifier (e.g., 'STF-001' -> 1)
  const numericDoctorId = typeof doctorIdentifier === 'number'
    ? doctorIdentifier
    : parseInt(String(doctorIdentifier || '').replace(/\D/g, ''), 10) || undefined;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { branch_id: resolvedBranchId, include_completed: true };
      if (numericDoctorId) {
        params.doctor_id = numericDoctorId;
      }
      const response = await api.get('/appointments/queue', { params });
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        setQueue(response.data.map(normalizeQueueItem));
      } else if (Array.isArray(resolvedInitialQueue) && resolvedInitialQueue.length > 0) {
        setQueue(resolvedInitialQueue.map(normalizeQueueItem));
      } else {
        setQueue([]);
      }
    } catch (err) {
      console.warn('Failed to fetch doctor appointment queue from API, using fallback:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load doctor queue');
      if (Array.isArray(resolvedInitialQueue) && resolvedInitialQueue.length > 0) {
        setQueue(resolvedInitialQueue.map(normalizeQueueItem));
      } else {
        setQueue([]);
      }
    } finally {
      setLoading(false);
    }
  }, [numericDoctorId, resolvedBranchId, resolvedInitialQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const updateQueueStatus = (identifier, newStatus) => {
    if (!identifier) return;
    const rawId = String(identifier).trim();
    const cleanNum = rawId.replace(/\D/g, '');

    setQueue((prev) =>
      prev.map((item) => {
        const itemPatId = String(item.Patient_ID || item.patient_id || item.patientId || '').trim();
        const itemPatNum = itemPatId.replace(/\D/g, '');
        const itemApptId = String(item.Appointment_ID || item.appointment_id || item.appointmentId || item.id || '').trim();
        const itemApptNum = itemApptId.replace(/\D/g, '');

        const matches =
          itemPatId === rawId ||
          itemApptId === rawId ||
          (cleanNum && (itemPatNum === cleanNum || itemApptNum === cleanNum));

        return matches ? { ...item, status: newStatus, Status: newStatus } : item;
      })
    );
  };

  return {
    queue,
    setQueue,
    loading,
    error,
    refreshQueue: fetchQueue,
    updateQueueStatus,
  };
}

export default useDoctorQueue;
