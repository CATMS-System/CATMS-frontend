import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { getCurrentReportDates } from '../src/utils/reportDates.js';
import * as reports from '../src/api/reportsApi.js';

let server;
let ReportsPanel;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  ({ default: ReportsPanel } = await server.ssrLoadModule('/src/components/ReportsPanel.jsx'));
});
after(async () => { await server?.close(); });

test('daily and monthly defaults use padded local calendar dates', () => {
  assert.deepEqual(getCurrentReportDates(new Date(2026, 8, 9, 12)), {
    reportDate: '2026-09-09', startDate: '2026-09-01', endDate: '2026-09-09'
  });
});

for (const [timezone, instant, today] of [
  ['Asia/Colombo', '2026-08-31T19:00:00Z', '2026-09-01'],
  ['America/Los_Angeles', '2027-01-01T01:00:00Z', '2026-12-31']
]) {
  test(`month boundary uses local dates in ${timezone} rather than UTC`, () => {
    const moduleUrl = new URL('../src/utils/reportDates.js', import.meta.url).href;
    const result = execFileSync(process.execPath, ['--input-type=module', '-e',
      `import { getCurrentReportDates } from ${JSON.stringify(moduleUrl)};
       console.log(JSON.stringify(getCurrentReportDates(new Date(${JSON.stringify(instant)}))));`
    ], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(result), {
      reportDate: today, startDate: `${today.slice(0, 7)}-01`, endDate: today
    });
  });
}

test('ReportsPanel initializes the daily date input from the current local date', t => {
  const RealDate = Date;
  t.mock.method(globalThis, 'Date', class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [2026, 8, 1, 0, 15])); }
  });
  const html = renderToStaticMarkup(React.createElement(ReportsPanel, {
    db: { currentUser: { roleCode: 'ROLE_ADMIN' } }
  }));
  assert.match(html, /type="date"[^>]*value="2026-09-01"/);
});

test('all dated report APIs preserve dynamic and manually selected YYYY-MM-DD dates', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => [] }));
  for (const dates of [
    getCurrentReportDates(new Date(2026, 8, 1, 0, 15)),
    { reportDate: '2025-02-28', startDate: '2025-02-03', endDate: '2025-02-27' }
  ]) {
    await reports.getBranchDailySummary(dates.reportDate);
    const daily = new URL(fetchMock.mock.calls.at(-1).arguments[0], 'http://localhost');
    assert.equal(daily.searchParams.get('report_date'), dates.reportDate);
    for (const request of [reports.getDoctorRevenue, reports.getTreatmentUsage, reports.getInsuranceVsOutOfPocket]) {
      await request(dates.startDate, dates.endDate);
      const url = new URL(fetchMock.mock.calls.at(-1).arguments[0], 'http://localhost');
      assert.equal(url.searchParams.get('start_date'), dates.startDate);
      assert.equal(url.searchParams.get('end_date'), dates.endDate);
      for (const key of ['start_date', 'end_date']) assert.match(url.searchParams.get(key), /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test('ReportsPanel renders Insurance vs. Out-of-Pocket tab for Billing_Staff and Admin', () => {
  const adminHtml = renderToStaticMarkup(React.createElement(ReportsPanel, {
    db: { currentUser: { roleCode: 'ROLE_ADMIN' } }
  }));
  assert.ok(adminHtml.includes('Insurance vs. Out-of-Pocket (REP-05)'));

  const billingHtml = renderToStaticMarkup(React.createElement(ReportsPanel, {
    db: { currentUser: { roleCode: 'ROLE_BILLING_STAFF', branch: 'Colombo Main', branch_id: 1 } }
  }));
  assert.ok(billingHtml.includes('Insurance vs. Out-of-Pocket (REP-05)'));
});
