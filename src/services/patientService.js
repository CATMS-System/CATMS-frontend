// patient api service calls

import { request } from './api';

export async function searchPatients(query = '', page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  const trimmed = (query || '').trim();
  if (trimmed) {
    // If user enters formatted patient code like "PAT-0014" or "PAT 14", extract numeric ID
    const patCodeMatch = trimmed.match(/^pat[-\s]*(\d+)$/i);
    const resolvedQuery = patCodeMatch ? String(parseInt(patCodeMatch[1], 10)) : trimmed;
    params.set('query', resolvedQuery);
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
