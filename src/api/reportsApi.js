import { apiErrorMessage } from './apiError.js';

const REPORTS_BASE = '/api/v1/reports';

function getAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildOptions() {
  const headers = getAuthHeaders();
  const options = {};
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  return Object.keys(options).length > 0 ? options : undefined;
}

async function handleResponse(response) {
  if (!response.ok) {
    let message = 'Request failed.';

    try {
      const error = await response.json();
      message = apiErrorMessage(error, response.status);
    } catch {
      // Response did not contain JSON.
    }

    if (response.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('catms_user');
      }
      if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
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

  const options = buildOptions();
  const response = await fetch(
    `${REPORTS_BASE}/branch-daily-summary?${params.toString()}`,
    options
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

  const options = buildOptions();
  const response = await fetch(
    `${REPORTS_BASE}/doctor-revenue?${params.toString()}`,
    options
  );

  return handleResponse(response);
}

export async function getOutstandingBalances(branchId = null) {
  const params = new URLSearchParams();

  addBranchFilter(params, branchId);

  const query = params.toString();

  const options = buildOptions();
  const response = await fetch(
    `${REPORTS_BASE}/outstanding-balances${query ? `?${query}` : ''}`,
    options
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

  const options = buildOptions();
  const response = await fetch(
    `${REPORTS_BASE}/treatment-usage?${params.toString()}`,
    options
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

  const options = buildOptions();
  const response = await fetch(
    `${REPORTS_BASE}/insurance-vs-out-of-pocket?${params.toString()}`,
    options
  );

  return handleResponse(response);
}