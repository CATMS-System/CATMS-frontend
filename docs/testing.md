# Quality Assurance Verification & Testing Documentation

This document describes the testing strategy, test cases, and end-to-end verification workflows for Member 3's domain in CATMS: Physician Availability, Appointment Booking, Emergency Walk-in Intake, Live Clinic Waiting Queue, and Rescheduling/Cancellation lifecycle.

---

## 1. Test Architecture & Overview

The appointment domain utilizes a multi-tiered verification model to prevent regressions and enforce business constraints:
1. **Database Layer**: Trigger `trg_check_appointment_overlap` and Stored Procedure `sp_book_appointment` guarantee ACID isolation and zero double-booking at the storage engine level.
2. **Backend Automated Pytest Suite**: 64 automated integration test cases verifying API responses, status transitions, self-exclusion during rescheduling, and mandatory cancellation audits.
3. **Frontend Validation & Error Handling**: Client components (`AppointmentBookingModal`, `WalkInModal`, `RescheduleModal`) provide proactive client-side validation and graceful `HTTP 409 Conflict` feedback.

---

## 2. Automated Test Execution

### Backend Automated Pytest Suite
Run the appointment test suite from `CATMS-backend`:
```powershell
cd CATMS-backend
.\.venv\Scripts\python.exe -m pytest tests/test_appointments.py -v
```

Expected output:
- `test_case_1_standard_appointment_booking_service` PASSED
- `test_case_1_standard_appointment_booking_api` PASSED
- `test_case_2_overlapping_appointment_booking_service` PASSED (409 Conflict)
- `test_case_2_overlapping_appointment_booking_api` PASSED
- `test_adjacent_slots_do_not_collide` PASSED
- `test_case_3_emergency_walk_in_booking_service` PASSED
- `test_case_3_emergency_walk_in_booking_api` PASSED
- `test_case_4_reschedule_occupied_slot_rejected` PASSED
- `test_reschedule_self_exclusion_succeeds` PASSED
- `test_cancellation_and_protection_guards` PASSED
- `test_live_clinic_queue_ordering` PASSED

### Frontend Production Build Verification
Run the build command from `CATMS-frontend`:
```powershell
cd CATMS-frontend
npm run build
```

Expected output:
- Vite compile check completes with zero errors and generates optimized production chunks in `dist/`.

---

## 3. End-to-End Manual UI Walkthrough Scenarios

### Scenario A: Standard Appointment Booking
1. Navigate to the reception appointment interface.
2. Filter physicians by Branch (`Colombo Main`) and Specialty (`Cardiology`).
3. Select physician `Dr. Alexander Bennett`.
4. Choose an appointment date. The system dynamically queries `/api/v1/doctors/{id}/available-slots` and renders open time slots in emerald green badges.
5. Select an open slot (e.g. `09:00 - 09:30`).
6. Search and select a patient by Name or NIC using `PatientSearchField`.
7. Enter the visit reason and click **Confirm Appointment**.
8. **Verification**: 
   - HTTP POST request sent to `/api/v1/appointments`.
   - Response returns `201 Created` with appointment status `SCHEDULED`.
   - Slot automatically switches to occupied/booked on subsequent queries.

---

### Scenario B: Collision Prevention & HTTP 409 Conflict Handling
1. Attempt to book the exact same physician, date, and time slot (`09:00 - 09:30`) for a second patient.
2. Click **Confirm Appointment**.
3. **Verification**:
   - Backend database trigger `trg_check_appointment_overlap` fires and raises SQLSTATE 45000.
   - FastAPI controller captures the exception and returns `HTTP 409 Conflict`.
   - Frontend displays the `ConflictAlertBanner` warning: *"Scheduling Conflict Detected: The selected physician already has an overlapping appointment in this time window."*
   - Modal remains open allowing the user to select an alternate slot without losing entered patient data.

---

### Scenario C: Emergency Walk-In Intake
1. Click **Emergency Walk-In** to launch `WalkInModal`.
2. Search and select an arriving patient.
3. Select an on-duty doctor.
4. Select triage priority level: `Normal`, `High`, or `Critical`.
5. Enter clinical presentation symptoms (e.g. *"Acute chest discomfort"*).
6. Click **Register Walk-In**.
7. **Verification**:
   - Endpoint `/api/v1/appointments/walk-in` is called, bypassing slot dependency.
   - Status badge displays `WALK_IN`.
   - Walk-in confirmation card generates an intake token (`W-{id}`) and automatically pushes the patient to the live clinic queue.

---

### Scenario D: Live Clinic Waiting Queue
1. Open `ClinicQueueTable`.
2. Inspect the queue table sorted chronologically by scheduled time and walk-in arrivals.
3. **Verification**:
   - Sequential tokens displayed (`Q-01`, `Q-02`, `Q-03`).
   - Scheduled appointments display the blue `SCHEDULED` badge; walk-ins display the amber `WALK_IN` badge.
   - Wait time estimation is calculated and rendered dynamically.
   - Toggling **Auto (30s)** polls the backend every 30 seconds to refresh the queue without full-page reloads.

---

### Scenario E: Rescheduling with Self-Exclusion
1. Select an existing appointment and click **Reschedule**.
2. Pick a new available time slot on a different day or later shift.
3. Click **Confirm Reschedule**.
4. **Verification**:
   - Backend query executes with self-exclusion (`Appointment_ID != :id`), ensuring the appointment does not collide with its own current slot.
   - Slot updates in database, and the status remains `SCHEDULED`.

---

### Scenario F: Cancellation with Mandatory Audit Reason
1. Select an appointment and click **Cancel Appointment**.
2. Attempt to submit with an empty reason; verify client validation blocks submission.
3. Enter a valid reason (e.g. *"Patient requested cancellation due to personal travel"*).
4. Click **Confirm Cancellation**.
5. **Verification**:
   - `PUT /api/v1/appointments/{id}/cancel` updates status to `CANCELLED` and writes `cancellation_reason`.
   - The slot is immediately released and becomes bookable again for other patients.
