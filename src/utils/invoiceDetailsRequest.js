// Keep request ownership outside render state so stale promises cannot update the modal.
export function createInvoiceDetailsRequest(getInvoice, { setDetails, setLoading, setError }) {
  let sequence = 0;
  let currentInvoiceId = null;

  const load = async invoiceId => {
    const request = ++sequence;
    currentInvoiceId = invoiceId;
    setLoading(true);
    setError('');
    setDetails(null);
    try {
      const details = await getInvoice(invoiceId);
      if (request === sequence) setDetails(details);
    } catch (error) {
      if (request === sequence) setError(error.message || 'Failed to load invoice details.');
    } finally {
      if (request === sequence) setLoading(false);
    }
  };

  return {
    load,
    invalidate() {
      sequence++;
      currentInvoiceId = null;
    },
    refresh(invoiceId) {
      if (currentInvoiceId === invoiceId) return load(invoiceId);
    }
  };
}
