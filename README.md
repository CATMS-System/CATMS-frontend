# CATMS Frontend Web Client

Welcome to the frontend repository of the **Clinic Appointment and Treatment Management System (CATMS)**.

CATMS is a clinic management platform created for outpatient medical centers in Sri Lanka. This web client provides a fast, user-friendly single-page application (SPA) for clinic administrators, branch managers, receptionists, doctors, billing staff, and patients.

The frontend is built with **React**, **Vite**, and **Tailwind CSS**. It includes full **trilingual support** in **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.

---

## Table of Contents
1. [What This Repository Does](#what-this-repository-does)
2. [Live Demo & Cloud Hosting](#live-demo--cloud-hosting)
3. [How the Frontend Connects to the Backend](#how-the-frontend-connects-to-the-backend)
4. [Main Implemented Features](#main-implemented-features)
5. [Team Workload Distribution](#team-workload-distribution)
6. [Additional Features & Future Work](#additional-features--future-work)
7. [Technologies Used](#technologies-used)
8. [System Requirements](#system-requirements)
9. [Local Setup Without Docker](#local-setup-without-docker)
10. [Running with Docker Compose](#running-with-docker-compose)
11. [URLs & Health Check](#urls--health-check)
12. [Database Initialization & Seeding](#database-initialization--seeding)
13. [Configuration & Environment](#configuration--environment)
14. [Running Tests & Build Checks](#running-tests--build-checks)
15. [Project Structure Overview](#project-structure-overview)
16. [Troubleshooting Common Issues](#troubleshooting-common-issues)
17. [Security Notes](#security-notes)

---

## What This Repository Does

The frontend application provides role-based workspaces tailored to each user's job in the clinic:
- **Admin**: Create user accounts, add staff, assign roles, and view readable audit logs.
- **Branch Manager**: Review clinic operations, staff rosters, and branch metrics.
- **Receptionist**: Register patients, look up doctor schedules, book appointments, manage walk-ins, and track waiting queues.
- **Doctor**: View the daily queue, write consultation notes, record vitals, and prescribe itemized treatments.
- **Billing Staff**: Review invoices, submit insurance claims, record payments, and issue receipts.
- **Patient**: Self-service portal to book appointments, view consultation history, and review invoices.

### Trilingual Language Selector
Users can change the interface language at any time using the dropdown in the top bar: **English**, **සිංහල (Sinhala)**, or **தமிழ் (Tamil)**. The selected language is saved in browser storage (`localStorage`) so it stays active across page reloads. English is the default language and serves as an automatic fallback if a translation is missing.

---

## Live Demo & Cloud Hosting

A live demonstration of the full CATMS system is deployed and running on free-tier cloud infrastructure:

| Component | Provider / Hosting Type | Live URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Render Static Site | [https://catms-frontend.onrender.com](https://catms-frontend.onrender.com) | Interactive React client with trilingual support |
| **Backend API Root** | Render Web Service | [https://catms-backend.onrender.com](https://catms-backend.onrender.com) | FastAPI REST service root |
| **Interactive API Docs** | Render Web Service | [https://catms-backend.onrender.com/docs](https://catms-backend.onrender.com/docs) | Swagger UI for exploring and testing API endpoints |
| **Alternative API Docs** | Render Web Service | [https://catms-backend.onrender.com/redoc](https://catms-backend.onrender.com/redoc) | ReDoc API specifications |
| **Backend Health Check** | Render Web Service | [https://catms-backend.onrender.com/api/v1/health](https://catms-backend.onrender.com/api/v1/health) | Live service and cloud database health status |

> [!NOTE]
> **Free Tier Sleep Notice**: Free services on Render automatically spin down or sleep after 15 minutes of inactivity. When visiting the site or API after a period of idleness, the first request may take approximately 30–50 seconds while the backend web service spins back up. Subsequent requests respond immediately.

> [!CAUTION]
> **Educational & Demo Use Only**: This deployment is strictly for academic and demonstration purposes. It contains fictional sample data only and **must not be used with real patient data** or clinical records.

---

## How the Frontend Connects to the Backend

The frontend communicates with the **CATMS FastAPI backend** running at `http://localhost:8000`:

```text
  React Client (Browser on port 5173)
                     |
                     |  Sends requests to /api/*
                     v
  Vite Dev Server (Proxies /api to http://localhost:8000)
                     |
                     v
  FastAPI Backend (Port 8000)
```

- **Local Development Proxy**: Configured in `vite.config.js` to automatically forward all `/api` requests to `http://localhost:8000`. This prevents CORS issues during local development.
- **Production Container Proxy**: When built with Docker, Nginx serves the compiled static files and reverse-proxies `/api/` calls to the backend container (`http://backend:8000/api/`).
- **Token Management**: When a user logs in, their JWT access token is stored in browser `localStorage`. The Axios client (`src/api/axios.js`) attaches this token to the `Authorization` header for all protected API calls. If the token expires (HTTP 401), the user is automatically logged out.

---

## Main Implemented Features

1. **Role-Based Workspaces**:
   - `AdminPanel.jsx`: User account creation, staff directory, role assignments, and readable audit logs.
   - `ManagerPanel.jsx`: Branch details, staff roster, locked branch scope, and local operational stats.
   - `ReceptionPanel.jsx`: Patient intake, physician selector, dynamic shift slot picker, emergency walk-ins, and live clinic queue.
   - `DoctorPanel.jsx`: Daily patient queue, active consultation room, vital signs input (BP, pulse, temp, SpO2), clinical notes, and multi-item prescription prescriber.
   - `BillingPanel.jsx`: Invoices ledger, detailed bill breakdown, insurance claim submission, and payment collection with balance tracking.
   - `PatientPanel.jsx`: Patient self-service booking wizard, past consultation visits, and itemized billing statements.
   - `ReportsPanel.jsx`: 5 operational management reports with date pickers, branch filters, data tables, and visual charts.
2. **Trilingual Language Selector**:
   - Top-bar dropdown showing **English**, **සිංහල**, and **தமிழ்**.
   - Immediate UI text updates without page reloads.
   - Keeps user-entered data intact while translating all system labels, buttons, navigation, and dialogs.
3. **Appointment Scheduling Engine**:
   - Dynamic shift intervals showing open, selected, and occupied slots.
   - Priority walk-in triage classification (`Normal`, `High`, `Critical`).
   - Appointment rescheduling modal and cancellation dialog with audit reasons.
4. **Itemized Prescriptions & Currency**:
   - Treatment catalogue browser with price snapshots and category filtering.
   - Real-time prescription estimation formatted in Sri Lankan Rupees (**Rs.**).
5. **Secure Authentication & Logout**:
   - Automated cache clearing upon logout (Fix H-4).
   - New patient registration automatically creates a secure random initial password displayed to staff (Fix C-2).
6. **Full-Stack Containerization**:
   - Docker Compose can run MySQL 8.0, the backend, and the frontend together in one command using the `docker-compose.full.yml` file located in the backend repository.
   - The frontend repository must be placed in a sibling folder named `CATMS-frontend` alongside `CATMS-backend` so Docker can build the frontend container.

---

## Team Workload Distribution

As confirmed in the project document `TEAM_WORKLOAD_DISTRIBUTION.md`, the frontend workload is divided among 5 team members across distinct full-stack functional areas:

* **Member 1: Core Foundation, Security & Clinic Administration (Coordinator)**:
  - React application shell, routing, `AuthContext`, and Axios API client configuration.
  - `AdminPanel.jsx` (User accounts, staff creation, role assignments, audit logs).
  - `ManagerPanel.jsx` (Branch management, staff roster, local clinic metrics).
  - Component consistency, navigation, and pull request integration.
* **Member 2: Patient Registration & Insurance Management**:
  - Patient registration modal with emergency contact subforms.
  - Cross-branch patient search with filters (Name, NIC, phone number).
  - `PatientPanel.jsx` (Patient self-view: profile, linked insurance policies, consultation history).
* **Member 3: Doctor Availability & Appointment Workflows**:
  - `ReceptionPanel.jsx` appointment booking workflow.
  - `DoctorSelector.tsx` and `TimeSlotPicker.tsx` (Dynamic physician slot availability grid).
  - `ClinicQueueTable.tsx` (Live waiting queue with scheduled vs. walk-in badges and polling).
  - Rescheduling modal, cancellation dialog, and schedule conflict alert banners.
* **Member 4: Clinical Consultations & Prescriptions**:
  - `DoctorPanel.jsx` (Patient queue, active consultation room).
  - Clinical diagnosis recording, vitals input (BP, HR, Temp, SpO2), and doctor notes.
  - Multi-item treatment prescription table with dosage instructions and real-time total calculation.
  - "Complete Visit & Send to Billing" action.
* **Member 5: Billing, Insurance Claims & Management Reports**:
  - `BillingPanel.jsx` (Invoice ledger, detailed bill modal, payment input, claim status).
  - `ReportsPanel.jsx` (5 tabbed operational management reports with date pickers, branch filters, CSV export, and charts).

---

## Additional Features & Future Work

### Implemented Enhancements
- **3-Language i18n System**: English, Sinhala, and Tamil support across all navigation, buttons, headings, and dialogs with English fallback.
- **Random Temporary Passwords**: Generates temporary passwords for newly registered patients (Fix C-2).
- **Session Purge on Logout**: Clears all cached user data, tokens, and profile state from `localStorage` upon logging out (Fix H-4).
- **Sri Lankan Rupee Currency**: Standardized currency formatting (`Rs.`) across all panels.
- **Real Names in Audit Log**: Shows staff usernames and branch labels instead of generic system placeholders (Fix M-6).
- **Automated CI Workflow**: A GitHub Actions Continuous Integration (CI) workflow runs `npm ci`, `npm test`, and `npm run build` on every push and pull request. (This workflow runs tests and builds only; it does not deploy the application).
- **Full-Stack Containerization**: Docker packages the backend and frontend as separate images. The `docker-compose.full.yml` file in the backend repository runs MySQL, the backend API, and the frontend together, and initializes the database on first startup. Run `docker compose -f docker-compose.full.yml up --build` from the backend repository. The frontend repository must be in a sibling folder.
- **Cloud Hosting & Live Deployment**: The complete project is deployed and accessible online using free-tier cloud infrastructure:
  - **Frontend**: Hosted as a **Render Static Site** at [https://catms-frontend.onrender.com](https://catms-frontend.onrender.com) with global CDN delivery and automated builds from GitHub.
  - **Backend API**: Runs as a **Render Web Service** (Python / FastAPI) at [https://catms-backend.onrender.com](https://catms-backend.onrender.com).
  - **Cloud Database**: Managed **MySQL 8.0** database hosted on **Aiven**, supporting all project schemas, views, stored procedures, and triggers.

### Possible Future Improvements (Not Implemented Yet)
- **Email, SMS, and Push Notifications**: Sending automated reminders for appointment bookings and payment receipts is not implemented in the current code; all queue and appointment statuses are currently viewed directly in the application UI.
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
- **Containerization**: Docker (multi-stage build with Nginx reverse proxy)
- **Cloud Hosting**: Render (Static Site deployment with global CDN delivery)

---

## System Requirements

Before running the frontend, ensure you have:
- **Node.js**: v20+ or v22+ LTS (Node.js 22 LTS recommended)
- **npm**: v10+ (bundled with Node.js)
- **Git**
- The **CATMS-backend** service running on port `8000` (see the backend repository setup)

---

## Local Setup Without Docker

### 1. Clone the Repository
```bash
git clone https://github.com/CATMS-System/CATMS-frontend.git
cd CATMS-frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Ensure the Backend is Running
Make sure the CATMS backend is running locally at `http://localhost:8000`. The Vite development server automatically forwards all `/api` requests to it.

### 4. Start the Development Server
```bash
npm run dev
```

The application will be available at:
**[http://localhost:5173](http://localhost:5173)**

---

## Running with Docker Compose

To run the complete frontend, backend, and MySQL database together using Docker:

> **Important**: The full-stack Docker Compose file is located in the backend repository and expects both repositories to be in sibling folders:
> ```text
> your-project-folder/
>   ├── CATMS-backend/      <-- Contains docker-compose.full.yml
>   └── CATMS-frontend/     <-- Current directory
> ```

To start the full stack:
1. Navigate to the backend directory:
   ```bash
   cd ../CATMS-backend
   ```
2. Start the Compose stack:
   ```bash
   docker compose -f docker-compose.full.yml up --build
   ```
3. Open your browser and visit **[http://localhost:5173](http://localhost:5173)**.

> **Note on GitHub Codespaces**: If you test this project in GitHub Codespaces, keep in mind that Codespaces is a temporary cloud development and demo environment. It will shut down when inactive and does not provide permanent production hosting.

---

## URLs & Health Check

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Main user interface |
| **Backend API Root** | [http://localhost:8000/](http://localhost:8000/) | Backend entry point |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI documentation |
| **Backend Health Check** | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) | API and database status |

---

## Database Initialization & Seeding

The database is managed and initialized by the **CATMS-backend** service.

If you have just set up the project and need sample accounts, doctors, and clinics:
1. Make sure MySQL is running on port 3306.
2. In the backend directory, run:
   ```bash
   python sql/run_all.py
   ```
3. *(Optional)* For a realistic clinic demo dataset with 40 patients and ~780 appointments, run:
   ```bash
   python sql/seed_demo_data.py
   ```

---

## Configuration & Environment

The frontend development proxy is configured in `vite.config.js`:
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

In Docker production builds, Nginx handles reverse-proxying (`nginx.conf`):
```nginx
location /api/ {
    proxy_pass http://backend:8000/api/;
}
```

---

## Running Tests & Build Checks

### Run Automated Tests
The frontend includes a fast automated test suite covering authentication, role navigation, i18n translation lookups, date formatting, and booking wizards:
```bash
npm test
```
*Expected result: 98 tests pass with 0 failures.*

### Build for Production
To compile and optimize the production bundle:
```bash
npm run build
```
This builds production-ready files into the `dist/` directory.

### Preview Production Build Locally
To test the built production bundle locally without a full Nginx container:
```bash
npm run preview
```

---

## Project Structure Overview

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

## Troubleshooting Common Issues

- **`Network Error` or `Could not load your profile` on login**:
  Make sure the backend is running at `http://localhost:8000`. You can verify by opening `http://localhost:8000/api/v1/health` in your browser.
- **Port 5173 is already in use**:
  Another application is using port 5173. You can start the dev server on a different port:
  ```bash
  npm run dev -- --port 5174
  ```
- **Sinhala or Tamil text appears as boxes**:
  Modern operating systems (Windows 10/11, macOS, Linux) have native Sinhala and Tamil fonts pre-installed. Ensure standard system language fonts are enabled.
- **Language selection reset**:
  Your language choice is stored in browser `localStorage` under `catms_language`. If you open the app in incognito or private browsing, it defaults to English until selected.

---

## Security Notes

- **Educational & Demo Use Only**: This project and its live cloud deployment are intended strictly for academic demonstration and evaluation. Never use this system or its cloud instances to store or process real patient medical records or personal health information (PHI).
- **Demo Accounts Only**: All sample accounts and passwords are for testing and academic demonstration only.
- **No Client Secrets**: Client-side single-page applications should never contain private API keys, backend secrets, or database passwords.
- **Logout Clears Sensitive State**: Upon logging out, the application clears all stored JWT tokens and cached user data from `localStorage`.
