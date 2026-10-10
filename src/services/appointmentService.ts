/**
 * Frontend API Service for Doctors, Schedules, Appointments, and Clinic Waiting Queue.
 * Proxies calls to FastAPI backend on port 8000 via Vite dev server proxy.
 */

import type {
  DoctorProfile,
  DoctorWeeklySchedule,
  AvailableSlot,
  SpecialtyItem,
} from '../types/doctor';
import type {
  AppointmentResponse,
  AppointmentCreatePayload,
  WalkInAppointmentPayload,
  AppointmentReschedulePayload,
  AppointmentCancelPayload,
  AppointmentStatusCounts,
  QueueItem,
} from '../types/appointment';


const API_BASE = '/api/v1';

function getHeaders(customHeaders: Record<string, string> = {}): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    const errorMessage = errorBody?.detail || `HTTP Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

// ============================================================================
// Doctor & Specialty API Queries
// ============================================================================

export async function getDoctors(branchId?: number, specialtyId?: number, search?: string): Promise<DoctorProfile[]> {
  const params = new URLSearchParams();
  if (branchId) params.append('branch_id', branchId.toString());
  if (specialtyId) params.append('specialty_id', specialtyId.toString());
  if (search) params.append('search', search);

  const url = `${API_BASE}/doctors${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse<DoctorProfile[]>(res);
}

export async function getDoctorById(doctorId: number): Promise<DoctorProfile> {
  const res = await fetch(`${API_BASE}/doctors/${doctorId}`, { headers: getHeaders() });
  return handleResponse<DoctorProfile>(res);
}

export async function getDoctorSchedules(doctorId: number, branchId?: number): Promise<DoctorWeeklySchedule[]> {
  const params = new URLSearchParams();
  if (branchId) params.append('branch_id', branchId.toString());

  const url = `${API_BASE}/doctors/${doctorId}/schedules${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse<DoctorWeeklySchedule[]>(res);
}

export async function getDoctorAvailableSlots(
  doctorId: number,
  date: string,
  durationMinutes: number = 30,
  branchId?: number
): Promise<AvailableSlot[]> {
  const params = new URLSearchParams({ date, duration_minutes: durationMinutes.toString() });
  if (branchId) params.append('branch_id', branchId.toString());

  const res = await fetch(`${API_BASE}/doctors/${doctorId}/available-slots?${params.toString()}`, { headers: getHeaders() });
  return handleResponse<AvailableSlot[]>(res);
}

export async function getSpecialties(): Promise<SpecialtyItem[]> {
  const res = await fetch(`${API_BASE}/specialties`, { headers: getHeaders() });
  return handleResponse<SpecialtyItem[]>(res);
}

// ============================================================================
// Appointment Management API Operations
// ============================================================================

export async function bookAppointment(payload: AppointmentCreatePayload): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function bookWalkIn(payload: WalkInAppointmentPayload): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/walk-in`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function getAppointments(filters?: {
  date?: string;
  doctor_id?: number;
  branch_id?: number;
  status?: string;
}): Promise<AppointmentResponse[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.append('date', filters.date);
  if (filters?.doctor_id) params.append('doctor_id', filters.doctor_id.toString());
  if (filters?.branch_id) params.append('branch_id', filters.branch_id.toString());
  if (filters?.status) params.append('status', filters.status);

  const url = `${API_BASE}/appointments${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse<AppointmentResponse[]>(res);
}

export async function getAppointmentById(appointmentId: number): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}`, { headers: getHeaders() });
  return handleResponse<AppointmentResponse>(res);
}

export async function getAppointmentStatusCounts(params?: {
  date?: string;
  branch_id?: number;
  doctor_id?: number;
}): Promise<AppointmentStatusCounts> {
  const query = new URLSearchParams();
  if (params?.date) query.append('date', params.date);
  if (params?.branch_id) query.append('branch_id', params.branch_id.toString());
  if (params?.doctor_id) query.append('doctor_id', params.doctor_id.toString());

  const url = `${API_BASE}/appointments/metrics/status-counts${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  return handleResponse<AppointmentStatusCounts>(res);
}

export async function getDailyQueue(branchId: number, date?: string, includeCompleted: boolean = false): Promise<QueueItem[]> {
  const params = new URLSearchParams({ branch_id: branchId.toString() });
  if (date) params.append('date', date);
  if (includeCompleted) params.append('include_completed', 'true');

  const res = await fetch(`${API_BASE}/appointments/queue?${params.toString()}`, { headers: getHeaders() });
  return handleResponse<QueueItem[]>(res);
}

export async function rescheduleAppointment(
  appointmentId: number,
  payload: AppointmentReschedulePayload
): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/reschedule`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function cancelAppointment(
  appointmentId: number,
  payload: AppointmentCancelPayload
): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AppointmentResponse>(res);
}

