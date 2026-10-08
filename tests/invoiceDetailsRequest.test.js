import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { createInvoiceDetailsRequest } from '../src/utils/invoiceDetailsRequest.js';

let server;
let InvoiceDetailsModal;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ default: InvoiceDetailsModal } = await server.ssrLoadModule('/src/components/InvoiceDetailsModal.jsx'));
});
after(async () => { await server?.close(); });

function setup() {
  const pending = new Map();
  const state = { details: null, loading: false, error: '' };
  const updates = [];
  const setter = key => value => { state[key] = value; updates.push([key, value]); };
  const request = createInvoiceDetailsRequest(id => new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  }), { setDetails: setter('details'), setLoading: setter('loading'), setError: setter('error') });
  return { request, pending, state, updates };
}
const invoice = id => ({
  invoice: { Invoice_ID: id, Invoice_Date: '2026-10-08', Invoice_Status: 'Issued', Billed_Consultation_Fee: 100 },
  treatments: [], consultation_fee: 100, total_treatment_charges: 0, total_bill: 100,
  insurance_covered: 0, patient_paid: 0, outstanding_balance: 100
});

for (const order of ['A first', 'B first']) {
  test(`close A and open B: B owns details when responses resolve ${order}`, async () => {
    const { request, pending, state } = setup();
    const a = request.load(1);
    request.invalidate();
    const b = request.load(2);
    if (order === 'A first') {
      pending.get(1).resolve(invoice(1)); await a;
      assert.deepEqual(state, { details: null, loading: true, error: '' });
      pending.get(2).resolve(invoice(2)); await b;
    } else {
      pending.get(2).resolve(invoice(2)); await b;
      pending.get(1).resolve(invoice(1)); await a;
    }
    assert.deepEqual(state, { details: invoice(2), loading: false, error: '' });
    const html = renderToStaticMarkup(React.createElement(InvoiceDetailsModal, {
      details: state.details, loading: state.loading, error: state.error, onClose: () => {}
    }));
    assert.match(html, /Invoice Details #2/);
    assert.doesNotMatch(html, /Invoice Details #1|NaN/);
  });
}

test('stale error and finally cannot replace B error or stop B loading', async () => {
  const { request, pending, state } = setup();
  const a = request.load(1);
  const b = request.load(2);
  pending.get(1).reject(new Error('A failed')); await a;
  assert.deepEqual(state, { details: null, loading: true, error: '' });
  pending.get(2).reject(new Error('B failed')); await b;
  assert.deepEqual(state, { details: null, loading: false, error: 'B failed' });
});

for (const outcome of ['resolve', 'reject']) {
  test(`closing or unmounting while pending suppresses all ${outcome} updates`, async () => {
    const { request, pending, updates } = setup();
    const a = request.load(1);
    request.invalidate();
    const before = updates.length;
    pending.get(1)[outcome](outcome === 'resolve' ? invoice(1) : new Error('Late failure'));
    await a;
    assert.equal(updates.length, before);
  });
}

test('payment refresh cannot load a closed invoice or replace a different open invoice', async () => {
  const { request, pending, state, updates } = setup();
  const a = request.load(1);
  pending.get(1).resolve(invoice(1)); await a;
  request.invalidate();
  const before = updates.length;
  await request.refresh(1);
  assert.equal(updates.length, before);
  const b = request.load(2);
  await request.refresh(1);
  assert.equal(state.loading, true);
  pending.get(2).resolve(invoice(2)); await b;
  assert.deepEqual(state.details, invoice(2));
  const refresh = request.refresh(2);
  pending.get(2).resolve({ ...invoice(2), patient_paid: 100 }); await refresh;
  assert.equal(state.details.patient_paid, 100);
});

test('late A error leaves already rendered B details intact', async () => {
  const { request, pending, state, updates } = setup();
  const a = request.load(1);
  request.invalidate();
  const b = request.load(2);
  pending.get(2).resolve(invoice(2)); await b;
  const before = updates.length;
  pending.get(1).reject(new Error('A failed')); await a;
  assert.equal(updates.length, before);
  assert.deepEqual(state, { details: invoice(2), loading: false, error: '' });
});
