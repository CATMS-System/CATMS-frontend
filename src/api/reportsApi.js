import { apiErrorMessage } from './apiError.js';

const REPORTS_BASE = '/api/v1/reports';

async function handleResponse(response) {
  if (!response.ok) {
    let message = 'Request failed.';

    try {
      const error = await response.json();
      message = apiErrorMessage(error, response.status);
    } catch {
      // Response did not contain JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

function addBranchFilter(params, branchId) {
  if (branchId !== null && branchId !== undefined && branchId !== '') {
    params.set('branch_id', branchId);
  }
}

export async function getBranchDailySummary(reportDate, branchId = null) {
  const params = new URLSearchParams({
    report_date: reportDate,
  });

  addBranchFilter(params, branchId);

  const response = await fetch(
    `${REPORTS_BASE}/branch-daily-summary?${params.toString()}`
  );

  return handleResponse(response);
}

export async function getDoctorRevenue(
  startDate,
  endDate,
  branchId = null
) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  addBranchFilter(params, branchId);

  const response = await fetch(
    `${REPORTS_BASE}/doctor-revenue?${params.toString()}`
  );

  return handleResponse(response);
}

export async function getOutstandingBalances(branchId = null) {
  const params = new URLSearchParams();

  addBranchFilter(params, branchId);

  const query = params.toString();

  const response = await fetch(
    `${REPORTS_BASE}/outstanding-balances${query ? `?${query}` : ''}`
  );

  return handleResponse(response);
}

export async function getTreatmentUsage(
  startDate,
  endDate,
  branchId = null
) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  addBranchFilter(params, branchId);

  const response = await fetch(
    `${REPORTS_BASE}/treatment-usage?${params.toString()}`
  );

  return handleResponse(response);
}

export async function getInsuranceVsOutOfPocket(
  startDate,
  endDate,
  branchId = null
) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  addBranchFilter(params, branchId);

  const response = await fetch(
    `${REPORTS_BASE}/insurance-vs-out-of-pocket?${params.toString()}`
  );

  return handleResponse(response);
}