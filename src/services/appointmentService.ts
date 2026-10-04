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

const API_BASE = '/api/v1';

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
  const res = await fetch(url);
  return handleResponse<DoctorProfile[]>(res);
}

export async function getDoctorById(doctorId: number): Promise<DoctorProfile> {
  const res = await fetch(`${API_BASE}/doctors/${doctorId}`);
  return handleResponse<DoctorProfile>(res);
}

export async function getDoctorSchedules(doctorId: number, branchId?: number): Promise<DoctorWeeklySchedule[]> {
  const params = new URLSearchParams();
  if (branchId) params.append('branch_id', branchId.toString());

  const url = `${API_BASE}/doctors/${doctorId}/schedules${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
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

  const res = await fetch(`${API_BASE}/doctors/${doctorId}/available-slots?${params.toString()}`);
  return handleResponse<AvailableSlot[]>(res);
}

export async function getSpecialties(): Promise<SpecialtyItem[]> {
  const res = await fetch(`${API_BASE}/specialties`);
  return handleResponse<SpecialtyItem[]>(res);
}
