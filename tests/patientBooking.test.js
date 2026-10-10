import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let PatientPanel;
let normalizeUser;
let DEMO_LOGINS;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  ({ default: PatientPanel } = await server.ssrLoadModule('/src/components/PatientPanel.jsx'));
  ({ normalizeUser, DEMO_LOGINS } = await server.ssrLoadModule('/src/contexts/AuthContext.jsx'));
});

after(async () => {
  await server?.close();
});

test('normalizeUser properly maps patient profile metadata and IDs', () => {
  const patientProfile = {
    Account_ID: 12,
    Username: 'pat_clara',
    System_Role: 'Patient',
    Patient_ID: 2,
    First_Name: 'Clara',
    Last_Name: 'Oswald',
    Email: 'clara.o@email.com'
  };

  const normalized = normalizeUser(patientProfile);
  assert.equal(normalized.Account_ID, 12);
  assert.equal(normalized.roleCode, 'ROLE_PATIENT');
  assert.equal(normalized.patient_id, 2);
  assert.equal(normalized.patientId, 'PAT-0002');
  assert.equal(normalized.name, 'Clara Oswald');
  assert.equal(normalized.email, 'clara.o@email.com');
});

test('normalizeUser properly maps doctor profile metadata and IDs', () => {
  const doctorProfile = {
    Account_ID: 4,
    Username: 'dr_perera',
    System_Role: 'Doctor',
    Staff_ID: 8,
    Doctor_ID: 8,
    Branch_ID: 3,
    First_Name: 'Nimal',
    Last_Name: 'Perera',
    Email: 'nimal@careflow.com'
  };

  const normalized = normalizeUser(doctorProfile);
  assert.equal(normalized.Account_ID, 4);
  assert.equal(normalized.roleCode, 'ROLE_DOCTOR');
  assert.equal(normalized.doctor_id, 8);
  assert.equal(normalized.staff_id, 8);
  assert.equal(normalized.Branch_ID, 3);
  assert.equal(normalized.id, 'STF-008');
  assert.equal(normalized.name, 'Nimal Perera');
});

test('DEMO_LOGINS use Password123! credentials', () => {
  for (const login of DEMO_LOGINS) {
    assert.equal(login.password, 'Password123!', `Demo login for ${login.role} should be Password123!`);
  }
});

test('PatientPanel self-booking wizard renders branches and specialty options', () => {
  const mockBranches = [
    { Branch_ID: 1, Branch_Name: 'Colombo Main Clinic' },
    { Branch_ID: 2, Branch_Name: 'Kandy Central Clinic' },
    { Branch_ID: 3, Branch_Name: 'Galle Coastal Clinic' }
  ];

  const mockStaff = [
    { id: 'STF-001', Staff_ID: 1, Branch_ID: 1, branch: 'Colombo Main Clinic', name: 'Dr. Alexander Bennett', role: 'Cardiologist', status: 'Active' },
    { id: 'STF-002', Staff_ID: 2, Branch_ID: 2, branch: 'Kandy Central Clinic', name: 'Dr. Sarah Jenkins', role: 'Senior General Practitioner', status: 'Active' },
    { id: 'STF-008', Staff_ID: 8, Branch_ID: 3, branch: 'Galle Coastal Clinic', name: 'Dr. Nimal Perera', role: 'Consultant Dermatologist', status: 'Active' }
  ];

  const db = {
    currentUser: {
      patientId: 'PAT-0001',
      patient_id: 1,
      name: 'John Doe',
      roleCode: 'ROLE_PATIENT'
    },
    appointmentList: [],
    invoiceList: [],
    patientList: [],
    staffList: mockStaff,
    medicalHistories: [],
    branches: mockBranches
  };

  const handlers = {
    setAppointmentList: () => {},
    triggerToast: () => {},
    addAuditLog: () => {},
    navigateTo: () => {}
  };

  const html = renderToStaticMarkup(
    React.createElement(PatientPanel, { subView: 'book', db, handlers })
  );

  assert.ok(html.includes('Self-Booking Consultation Wizard'));
  assert.ok(html.includes('Colombo Main Clinic'));
  assert.ok(html.includes('Kandy Central Clinic'));
  assert.ok(html.includes('Galle Coastal Clinic'));
  assert.ok(html.includes('All Specialties / Departments'));
});
