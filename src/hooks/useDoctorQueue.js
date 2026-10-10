import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * Custom hook to isolate doctor's daily appointment queue data source.
 * Attempts to fetch from Member 3's appointment queue endpoint if available on develop,
 * otherwise isolates the data source in this hook with fallback data so it can be swapped later.
 * 
 * TODO: branchId should come from auth context once Member 1's auth work lands
 */
export function useDoctorQueue(doctorIdentifier, branchId = 1, initialQueue = []) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Gracefully handle if branchId is omitted or passed as array (backward compatibility)
  const resolvedBranchId = Array.isArray(branchId) ? 1 : (Number(branchId) || 1);
  const resolvedInitialQueue = Array.isArray(branchId) ? branchId : initialQueue;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/appointments/queue', {
        params: {
          branch_id: resolvedBranchId,
          doctor_id: doctorIdentifier,
        },
      });
      if (response?.data && Array.isArray(response.data)) {
        setQueue(response.data);
      } else {
        setQueue([]);
      }
    } catch (err) {
      console.error('Failed to fetch doctor appointment queue:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load doctor queue');
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [doctorIdentifier, resolvedBranchId]);

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
