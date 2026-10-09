import api from './axios';
import { apiErrorMessage } from './apiError.js';

function handleAxiosError(error) {
  if (error.response) {
    const message = apiErrorMessage(error.response.data, error.response.status);
    throw new Error(message);
  }
  throw error;
}

function addBranchFilter(params, branchId) {
  if (branchId !== null && branchId !== undefined && branchId !== '') {
    params.branch_id = branchId;
  }
}

export async function getBranchDailySummary(reportDate, branchId = null) {
  const params = {
    report_date: reportDate,
  };
  addBranchFilter(params, branchId);

  try {
    const response = await api.get('/reports/branch-daily-summary', { params });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getDoctorRevenue(
  startDate,
  endDate,
  branchId = null
) {
  const params = {
    start_date: startDate,
    end_date: endDate,
  };
  addBranchFilter(params, branchId);

  try {
    const response = await api.get('/reports/doctor-revenue', { params });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getOutstandingBalances(branchId = null) {
  const params = {};
  addBranchFilter(params, branchId);

  try {
    const response = await api.get('/reports/outstanding-balances', { params });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getTreatmentUsage(
  startDate,
  endDate,
  branchId = null
) {
  const params = {
    start_date: startDate,
    end_date: endDate,
  };
  addBranchFilter(params, branchId);

  try {
    const response = await api.get('/reports/treatment-usage', { params });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getInsuranceVsOutOfPocket(
  startDate,
  endDate,
  branchId = null
) {
  const params = {
    start_date: startDate,
    end_date: endDate,
  };
  addBranchFilter(params, branchId);

  try {
    const response = await api.get('/reports/insurance-vs-out-of-pocket', { params });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}