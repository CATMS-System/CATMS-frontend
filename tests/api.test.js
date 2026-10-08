import assert from 'node:assert/strict';
import test from 'node:test';
import * as billing from '../src/api/billingApi.js';
import * as reports from '../src/api/reportsApi.js';

const requests = [
  { name: 'invoice listing', call: () => billing.getInvoices(), url: '/api/v1/billing/invoices' },
  { name: 'invoice details', call: () => billing.getInvoice(7), url: '/api/v1/billing/invoices/7' },
  {
    name: 'payment recording', call: () => billing.recordPayment(7, '100.00', 'Cash', 'REF-7'),
    url: '/api/v1/billing/invoices/7/payments', method: 'POST',
    body: { amount: '100.00', payment_method: 'Cash', transaction_reference: 'REF-7' },
  },
  {
    name: 'claim creation', call: () => billing.submitInsuranceClaim(7, 3, '200.00'),
    url: '/api/v1/billing/invoices/7/claims', method: 'POST',
    body: { policy_id: 3, claimed_amount: '200.00' },
  },
  {
    name: 'claim approval', call: () => billing.updateClaimStatus(9, 'Approved', '150.00'),
    url: '/api/v1/billing/claims/9/status', method: 'PATCH',
    body: { new_status: 'Approved', approved_amount: '150.00' },
  },
  {
    name: 'claim review without approval amount', call: () => billing.updateClaimStatus(9, 'Under_Review'),
    url: '/api/v1/billing/claims/9/status', method: 'PATCH', body: { new_status: 'Under_Review' },
  },
  {
    name: 'branch daily report', call: () => reports.getBranchDailySummary('2026-10-08', 5),
    url: '/api/v1/reports/branch-daily-summary?report_date=2026-10-08&branch_id=5',
  },
  {
    name: 'doctor revenue report', call: () => reports.getDoctorRevenue('2026-10-01', '2026-10-08', 5),
    url: '/api/v1/reports/doctor-revenue?start_date=2026-10-01&end_date=2026-10-08&branch_id=5',
  },
  {
    name: 'outstanding balances report', call: () => reports.getOutstandingBalances(5),
    url: '/api/v1/reports/outstanding-balances?branch_id=5',
  },
  {
    name: 'treatment usage report', call: () => reports.getTreatmentUsage('2026-10-01', '2026-10-08', 5),
    url: '/api/v1/reports/treatment-usage?start_date=2026-10-01&end_date=2026-10-08&branch_id=5',
  },
  {
    name: 'insurance report', call: () => reports.getInsuranceVsOutOfPocket('2026-10-01', '2026-10-08', 5),
    url: '/api/v1/reports/insurance-vs-out-of-pocket?start_date=2026-10-01&end_date=2026-10-08&branch_id=5',
  },
  {
    name: 'report without branch filter', call: () => reports.getOutstandingBalances(),
    url: '/api/v1/reports/outstanding-balances',
  },
];

for (const request of requests) {
  test(`${request.name} uses the registered API path and preserves the request`, async (t) => {
    const result = { preserved: true };
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => result }));
    assert.deepEqual(await request.call(), result);
    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, options] = fetchMock.mock.calls[0].arguments;
    assert.equal(url, request.url);
    if (request.method) {
      assert.equal(options.method, request.method);
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json' });
      assert.deepEqual(JSON.parse(options.body), request.body);
    } else {
      assert.equal(options, undefined);
    }
  });
}

for (const [name, call] of [['billing', () => billing.getInvoices()], ['reports', () => reports.getOutstandingBalances()]]) {
  test(`${name} preserves backend error details`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: false, json: async () => ({ detail: 'Controlled error' }) }));
    await assert.rejects(call, /Controlled error/);
  });
}

for (const [name, call] of [['billing', () => billing.getInvoices()], ['reports', () => reports.getOutstandingBalances()]]) {
  const cases = [
    {
      label: 'validation array', status: 422,
      payload: { detail: [
        { loc: ['body', 'amount'], msg: 'Input should be greater than 0', input: 'SECRET', ctx: { debug: 'SECRET' } },
        { loc: ['query', 'branch_id'], msg: 'Input should be a valid integer' },
        { loc: ['body', 'items', 0, 'id'], msg: 'Field required' }
      ] },
      expected: 'body.amount: Input should be greater than 0; query.branch_id: Input should be a valid integer; body.items.0.id: Field required'
    },
    { label: 'string detail', status: 400, payload: { detail: '  Invoice not found.  ' }, expected: 'Invoice not found.' },
    { label: 'missing detail', status: 400, payload: { debug: 'SECRET' }, expected: 'Request failed.' },
    { label: 'null response', status: 400, payload: null, expected: 'Request failed.' },
    { label: 'unexpected detail object', status: 400, payload: { detail: { trace: 'SECRET' } }, expected: 'Request failed.' },
    { label: 'empty validation array', status: 422, payload: { detail: [] }, expected: 'Request failed.' },
    { label: 'malformed validation entries', status: 422, payload: { detail: [null, 'SECRET', {}, { msg: 42 }] }, expected: 'Request failed.' },
    { label: 'missing location', status: 422, payload: { detail: [{ msg: 'Invalid value' }] }, expected: 'Invalid value' },
    { label: 'blank detail', status: 400, payload: { detail: '  ' }, expected: 'Request failed.' },
    { label: 'internal server diagnostics', status: 500, payload: { detail: 'SQL traceback SECRET' }, expected: 'Request failed.' },
    { label: 'non-JSON response', status: 502, nonJson: true, expected: 'Request failed.' }
  ];
  for (const scenario of cases) {
    test(`${name} normalizes ${scenario.label} safely`, async t => {
      t.mock.method(globalThis, 'fetch', async () => ({
        ok: false, status: scenario.status,
        json: async () => { if (scenario.nonJson) throw new SyntaxError('SECRET'); return scenario.payload; }
      }));
      await assert.rejects(call, error => {
        assert.equal(error.message, scenario.expected);
        assert.ok(!error.message.includes('SECRET'));
        return true;
      });
    });
  }
}
