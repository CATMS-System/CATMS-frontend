import api from './axios';

/**
 * Record a new consultation and generate invoice
 * @param {Object} payload - Consultation payload (appointment_id, diagnosis, clinical_notes, doctor_notes, follow_up_date, vitals, items)
 * Target endpoint: POST /api/v1/consultations
 */
export const createConsultation = async (payload) => {
  const response = await api.post('/consultations', payload);
  return response.data;
};

/**
 * Fetch consultation details by ID
 * @param {number|string} id - Consultation ID
 * Target endpoint: GET /api/v1/consultations/{id}
 */
export const getConsultation = async (id) => {
  const response = await api.get(`/consultations/${id}`);
  return response.data;
};

/**
 * Fetch patient consultation history
 * @param {number|string} patientId - Patient ID
 * Target endpoint: GET /api/v1/consultations/patient/{id}
 */
export const getPatientHistory = async (patientId) => {
  const response = await api.get(`/consultations/patient/${patientId}`);
  return response.data;
};

export default {
  createConsultation,
  getConsultation,
  getPatientHistory,
};
