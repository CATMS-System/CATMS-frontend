# CATMS Frontend Service

Web client for the Clinic Appointment and Treatment Management System (CATMS), built with React, Vite, and Tailwind CSS.

## Getting Started

### 1. Prerequisites
- Node.js 18+
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

The application will be running at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

## Component Architecture
- `src/App.jsx`: Application layout shell, header, and workspace role selector.
- `src/components/`:
  - `AdminPanel.jsx`: User account management and audit trail.
  - `ManagerPanel.jsx`: Branch oversight and staff directory.
  - `ReceptionPanel.jsx`: Patient intake, doctor scheduling, and appointment booking.
  - `DoctorPanel.jsx`: Clinical consultation notes and treatment prescribing.
  - `BillingPanel.jsx`: Invoice generation, payments, and insurance claims.
  - `PatientPanel.jsx`: Patient profile and appointment history.
  - `ReportsPanel.jsx`: 5 operational management reports with charts.