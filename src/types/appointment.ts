/**
 * TypeScript interface definitions for Appointment, Walk-in, and Queue domain.
 * Corresponds to backend Pydantic schemas in app/schemas/appointment.py.
 */

export type AppointmentType = 'Standard' | 'Follow_Up' | 'Emergency' | 'Walk_In';

export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No_Show';

export interface AppointmentResponse {
  Appointment_ID: number;
  Patient_ID: number;
  Patient_Name: string;
  Patient_NIC?: string | null;
  Patient_Phone?: string | null;
  Patient_Gender?: string | null;
  Doctor_ID: number;
  Doctor_Name: string;
  Doctor_License?: string | null;
  Branch_ID: number;
  Branch_Name: string;
  Branch_City?: string | null;
  Schedule_ID?: number | null;
  Appointment_Date: string;
  Start_Time: string;
  Duration_Minutes: number;
  End_Time?: string | null;
  Appointment_Type: AppointmentType;
  Status: AppointmentStatus;
  Cancellation_Reason?: string | null;
  Reason_For_Visit: string;
  Created_At?: string | null;
}

export interface AppointmentCreatePayload {
  patient_id: number;
  doctor_id: number;
  branch_id: number;
  appointment_date: string;
  start_time: string;
  duration_minutes?: number;
  appointment_type?: AppointmentType;
  reason_for_visit: string;
  schedule_id?: number | null;
}

export interface WalkInAppointmentPayload {
  patient_id: number;
  doctor_id: number;
  branch_id: number;
  reason_for_visit: string;
  duration_minutes?: number;
  triage_urgency?: 'Normal' | 'High' | 'Critical';
  appointment_date?: string | null;
  start_time?: string | null;
}

export interface AppointmentReschedulePayload {
  new_date: string;
  new_start_time: string;
  duration_minutes?: number;
  reschedule_reason?: string | null;
}

export interface AppointmentCancelPayload {
  cancellation_reason: string;
}

export interface AppointmentStatusCounts {
  Total: number;
  Scheduled: number;
  Confirmed: number;
  Completed: number;
  Cancelled: number;
  No_Show: number;
  Walk_In: number;
}

export interface QueueItem {
  Queue_Number: number;
  Appointment_ID: number;
  Patient_ID: number;
  Patient_Name: string;
  Patient_Phone?: string | null;
  Doctor_ID: number;
  Doctor_Name: string;
  Branch_ID: number;
  Branch_Name: string;
  Appointment_Date: string;
  Start_Time: string;
  Duration_Minutes: number;
  Appointment_Type: string;
  Status: string;
  Reason_For_Visit: string;
  Estimated_Wait_Minutes: number;
}
