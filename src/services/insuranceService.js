// insurance provider and policy api calls

import { request } from './api';

export async function listProviders() {
  return request('GET', '/insurance/providers');
}

export async function createProvider(provider) {
  return request('POST', '/insurance/providers', provider);
}

export async function listPolicies(patientId) {
  return request('GET', `/patients/${patientId}/policies`);
}

export async function addPolicy(patientId, policy) {
  return request('POST', `/patients/${patientId}/policies`, policy);
}
