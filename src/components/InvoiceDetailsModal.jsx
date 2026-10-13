import React, { useEffect, useRef } from 'react';

export default function InvoiceDetailsModal({ details, loading, error, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  const amount = value => `Rs. ${Number(value).toFixed(2)}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="invoice-details-title" tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Tab') {
            const controls = dialog.current.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
              event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault(); first?.focus();
            }
          }
        }}
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <h2 id="invoice-details-title" className="text-lg font-extrabold text-slate-900 tracking-tight">Invoice Details {details && `#${details.invoice.Invoice_ID}`}</h2>
          <button onClick={onClose} className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer">Close</button>
        </div>
        {loading ? <p role="status" className="text-sm text-slate-500 py-8 text-center">Loading invoice details...</p>
          : error ? <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
          : details && <>
            <p className="text-xs font-mono font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 inline-block">Date: {details.invoice.Invoice_Date} | Status: {details.invoice.Invoice_Status}</p>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Consultation</h3>
              <p className="text-sm font-medium text-slate-700">Doctor consultation fee: <span className="font-mono font-bold text-slate-900">{amount(details.invoice.Billed_Consultation_Fee)}</span></p>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Prescribed Treatments</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-sm border-collapse">
                <thead><tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                  {['Treatment ID', 'Service Code', 'Treatment', 'Quantity', 'Billed Unit Price', 'Line Total'].map(label => <th key={label} className="px-3.5 py-3">{label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {details.treatments.map((item, index) => <tr key={index} className="ds-table-row hover:bg-slate-50/80">
                    <td className="px-3.5 py-3 font-mono text-xs">{item.Treatment_ID}</td><td className="px-3.5 py-3 font-mono text-xs font-semibold text-blue-700">{item.Service_Code}</td>
                    <td className="px-3.5 py-3 font-medium text-slate-900">{item.Treatment_Name}</td><td className="px-3.5 py-3">{item.Quantity}</td>
                    <td className="px-3.5 py-3 font-mono">{amount(item.Billed_Unit_Price)}</td><td className="px-3.5 py-3 font-mono font-semibold text-slate-900">{amount(item.Line_Total)}</td>
                  </tr>)}
                  {details.treatments.length === 0 && <tr><td colSpan={6} className="px-3.5 py-6 text-center text-slate-500">No prescribed treatments.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm mb-2">Financial Summary</h3>
              {[
                ['Consultation fee', 'consultation_fee'], ['Treatment charges', 'total_treatment_charges'],
                ['Total bill', 'total_bill'], ['Insurance covered', 'insurance_covered'],
                ['Patient paid', 'patient_paid'], ['Outstanding balance', 'outstanding_balance']
              ].map(([label, field]) => <div key={field} className="flex justify-between text-sm text-slate-700 py-0.5 border-b border-slate-200/50 last:border-b-0">
                <span>{label}</span><strong className="font-mono text-slate-900">{amount(details[field])}</strong>
              </div>)}
            </div>
          </>}
      </section>
    </div>
  );
}
