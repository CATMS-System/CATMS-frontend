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




