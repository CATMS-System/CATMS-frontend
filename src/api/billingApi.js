const API_BASE = '/api/v1';

async function handleResponse(response) {
  if (!response.ok) {
    let message = 'Request failed.';

    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // Response did not contain JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getInvoices() {
  const response = await fetch(`${API_BASE}/invoices`);
  return handleResponse(response);
}

export async function getInvoice(invoiceId) {
  const response = await fetch(`${API_BASE}/invoices/${invoiceId}`);
  return handleResponse(response);
}

export async function recordPayment(
  invoiceId,
  amount,
  paymentMethod,
  transactionReference
) {
  const response = await fetch(
    `${API_BASE}/invoices/${invoiceId}/payments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        payment_method: paymentMethod,
        transaction_reference: transactionReference,
      }),
    }
  );

  return handleResponse(response);
}

export async function submitInsuranceClaim(
  invoiceId,
  policyId,
  claimedAmount
) {
  const response = await fetch(
    `${API_BASE}/invoices/${invoiceId}/claims`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policy_id: policyId,
        claimed_amount: claimedAmount,
      }),
    }
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

  const response = await fetch(
    `${API_BASE}/claims/${claimId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  return handleResponse(response);
}