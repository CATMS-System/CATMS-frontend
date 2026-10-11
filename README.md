# CATMS Frontend Service

Web client for the Clinic Appointment and Treatment Management System (CATMS), built with React, Vite, and Tailwind CSS.

## Getting Started

### 1. Prerequisites
- Node.js 24 LTS recommended (Vite and its React plugin require Node.js `^20.19.0 || >=22.12.0`).
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

The application will run at `http://localhost:5173`.
Vite dev server is pre-configured to proxy all `/api` requests to the FastAPI backend running at `http://localhost:8000`.

### 4. Build for Production
```bash
npm run build
```

---

## Component Architecture

### Core Workspace Panels
- `src/App.jsx`: Application layout shell, header, and workspace role selector.
- `src/components/`:
  - `AdminPanel.jsx`: User account management and audit trail.
  - `ManagerPanel.jsx`: Branch oversight and staff directory.
  - `ReceptionPanel.jsx`: Patient intake, doctor scheduling, and appointment booking.
  - `DoctorPanel.jsx`: Clinical consultation notes and treatment prescribing.
  - `BillingPanel.jsx`: Invoice generation, payments, and insurance claims.
  - `PatientPanel.jsx`: Patient profile and appointment history.
  - `ReportsPanel.jsx`: 5 operational management reports with charts.

### Member 3: Appointment & Physician Lifecycle (`src/components/appointments/`)
- `DoctorSelector.tsx`: Multi-branch and medical specialty physician selection cards with consultation fees.
- `TimeSlotPicker.tsx`: Dynamic shift interval time-slot availability grid with open, selected, and booked states.
- `PatientSearchField.tsx`: Patient lookup by Name, NIC, or contact number with suggestion dropdown.
- `ConflictAlertBanner.tsx`: Visual alert banner for HTTP 409 conflict and schedule collision feedback.
- `AppointmentBookingModal.tsx`: Atomic appointment booking modal integrating patient search, doctor selector, and slot picker.
- `TriageUrgencySelector.tsx`: Priority classification (`Normal`, `High`, `Critical`) for walk-in arrivals.
- `WalkInModal.tsx`: Fast-path unscheduled intake modal with instant token generation (`W-{id}`).
- `QueueStatusBadge.tsx`: Visual queue type badge (`SCHEDULED`, `WALK_IN`, `EMERGENCY`) and estimated wait times.
- `ClinicQueueTable.tsx`: Live clinic waiting queue table with branch filtering, token tracking, and 30-second auto-polling.
- `CancelAppointmentModal.tsx`: Appointment cancellation flow enforcing mandatory compliance audit justification.
- `RescheduleModal.tsx`: Appointment rescheduling modal with slot reselection and self-exclusion validation.

### Data Access & Types
- `src/services/appointmentService.ts`: Centralized typed API client communicating with backend `/api/v1/*`.
- `src/types/doctor.ts`: TypeScript interfaces for physicians, specialties, schedules, and slots.
- `src/types/appointment.ts`: TypeScript interfaces for appointments, walk-ins, queues, and reschedule payloads.
- `docs/testing.md`: Complete QA walkthrough, test scenarios, and verification commands.