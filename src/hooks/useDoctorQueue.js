import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * Custom hook to isolate doctor's daily appointment queue data source.
 * Attempts to fetch from Member 3's appointment queue endpoint if available on develop,
 * otherwise isolates the data source in this hook with fallback data so it can be swapped later.
 */
export function useDoctorQueue(doctorIdentifier, initialQueue = []) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Attempt to call Member 3's queue endpoint if implemented on backend
      const response = await api.get('/appointments/queue', {
        params: { doctor_id: doctorIdentifier },
      });
      if (response?.data && Array.isArray(response.data)) {
        setQueue(response.data);
        setLoading(false);
        return;
      }
    } catch (err) {
      // Endpoint not yet deployed or failed; fallback gracefully to isolated data
    } finally {
      setLoading(false);
    }

    // Default queue dataset
    const defaultData = initialQueue && initialQueue.length > 0 ? initialQueue : [
      {
        queueNo: 1,
        appointmentId: 'APP-1001',
        appointment_id: 1,
        patientId: 'PAT-0001',
        patient_id: 1,
        patientName: 'John Doe',
        reason: 'Routine cardiovascular follow-up',
        assignedDoctor: 'Dr. Alexander Bennett',
        doctorId: 'STF-001',
        doctor_id: 1,
        estWaitTime: 10,
        room: 'Room 105',
        status: 'SCHEDULED',
      },
      {
        queueNo: 2,
        appointmentId: 'APP-1002',
        appointment_id: 2,
        patientId: 'PAT-0002',
        patient_id: 2,
        patientName: 'Clara Oswald',
        reason: 'Severe throat infection',
        assignedDoctor: 'Dr. Sarah Jenkins',
        doctorId: 'STF-002',
        doctor_id: 2,
        estWaitTime: 15,
        room: 'Room 101',
        status: 'SCHEDULED',
      },
      {
        queueNo: 3,
        appointmentId: 'APP-1003',
        appointment_id: 3,
        patientId: 'PAT-0003',
        patient_id: 3,
        patientName: 'David Miller',
        reason: 'Eczema flare up',
        assignedDoctor: 'Dr. Alexander Bennett',
        doctorId: 'STF-001',
        doctor_id: 1,
        estWaitTime: 25,
        room: 'Consultation Room B',
        status: 'WALK_IN',
      },
    ];

    if (doctorIdentifier) {
      const filtered = defaultData.filter(
        (item) =>
          item.doctorId === doctorIdentifier ||
          item.assignedDoctor === doctorIdentifier ||
          item.doctor_id === doctorIdentifier
      );
      setQueue(filtered.length > 0 ? filtered : defaultData);
    } else {
      setQueue(defaultData);
    }
  }, [doctorIdentifier, initialQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const updateQueueStatus = (patientId, newStatus) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.patientId === patientId || item.patient_id === patientId
          ? { ...item, status: newStatus }
          : item
      )
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
