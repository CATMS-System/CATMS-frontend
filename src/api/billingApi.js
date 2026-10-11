import { apiErrorMessage } from './apiError.js';

const API_BASE = '/api/v1/billing';

function getAuthHeaders(hasBody = false) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildOptions(method = 'GET', body = null) {
  const hasBody = body !== null && body !== undefined;
  const headers = getAuthHeaders(hasBody);
  const options = {};
  if (method !== 'GET') {
    options.method = method;
  }
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  if (hasBody) {
    options.body = JSON.stringify(body);
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

export async function getInvoices() {
  const options = buildOptions('GET');
  const response = await fetch(`${API_BASE}/invoices`, options);
  return handleResponse(response);
}

export async function getInvoice(invoiceId) {
  const options = buildOptions('GET');
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}`, options);
  return handleResponse(response);
}

export async function recordPayment(
  invoiceId,
  amount,
  paymentMethod,
  transactionReference
) {
  const options = buildOptions('POST', {
    amount,
    payment_method: paymentMethod,
    transaction_reference: transactionReference,
  });
  const response = await fetch(
    `${API_BASE}/invoices/${invoiceId}/payments`,
    options
  );

  return handleResponse(response);
}

export async function submitInsuranceClaim(
  invoiceId,
  policyId,
  claimedAmount
) {
  const options = buildOptions('POST', {
    policy_id: policyId,
    claimed_amount: claimedAmount,
  });
  const response = await fetch(
    `${API_BASE}/invoices/${invoiceId}/claims`,
    options
  );

  return handleResponse(response);
}

export async function updateClaimStatus(
  claimId,
  newStatus,
  approvedAmount = null
) {
  const body = {
    new_status: newStatus,
  };

  if (approvedAmount !== null) {
    body.approved_amount = approvedAmount;
  }

  const options = buildOptions('PATCH', body);
  const response = await fetch(
    `${API_BASE}/claims/${claimId}/status`,
    options
  );

  return handleResponse(response);
}