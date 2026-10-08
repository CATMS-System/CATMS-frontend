// patient api service calls

import { request } from './api';

export async function searchPatients(query = '', page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  if (query && query.trim()) {
    params.set('query', query.trim());
  }
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return request('GET', `/patients?${params.toString()}`);
}

export async function getPatient(patientId) {
  return request('GET', `/patients/${patientId}`);
}

export async function registerPatient(patient) {
  return request('POST', '/patients', patient);
}

export async function updatePatient(patientId, updateData) {
  return request('PUT', `/patients/${patientId}`, updateData);
}
