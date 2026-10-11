import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { getFrontendRoleCode } from '../src/utils/authRole.js';
import api from '../src/api/axios.js';
import { request } from '../src/services/api.js';

let server;
let App;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  ({ default: App } = await server.ssrLoadModule('/src/App.jsx'));
});
after(async () => { await server?.close(); });

for (const [backend, frontend] of Object.entries({
  Admin: 'ROLE_ADMIN', Doctor: 'ROLE_DOCTOR', Receptionist: 'ROLE_RECEPTIONIST',
  Nurse: 'ROLE_NURSE', Billing_Staff: 'ROLE_BILLING_STAFF', Branch_Manager: 'ROLE_BRANCH_MANAGER',
  Patient: 'ROLE_PATIENT'
})) {
  test(`profile role ${backend} maps to ${frontend}`, () => assert.equal(getFrontendRoleCode(backend), frontend));
}
test('unknown profile roles retain the existing fallback', () => {
  assert.equal(getFrontendRoleCode('Unknown'), 'ROLE_RECEPTIONIST');
});

function browser(t, user, pathname) {
  const storage = new Map([['token', 'TEST_TOKEN'], ['catms_user', JSON.stringify(user)]]);
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    for (const [key, descriptor] of [['localStorage', previousStorage], ['window', previousWindow]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  };
  globalThis.window = { location: { pathname, href: pathname } };
  return storage;
}

for (const [backend, path, label] of [
  ['Billing_Staff', '/billing/reports', 'Billing Desk'],
  ['Branch_Manager', '/manager/reports', 'Branch Reports'],
  ['Admin', '/admin/reports', 'Reports Suite'],
  ['Doctor', '/doctor/workbench', 'Clinician Triage Workbench'],
  ['Receptionist', '/reception/dashboard', 'Reception'],
  ['Nurse', '/nurse/dashboard', 'NURSE']
]) {
  test(`${backend} workspace renders without changing existing role navigation`, t => {
    browser(t, { name: 'Test User', email: 'test@example.invalid', roleCode: getFrontendRoleCode(backend), branch: 'Colombo Main' }, path);
    const html = renderToStaticMarkup(React.createElement(App));
    assert.ok(html.includes(label), `Missing ${label}`);
    if (['Billing_Staff', 'Branch_Manager', 'Admin'].includes(backend)) assert.ok(html.includes('Operational &amp; Management Reports Suite'));
  });
}

test('existing Axios client sends bearer token and clears session on 401', async t => {
  const storage = browser(t, { name: 'Test User' }, '/billing/invoices');
  const previous = api.defaults.adapter;
  t.after(() => { api.defaults.adapter = previous; });
  api.defaults.adapter = async config => {
    assert.equal(config.headers.Authorization, 'Bearer TEST_TOKEN');
    assert.equal(config.baseURL, '/api/v1');
    throw Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
  };
  await assert.rejects(() => api.get('/auth/me'), /Unauthorized/);
  assert.equal(storage.has('token'), false);
  assert.equal(storage.has('catms_user'), false);
  assert.equal(window.location.href, '/login');
});

test('existing fetch client retains authenticated paths and readable validation fields', async t => {
  browser(t, { name: 'Test User' }, '/reception/patients');
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/v1/patients');
    assert.equal(options.headers.Authorization, 'Bearer TEST_TOKEN');
    return { ok: false, status: 422, text: async () => JSON.stringify({ detail: [{ loc: ['body', 'name'], msg: 'Field required' }] }) };
  });
  await assert.rejects(() => request('POST', '/patients', {}), error => {
    assert.equal(error.status, 422);
    assert.equal(error.fieldErrors.name, 'Field required');
    return true;
  });
});

test('route guard denies Doctor access to Admin workspace', t => {
  browser(t, { name: 'Test Doc', email: 'doc@example.invalid', roleCode: 'ROLE_DOCTOR', branch: 'Colombo Main' }, '/admin/dashboard');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Access Denied'));
});

test('route guard denies Receptionist access to Billing workspace', t => {
  browser(t, { name: 'Test Recept', email: 'recept@example.invalid', roleCode: 'ROLE_RECEPTIONIST', branch: 'Colombo Main' }, '/billing/invoices');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Access Denied'));
});

test('route guard denies Patient access to Doctor workbench', t => {
  browser(t, { name: 'Test Patient', email: 'pat@example.invalid', roleCode: 'ROLE_PATIENT', branch: 'Colombo Main' }, '/doctor/workbench');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Access Denied'));
});

test('Doctor workspace renders upcoming appointments view', t => {
  browser(t, { name: 'Dr. Test Doc', email: 'doc@example.invalid', roleCode: 'ROLE_DOCTOR', branch: 'Colombo Main' }, '/doctor/appointments');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Clinician Triage Workbench'));
  assert.ok(html.includes('Upcoming Appointments'));
  assert.ok(html.includes('Upcoming Bookings'));
});

test('route guard denies Patient access to Doctor appointments', t => {
  browser(t, { name: 'Test Patient', email: 'pat@example.invalid', roleCode: 'ROLE_PATIENT', branch: 'Colombo Main' }, '/doctor/appointments');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Access Denied'));
});

test('App shell renders Change Password button for authenticated user', t => {
  browser(t, { name: 'Test User', email: 'test@example.invalid', roleCode: 'ROLE_ADMIN', branch: 'Colombo Main' }, '/admin/dashboard');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('title="Change Password"'), 'Missing Change Password button in header');
});

test('changePassword service dispatches POST to /auth/change-password', async t => {
  const { changePassword } = await server.ssrLoadModule('/src/services/authService.js');
  let calledUrl = null;
  let calledOptions = null;
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options) => {
    calledUrl = url;
    calledOptions = options;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ message: 'Password changed successfully' })
    };
  };

  const res = await changePassword('CurrentPass123!', 'NewPass456!');
  assert.equal(calledUrl, '/api/v1/auth/change-password');
  assert.equal(calledOptions.method, 'POST');
  const body = JSON.parse(calledOptions.body);
  assert.equal(body.current_password, 'CurrentPass123!');
  assert.equal(body.new_password, 'NewPass456!');
  assert.equal(res.message, 'Password changed successfully');
});

test('Branch_Manager reports panel renders locked branch scope', t => {
  browser(t, {
    name: 'Marcus Vance',
    email: 'vance@careflow.com',
    roleCode: 'ROLE_BRANCH_MANAGER',
    branch: 'Colombo Main',
    branch_id: 1,
    Branch_ID: 1
  }, '/manager/reports');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Branch Scope (Locked)'));
  assert.ok(html.includes('Scoped'));
  assert.ok(html.includes('Branch 1 - Colombo Main'));
  assert.ok(!html.includes('REP-05'));
});

test('Branch_Manager in Kandy locks to Branch 2', t => {
  browser(t, {
    name: 'Samantha Silva',
    email: 'silva@careflow.com',
    roleCode: 'ROLE_BRANCH_MANAGER',
    branch: 'Kandy',
    branch_id: 2,
    Branch_ID: 2
  }, '/manager/reports');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Branch Scope (Locked)'));
  assert.ok(html.includes('Branch 2 - Kandy'));
  assert.ok(!html.includes('REP-05'));
});

test('Admin reports panel renders flexible branch filter', t => {
  browser(t, {
    name: 'System Admin',
    email: 'admin@careflow.com',
    roleCode: 'ROLE_ADMIN',
    branch: 'Colombo Main'
  }, '/admin/reports');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Branch ID (optional)'));
});

test('Billing_Staff in Galle locks reports to Branch 3 with Scoped badge', t => {
  browser(t, {
    name: 'Nirosha Silva',
    email: 'billing_galle',
    roleCode: 'ROLE_BILLING_STAFF',
    branch: 'Galle',
    branch_id: 3,
    Branch_ID: 3
  }, '/billing/reports');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Branch Scope (Locked)'));
  assert.ok(html.includes('Branch 3 - Galle'));
  assert.ok(html.includes('Scoped'));
});

test('Billing_Staff in Galle locks invoices to Branch 3 with Scoped badge', t => {
  browser(t, {
    name: 'Nirosha Silva',
    email: 'billing_galle',
    roleCode: 'ROLE_BILLING_STAFF',
    branch: 'Galle',
    branch_id: 3,
    Branch_ID: 3
  }, '/billing/invoices');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Galle (#3)'));
  assert.ok(html.includes('Scoped'));
});

test('Doctor workbench renders live queue with Completed filter and badge support', t => {
  browser(t, {
    name: 'Dr. Alexander Bennett',
    email: 'bennett@careflow.com',
    roleCode: 'ROLE_DOCTOR',
    branch: 'Colombo Main',
    branch_id: 1,
    doctor_id: 1
  }, '/doctor/workbench');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Clinician Triage Workbench'));
  assert.ok(html.includes('Completed ('));
  assert.ok(html.includes('Waiting ('));
});

test('getDailyQueue service dispatches include_completed param when requested', async t => {
  const previousFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = previousFetch; });

  let calledUrl = '';
  globalThis.fetch = async (url) => {
    calledUrl = String(url);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify([]),
      json: async () => []
    };
  };

  const { getDailyQueue } = await server.ssrLoadModule('/src/services/appointmentService.ts');
  await getDailyQueue(1, '2026-10-10', true);
  assert.ok(calledUrl.includes('include_completed=true'));
});

test('Doctor consultation room renders active Complete Visit & Send to Billing button for scheduled visit', t => {
  browser(t, {
    name: 'Dr. Alexander Bennett',
    email: 'bennett@careflow.com',
    roleCode: 'ROLE_DOCTOR',
    branch: 'Colombo Main',
    branch_id: 1,
    doctor_id: 1
  }, '/doctor/consultation/8');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Clinical Diagnosis'));
  assert.ok(html.includes('Complete Visit &amp; Send to Billing') || html.includes('Complete Visit & Send to Billing'));
});

test('Doctor consultation room renders completed banner and badge for completed visit', t => {
  browser(t, {
    name: 'Dr. Alexander Bennett',
    email: 'bennett@careflow.com',
    roleCode: 'ROLE_DOCTOR',
    branch: 'Colombo Main',
    branch_id: 1,
    doctor_id: 1
  }, '/doctor/consultation/APP-1001');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Consultation Already Completed'));
  assert.ok(html.includes('Consultation Completed'));
  assert.ok(html.includes('Return to Queue'));
});

test('Doctor queue resolves backend status, displays Completed tag and View Completed button, avoiding stale Resume Console', async t => {
  const { default: DoctorPanel } = await server.ssrLoadModule('/src/components/DoctorPanel.jsx');
  const db = {
    currentUser: { id: 'STF-001', doctor_id: 1, name: 'Dr. Alexander Bennett', branch_id: 1 },
    appointmentList: [
      { Appointment_ID: 1, id: 1, Status: 'Completed', status: 'Completed', Patient_ID: 1, Patient_Name: 'John Doe' },
      { Appointment_ID: 2, id: 2, Status: 'Confirmed', status: 'Confirmed', Patient_ID: 2, Patient_Name: 'Clara Oswald' }
    ],
    liveQueue: [
      { queueNo: 1, appointmentId: 1, Appointment_ID: 1, patientId: 'PAT-0001', patientName: 'John Doe', status: 'IN_PROGRESS', reason: 'Checkup' },
      { queueNo: 2, appointmentId: 2, Appointment_ID: 2, patientId: 'PAT-0002', patientName: 'Clara Oswald', status: 'WAITING', reason: 'Throat ache' }
    ]
  };

  const html = renderToStaticMarkup(React.createElement(DoctorPanel, {
    subView: 'workbench',
    db,
    handlers: { navigateTo: () => {} }
  }));

  // Confirm Completed status is resolved and rendered
  assert.ok(html.includes('View Completed'), 'Completed appointment should render View Completed button');
  assert.ok(html.includes('Completed (1)'), 'Queue completed count should reflect 1 completed item');
  assert.ok(html.includes('Waiting (1)'), 'Queue waiting count should exclude completed item');
  assert.ok(html.includes('Call Patient'), 'Active waiting appointment should render Call Patient button');
  // Confirm stale Resume Console button is NOT rendered for the completed appointment
  assert.ok(!html.includes('Resume Console'), 'Completed appointment must never render Resume Console button');
});

test('Branch Manager local staff directory renders Add Staff Member button and locked branch drawer pattern', async t => {
  browser(t, {
    name: 'Marcus Vance',
    email: 'mgr_vance@careflow.com',
    roleCode: 'ROLE_BRANCH_MANAGER',
    branch: 'Colombo Main',
    branch_id: 1
  }, '/manager/staff');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Local Staff Directory'));
  assert.ok(html.includes('Add Staff Member'));

  const { default: AddStaffDrawer } = await server.ssrLoadModule('/src/components/AddStaffDrawer.jsx');
  const drawerHtml = renderToStaticMarkup(React.createElement(AddStaffDrawer, {
    isOpen: true,
    initialStep: 2,
    lockedBranch: 'Colombo Main',
    branches: [{ Branch_ID: 1, Branch_Name: 'Colombo Main' }]
  }));
  assert.ok(drawerHtml.includes('Add New Staff Member'));
  assert.ok(drawerHtml.includes('Branch: <strong>Colombo Main</strong> [Locked]'));
});

test('Admin staff directory renders Add Staff Member button and flexible branch options in drawer', async t => {
  browser(t, {
    name: 'System Admin',
    email: 'admin@careflow.com',
    roleCode: 'ROLE_ADMIN',
    branch: 'Colombo Main'
  }, '/admin/staff');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Staff Directory'));
  assert.ok(html.includes('Add Staff Member'));

  const { default: AddStaffDrawer } = await server.ssrLoadModule('/src/components/AddStaffDrawer.jsx');
  const drawerHtml = renderToStaticMarkup(React.createElement(AddStaffDrawer, {
    isOpen: true,
    initialStep: 2,
    lockedBranch: null,
    branches: [{ Branch_ID: 1, Branch_Name: 'Colombo Main' }, { Branch_ID: 2, Branch_Name: 'Kandy' }]
  }));
  assert.ok(drawerHtml.includes('value="Colombo Main"'));
  assert.ok(drawerHtml.includes('value="Kandy"'));
});

test('Admin Executive Dashboard renders Revenue Collected and Outstanding Balance stat cards', async t => {
  browser(t, {
    name: 'System Admin',
    email: 'admin@careflow.com',
    roleCode: 'ROLE_ADMIN',
    branch: 'Colombo Main'
  }, '/admin/dashboard');
  const html = renderToStaticMarkup(React.createElement(App));
  assert.ok(html.includes('Executive Administration Dashboard'));
  assert.ok(html.includes('Revenue Collected'));
  assert.ok(html.includes('Outstanding Balance'));
  assert.ok(html.includes('Total Patients'));
  assert.ok(html.includes('Active Doctors'));
  assert.ok(html.includes('Appointments Today'));
  assert.ok(html.includes('Branch Scope:'));
  assert.ok(html.includes('id="admin-branch-select"'));
});

test('Admin Executive Dashboard branch selector filters stat cards by branch', async t => {
  const { default: AdminPanel } = await server.ssrLoadModule('/src/components/AdminPanel.jsx');

  const mockDb = {
    staffList: [
      { id: 'STF-1', name: 'Dr. Bennett', isDoctor: true, status: 'Active', Branch_ID: 1, branch: 'Colombo Main' },
      { id: 'STF-2', name: 'Dr. Jenkins', isDoctor: true, status: 'Active', Branch_ID: 2, branch: 'Kandy' },
      { id: 'STF-3', name: 'Dr. Perera', isDoctor: true, status: 'Active', Branch_ID: 3, branch: 'Galle' },
      { id: 'STF-4', name: 'Marcus Vance', isDoctor: false, status: 'Active', Branch_ID: 1, branch: 'Colombo Main' }
    ],
    patientList: [
      { patient_id: 1, first_name: 'John', last_name: 'Doe' },
      { patient_id: 2, first_name: 'Jane', last_name: 'Smith' },
      { patient_id: 3, first_name: 'Kamal', last_name: 'Perera' },
      { patient_id: 4, first_name: 'Sunil', last_name: 'Silva' },
      { patient_id: 5, first_name: 'Nimal', last_name: 'Fernando' }
    ],
    totalPatients: 5,
    appointmentList: [
      { Appointment_ID: 1, Patient_ID: 1, Branch_ID: 1, branch: 'Colombo Main', Appointment_Date: new Date().toISOString().slice(0, 10), date: new Date().toISOString().slice(0, 10), status: 'Scheduled' },
      { Appointment_ID: 2, Patient_ID: 2, Branch_ID: 1, branch: 'Colombo Main', Appointment_Date: '2026-01-01', date: '2026-01-01', status: 'Completed' },
      { Appointment_ID: 3, Patient_ID: 3, Branch_ID: 2, branch: 'Kandy', Appointment_Date: '2026-01-01', date: '2026-01-01', status: 'Completed' },
      { Appointment_ID: 4, Patient_ID: 4, Branch_ID: 2, branch: 'Kandy', Appointment_Date: '2026-01-01', date: '2026-01-01', status: 'Completed' },
      { Appointment_ID: 5, Patient_ID: 5, Branch_ID: 3, branch: 'Galle', Appointment_Date: '2026-01-01', date: '2026-01-01', status: 'Completed' }
    ],
    invoiceList: [
      { Invoice_ID: 1, Branch_ID: 1, branch: 'Colombo Main', Patient_ID: 1, Patient_Paid: 5000, Insurance_Covered: 6000, Outstanding_Balance: 12500, Invoice_Total: 23500, Invoice_Status: 'Partially_Paid' },
      { Invoice_ID: 2, Branch_ID: 1, branch: 'Colombo Main', Patient_ID: 2, Patient_Paid: 0, Insurance_Covered: 0, Outstanding_Balance: 10000, Invoice_Total: 10000, Invoice_Status: 'Issued' },
      { Invoice_ID: 3, Branch_ID: 2, branch: 'Kandy', Patient_ID: 3, Patient_Paid: 5900, Insurance_Covered: 0, Outstanding_Balance: 1350, Invoice_Total: 7250, Invoice_Status: 'Partially_Paid' },
      { Invoice_ID: 4, Branch_ID: 3, branch: 'Galle', Patient_ID: 5, Patient_Paid: 3800, Insurance_Covered: 0, Outstanding_Balance: 0, Invoice_Total: 3800, Invoice_Status: 'Paid' }
    ],
    auditLogs: [],
    branches: [
      { Branch_ID: 1, Branch_Name: 'Colombo Main', name: 'Colombo Main' },
      { Branch_ID: 2, Branch_Name: 'Kandy', name: 'Kandy' },
      { Branch_ID: 3, Branch_Name: 'Galle', name: 'Galle' }
    ]
  };

  const handlers = {
    setStaffList: () => {},
    setBranches: () => {},
    setAuditLogs: () => {},
    addAuditLog: () => {},
    triggerToast: () => {},
    navigateTo: () => {},
    setSelectedBranch: () => {}
  };

  // 1. All Branches (unfiltered)
  const allHtml = renderToStaticMarkup(React.createElement(AdminPanel, {
    subView: 'dashboard',
    db: { ...mockDb, selectedBranch: 'All Branches' },
    handlers
  }));
  assert.ok(allHtml.includes('Rs. 20,700.00'));
  assert.ok(allHtml.includes('Rs. 23,850.00'));
  assert.ok(allHtml.includes('>5<')); // total patients
  assert.ok(allHtml.includes('>3<')); // active doctors
  assert.ok(allHtml.includes('>1<')); // appointments today

  // 2. Colombo Main (Branch 1)
  const colomboHtml = renderToStaticMarkup(React.createElement(AdminPanel, {
    subView: 'dashboard',
    db: { ...mockDb, selectedBranch: 'Colombo Main' },
    handlers
  }));
  assert.ok(colomboHtml.includes('Rs. 11,000.00'));
  assert.ok(colomboHtml.includes('Rs. 22,500.00'));
  assert.ok(colomboHtml.includes('>2<')); // 2 distinct patients (Patient 1, Patient 2)
  assert.ok(colomboHtml.includes('>1<')); // 1 active doctor in Colombo
  assert.ok(colomboHtml.includes('>1<')); // 1 appointment today in Colombo

  // 3. Kandy (Branch 2)
  const kandyHtml = renderToStaticMarkup(React.createElement(AdminPanel, {
    subView: 'dashboard',
    db: { ...mockDb, selectedBranch: 'Kandy' },
    handlers
  }));
  assert.ok(kandyHtml.includes('Rs. 5,900.00'));
  assert.ok(kandyHtml.includes('Rs. 1,350.00'));
  assert.ok(kandyHtml.includes('>2<')); // 2 distinct patients (Patient 3, Patient 4)
  assert.ok(kandyHtml.includes('>1<')); // 1 active doctor in Kandy
  assert.ok(kandyHtml.includes('>0<')); // 0 appointments today in Kandy

  // 4. Galle (Branch 3)
  const galleHtml = renderToStaticMarkup(React.createElement(AdminPanel, {
    subView: 'dashboard',
    db: { ...mockDb, selectedBranch: 'Galle' },
    handlers
  }));
  assert.ok(galleHtml.includes('Rs. 3,800.00'));
  assert.ok(galleHtml.includes('Rs. 0.00'));
  assert.ok(galleHtml.includes('>1<')); // 1 distinct patient in Galle
  assert.ok(galleHtml.includes('>1<')); // 1 active doctor in Galle
  assert.ok(galleHtml.includes('>0<')); // 0 appointments today in Galle
});


