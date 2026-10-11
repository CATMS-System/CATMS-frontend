# CATMS Frontend Web Client

Welcome to the frontend repository of the **Clinic Appointment and Treatment Management System (CATMS)**.

CATMS is an outpatient clinic management platform built for healthcare centers in Sri Lanka. This web client provides a fast, intuitive single-page application (SPA) tailored for clinic administrators, branch managers, receptionists, doctors, billing staff, and patients.

The frontend is built with **React**, **Vite**, and **Tailwind CSS**, featuring full **trilingual support** in **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [How Frontend & Backend Connect](#how-frontend--backend-connect)
3. [Main Implemented Features](#main-implemented-features)
4. [Team Workload Distribution](#team-workload-distribution)
5. [Additional & Future Features](#additional--future-features)
6. [Technologies Used](#technologies-used)
7. [System Requirements](#system-requirements)
8. [Local Setup (Without Docker)](#local-setup-without-docker)
9. [Running with Docker Compose](#running-with-docker-compose)
10. [URLs & Health Check](#urls--health-check)
11. [Database Initialization & Seeding](#database-initialization--seeding)
12. [Configuration & Environment](#configuration--environment)
13. [Running Tests & Build Checks](#running-tests--build-checks)
14. [Project Structure](#project-structure)
15. [Troubleshooting](#troubleshooting)
16. [Security Guidelines](#security-guidelines)

---

## Overview & Architecture

The CATMS web application is designed with a role-based workspace model. Once authenticated, users are directed to an interface customized for their operational responsibilities:
- **Admin**: Full system management, user accounts, and system-wide audit logs.
- **Branch Manager**: Local clinic operations, staff rosters, and branch metrics.
- **Receptionist**: Patient registration, doctor schedules, appointment booking, and waiting queues.
- **Doctor**: Consultation workbench, clinical notes, and itemized prescription ordering.
- **Billing Staff**: Invoice ledger, insurance claims, and payment settlements.
- **Patient**: Self-service portal for appointment booking, medical consult history, and invoice records.

### Language & Internationalization (i18n)
A dedicated language selector in the top bar allows users to switch between **English**, **සිංහල (Sinhala)**, and **தமிழ் (Tamil)** at any time. The chosen language is saved in browser storage (`localStorage`) so your preference persists after page reloads. English is the default and acts as an automatic fallback for any missing key.

---

## How Frontend & Backend Connect

The frontend interacts with the **CATMS FastAPI backend** running at `http://localhost:8000`.

```
  +-------------------------+                       +-------------------------+
  |     React Client        |                       |     FastAPI Backend     |
  |  (Browser on :5173)     |                       |    (Uvicorn on :8000)   |
  +-------------------------+                       +-------------------------+
               |                                                 |
               |--- POST /api/v1/auth/login -------------------->|  (Authenticates user)
               |<-- Returns JWT access_token --------------------|
               |                                                 |
               |--- GET /api/v1/doctors [Bearer token] --------->|  (Fetches clinic data)
               |<-- JSON Response -------------------------------|
```

- **Local Development**: The Vite development server (`vite.config.js`) proxies all requests starting with `/api` directly to `http://localhost:8000`. This avoids cross-origin (CORS) hurdles during development.
- **Production / Docker**: The production Docker container serves the built static files via Nginx, which reverse-proxies `/api/` traffic to the backend container (`http://backend:8000/api/`).
- **Token Handling**: Login stores the JSON Web Token in `localStorage`. The Axios API client (`src/api/axios.js`) automatically attaches this token to the `Authorization` header on all protected requests. If a token expires (HTTP 401), the user is logged out automatically.

---

## Main Implemented Features

1. **Role-Based Workspaces**:
   - `AdminPanel.jsx`: User account creation, staff directory, role assignments, and readable audit log table.
   - `ManagerPanel.jsx`: Branch details, staff roster, locked branch scope, and local operational stats.
   - `ReceptionPanel.jsx`: Patient intake, physician selector, dynamic shift slot picker, emergency walk-ins, and live clinic queue.
   - `DoctorPanel.jsx`: Queue list, active consultation room, vital signs input (BP, pulse, temp, SpO2), clinical notes, and multi-item prescription prescriber.
   - `BillingPanel.jsx`: Invoices ledger, itemized bill breakdown, insurance claim submission, and payment collection with balance tracking.
   - `PatientPanel.jsx`: Patient self-service booking wizard, past consultation visits, and itemized statements.
   - `ReportsPanel.jsx`: 5 operational management reports with date pickers, branch filters, data tables, and visual charts.
2. **Trilingual Language Selector**:
   - Clean dropdown in the top navigation bar displaying **English**, **සිංහල**, and **தமிழ்**.
   - Dynamic, immediate UI text switching without reloading the page.
   - Preserves patient names and data while translating system labels, buttons, navigation, and dialogs.
3. **Appointment Scheduling Engine**:
   - Dynamic shift intervals showing open, selected, and occupied slots.
   - Priority walk-in triage classification (`Normal`, `High`, `Critical`).
   - Appointment rescheduling modal and cancellation dialog with audit reasons.
4. **Itemized Prescriptions & Currency**:
   - Treatment catalogue browser with price snapshots and category filtering.
   - Real-time prescription estimation formatted in Sri Lankan Rupees (**Rs.**).
5. **Secure Authentication**:
   - Automated cache clearing upon logout.
   - New patient registration automatically creates a secure random initial password displayed to staff.

---

## Team Workload Distribution

The frontend was built by a collaborative 5-member team following the project workload specification:

* **Member 1 (Coordinator) – Shell, Auth & Clinic Administration**:
  - React application shell, routing, `AuthContext`, and Axios API client configuration.
  - `AdminPanel.jsx` (User account management, staff creation, role assignment, audit logs).
  - `ManagerPanel.jsx` (Branch management, staff roster, local clinic metrics).
  - Integration review, design consistency, and shared component coordination.
* **Member 2 – Patient Management & Self-Service Portal**:
  - Patient registration modal with emergency contact subforms.
  - Cross-branch patient search with filters (Name, NIC, phone number).
  - `PatientPanel.jsx` (Patient self-view: profile, linked insurance policies, consultation history).
* **Member 3 – Doctor Availability & Appointment Workflows**:
  - `ReceptionPanel.jsx` appointment booking workflow.
  - `DoctorSelector.tsx` and `TimeSlotPicker.tsx` (Dynamic physician slot availability grid).
  - `ClinicQueueTable.tsx` (Live waiting queue with scheduled vs. walk-in badges and polling).
  - Rescheduling modal, cancellation dialog, and schedule conflict alert banners.
* **Member 4 – Clinical Consultations & Prescriptions**:
  - `DoctorPanel.jsx` (Patient queue, active consultation room).
  - Clinical diagnosis recording, vitals input (BP, HR, Temp, SpO2), and doctor notes.
  - Multi-item treatment prescription table with dosage instructions and estimation.
  - "Complete Visit & Send to Billing" action.
* **Member 5 – Billing, Insurance Claims & Management Reports**:
  - `BillingPanel.jsx` (Invoice ledger, detailed bill modal, payment input, claim status).
  - `ReportsPanel.jsx` (5 tabbed operational management reports with date pickers, branch filters, CSV export, and charts).

---

## Additional & Future Features

### Features Already Implemented
- **3-Language i18n System**: English, Sinhala, and Tamil support across all navigation, buttons, headings, and dialogs.
- **Random First Password**: Automatic generation of temporary passwords for newly registered patients (Fix C-2).
- **Session Purge on Logout**: Full removal of cached user information, profile data, and auth tokens upon logout (Fix H-4).
- **Sri Lankan Rupee Currency**: Standardized currency display across all doctor, patient, billing, and manager panels (`Rs.`).
- **Real Names in Audit Log**: Displays staff usernames and branch labels instead of generic system placeholders (Fix M-6).
- **Automated CI Workflow**: GitHub Actions workflow running `npm ci`, `npm test`, and `npm run build` on every push and pull request.

### Possible Future Improvements (Not Yet Implemented)
- **Dark Mode Theme**: Visual theme switcher between light and dark clinical layouts.
- **Prescription PDF Download**: Instant printable prescription slip generation directly from the Doctor consultation room.
- **Audio Chime Alerts**: Subtle sound notification when a receptionist checks in a new patient for the doctor queue.
- **Calendar Drag-and-Drop**: Interactive calendar view for receptionists to reschedule appointments by dragging time slots.

---

## Technologies Used

- **Framework**: React 19
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **PDF & Canvas Export**: jsPDF, jspdf-autotable, html2canvas
- **Animation Effects**: canvas-confetti
- **Testing**: Node.js Test Runner (`node:test`, `node:assert`)

---

## System Requirements

Before running the frontend, ensure you have:
- **Node.js**: v20+ or v22+ LTS (Node.js 22 LTS recommended)
- **npm**: v10+ (bundled with Node.js)
- **Git**
- The **CATMS-backend** service running (see the backend repository setup)

---

## Local Setup (Without Docker)

### Step 1: Clone and Navigate
```bash
git clone https://github.com/CATMS-System/CATMS-frontend.git
cd CATMS-frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Backend Service
Make sure the CATMS backend is running locally at `http://localhost:8000`. The Vite development server automatically forwards all `/api` requests to it.

### Step 4: Run the Development Server
```bash
npm run dev
```

The application will launch at:
**[http://localhost:5173](http://localhost:5173)**

---

## Running with Docker Compose

If you prefer to run both the frontend and backend together using Docker containers, use the full-stack Docker Compose configuration located in the backend repository.

> **Note on Folder Structure**: The Compose file expects both repositories to sit next to each other in sibling folders:
> ```text
> parent-folder/
>   ├── CATMS-backend/      <-- Contains docker-compose.full.yml
>   └── CATMS-frontend/     <-- Current directory
> ```

To start the full-stack environment:
1. Navigate to the backend directory:
   ```bash
   cd ../CATMS-backend
   ```
2. Start the Compose stack:
   ```bash
   docker compose -f docker-compose.full.yml up --build
   ```
3. Open your browser and visit **[http://localhost:5173](http://localhost:5173)**.

---

## URLs & Health Check

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Main user interface |
| **Backend API Root** | [http://localhost:8000/](http://localhost:8000/) | Backend service entry point |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI documentation |
| **Backend Health Check** | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) | API and database connectivity status |

---

## Database Initialization & Seeding

The database is managed and initialized by the **CATMS-backend** service. 

If you have just cloned the project and need sample accounts, doctors, and clinics:
1. Ensure MySQL is running on port 3306.
2. From the backend repository, run:
   ```bash
   python sql/run_all.py
   ```
3. (Optional) For a realistic clinic demo dataset with 40 patients and ~780 appointments, run:
   ```bash
   python sql/seed_demo_data.py
   ```

---

## Configuration & Environment

The frontend development server proxy is configured in `vite.config.js`:
```javascript
server: {
  port: 5173,
  strictPort: true,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```
If your backend runs on a different port, update the `target` in `vite.config.js` accordingly.

In Docker production builds, reverse-proxying is handled by `nginx.conf`:
```nginx
location /api/ {
    proxy_pass http://backend:8000/api/;
}
```

---

## Running Tests & Build Checks

### Run Test Suite
The frontend includes a fast, automated test suite covering authentication, role navigation, i18n translation lookups, date handling, and appointment booking wizards:
```bash
npm test
```
*Expected result: 98 tests pass with 0 failures.*

### Build for Production
To test or create an optimized production build:
```bash
npm run build
```
This compiles the application assets into the `dist/` directory.

### Preview the Production Build Locally
To test the built production bundle locally without a full Nginx container:
```bash
npm run preview
```

---

## Project Structure

```text
CATMS-frontend/
├── public/                       # Static public assets & icons
├── src/
│   ├── api/                      # Axios client instance & error handlers
│   ├── components/               # Role-based workspace panels & dialogs
│   │   ├── appointments/         # Physician selector, slot picker, queue table
│   │   ├── patients/             # Patient registration, search, and policy modals
│   │   ├── AdminPanel.jsx        # Admin dashboard & audit logs
│   │   ├── BillingPanel.jsx      # Invoicing, claims, and payment ledger
│   │   ├── DoctorPanel.jsx       # Doctor queue, vitals, & prescription table
│   │   ├── LanguageSelector.jsx  # Top-bar English/Sinhala/Tamil selector
│   │   ├── ManagerPanel.jsx      # Branch details & local staff directory
│   │   ├── PatientPanel.jsx      # Patient self-service booking & medical history
│   │   ├── ReceptionPanel.jsx    # Receptionist intake & booking workspace
│   │   └── ReportsPanel.jsx      # 5 operational management reports
│   ├── contexts/                 # React Context providers (AuthContext, LanguageContext)
│   ├── i18n/
│   │   └── translations.js       # Complete English, Sinhala, & Tamil text dictionary
│   ├── services/                 # API service modules
│   ├── utils/                    # Helper formatting & date calculation functions
│   ├── App.jsx                   # Main layout shell, navigation, and view routing
│   ├── index.css                 # Global styles & Tailwind directives
│   └── main.jsx                  # Application entry point
├── tests/                        # Automated unit & integration test files
├── .dockerignore                 # Docker build exclusions
├── Dockerfile                    # Multi-stage container build definition
├── nginx.conf                    # Nginx reverse proxy configuration
├── package.json                  # Dependencies and npm scripts
├── vite.config.js                # Vite build and proxy configuration
└── README.md                     # This documentation file
```

---

## Troubleshooting

- **`Network Error` or `Could not load your profile` on login**:
  Ensure the backend service is running on `http://localhost:8000`. Test it by opening `http://localhost:8000/api/v1/health` in your browser.
- **Port 5173 is already in use**:
  Another application is using port 5173. You can run the dev server on another port:
  ```bash
  npm run dev -- --port 5174
  ```
- **Sinhala or Tamil text appears as boxes**:
  Modern operating systems (Windows 10/11, macOS, modern Linux) have native Sinhala (Iskoola Pota / Nirmala UI) and Tamil (Latha / Vijaya) fonts pre-installed. Ensure standard system language fonts are enabled.
- **Language selection reset**:
  Language choice is stored in browser `localStorage` under `catms_language`. If you open the app in incognito/private browsing, it defaults to English until selected.

---

## Security Guidelines

- **Academic & Demo Use Only**: The demo accounts and seed users in this project are strictly intended for testing and academic evaluation.
- **No Client Secrets**: Client-side single-page applications should never contain private API keys, backend secrets, or database credentials.
- **Logout Clears Sensitive State**: Upon logging out, the application clears all stored JWT tokens and cached user data from `localStorage`.