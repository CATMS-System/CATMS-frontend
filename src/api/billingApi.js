import api from './axios';
import { apiErrorMessage } from './apiError.js';

function handleAxiosError(error) {
  if (error.response) {
    const message = apiErrorMessage(error.response.data, error.response.status);
    throw new Error(message);
  }
  throw error;
}

export async function getInvoices() {
  try {
    const response = await api.get('/billing/invoices');
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getInvoice(invoiceId) {
  try {
    const response = await api.get(`/billing/invoices/${invoiceId}`);
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function recordPayment(
  invoiceId,
  amount,
  paymentMethod,
  transactionReference
) {
  try {
    const response = await api.post(`/billing/invoices/${invoiceId}/payments`, {
      amount,
      payment_method: paymentMethod,
      transaction_reference: transactionReference,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function submitInsuranceClaim(
  invoiceId,
  policyId,
  claimedAmount
) {
  try {
    const response = await api.post(`/billing/invoices/${invoiceId}/claims`, {
      policy_id: policyId,
      claimed_amount: claimedAmount,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
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

  try {
    const response = await api.patch(`/billing/claims/${claimId}/status`, body);
    return response.data;
  } catch (error) {
    handleAxiosError(error);
  }
}