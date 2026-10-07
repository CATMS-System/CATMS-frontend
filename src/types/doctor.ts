/**
 * TypeScript interface definitions for Doctor & Specialty domain.
 * Corresponds to backend Pydantic schemas in app/schemas/doctor.py.
 */

export interface SpecialtyItem {
  Specialty_ID: number;
  Specialty_Name: string;
  Description?: string | null;
  Doctor_Count?: number;
}

export interface DoctorProfile {
  Doctor_ID: number;
  Staff_ID: number;
  First_Name: string;
  Last_Name: string;
  Full_Name?: string;
  Email?: string | null;
  Contact_Number?: string | null;
  Branch_ID: number;
  Branch_Name?: string;
  License_Number: string;
  Standard_Consultation_Fee: number;
  Specialties: string[];
}

export interface DoctorWeeklySchedule {
  Schedule_ID: number;
  Doctor_ID: number;
  Branch_ID: number;
  Branch_Name: string;
  Day_Of_Week: string;
  Start_Time: string;
  End_Time: string;
  Shift_Duration_Minutes: number;
  Availability_Status: 'Active' | 'Inactive' | 'On_Leave';
}

export interface AvailableSlot {
  Start_Time: string;
  End_Time: string;
  Duration_Minutes: number;
  Branch_ID: number;
  Branch_Name: string;
  Schedule_ID?: number | null;
  Date: string;
}
