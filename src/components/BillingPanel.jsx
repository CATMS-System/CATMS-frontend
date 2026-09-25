import React, { useState, useMemo } from 'react';
import { DollarSign, Shield, AlertCircle, Calendar, Plus, Clock, Search, ChevronRight, CheckCircle2, Filter } from 'lucide-react';
import ReportsPanel from './ReportsPanel';

export default function BillingPanel({ subView, db, handlers }) {
  const { invoiceList, patientList, staffList, appointmentList } = db;
  const { setInvoiceList, triggerToast, addAuditLog } = handlers;

  const currentBranch = db.currentUser.branch || 'Colombo Main';

  // State filters
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');

  // Dashboard calculation
  const metrics = useMemo(() => {
    // Billed today
    const localInvoices = invoiceList.filter(i => {
      const appt = appointmentList.find(a => a.id === i.appointmentId || (a.patientId === i.patientId && a.date === i.date));
      return appt?.branch === currentBranch;
    });

    const billedToday = localInvoices.reduce((sum, inv) => sum + inv.doctorFee + inv.treatmentsSubtotal, 0);
    
    const collectedToday = localInvoices.reduce((sum, inv) => {
      if (inv.status === 'Paid') return sum + inv.patientBalance + inv.insuranceCoverage;
      if (inv.status === 'Partially Paid') return sum + (inv.patientBalance * 0.5) + inv.insuranceCoverage;
      return sum;
    }, 0);

    const outstanding = localInvoices.reduce((sum, inv) => {
      if (inv.status === 'Paid') return sum;
      if (inv.status === 'Partially Paid') return sum + (inv.patientBalance * 0.5);
      return sum + inv.patientBalance;
    }, 0);

    const pendingClaims = localInvoices.filter(i => i.claimStatus === 'PENDING').length;

    return { billedToday, collectedToday, outstanding, pendingClaims };
  }, [invoiceList, appointmentList, currentBranch]);

  // Invoice collection modal
  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.patientBalance.toString());
    setShowPaymentModal(true);
  };

  const handleProcessPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0 || amount > selectedInvoice.patientBalance) {
      alert('Please enter a valid payment amount (must be > 0 and <= balance due).');
      return;
    }

    const isFull = amount === selectedInvoice.patientBalance;
    const nextStatus = isFull ? 'Paid' : 'Partially Paid';

    const updated = invoiceList.map(inv => {
      if (inv.invoiceId === selectedInvoice.invoiceId) {
        return {
          ...inv,
          status: nextStatus,
          patientBalance: parseFloat((inv.patientBalance - amount).toFixed(2)),
          paymentMethod
        };
      }
      return inv;
    });

    setInvoiceList(updated);
    addAuditLog(
      'SECURITY',
      `Processed payment of $${amount} via ${paymentMethod} for invoice ${selectedInvoice.invoiceId}. Status: ${nextStatus}`,
      JSON.stringify(selectedInvoice),
      JSON.stringify({ ...selectedInvoice, status: nextStatus, patientBalance: selectedInvoice.patientBalance - amount, paymentMethod })
    );

    triggerToast(`Payment of $${amount} successfully processed!`);
    setShowPaymentModal(false);
    setSelectedInvoice(null);
  };

  // Claims Approval Workflow
  const handleClaimStatusChange = (invoiceId, newStatus, approvedAmount = 0) => {
    const updated = invoiceList.map(inv => {
      if (inv.invoiceId === invoiceId) {
        const coverDiff = approvedAmount - inv.insuranceCoverage;
        const nBalance = Math.max(0, inv.patientBalance - coverDiff);
        return {
          ...inv,
          claimStatus: newStatus,
          insuranceCoverage: approvedAmount,
          patientBalance: parseFloat(nBalance.toFixed(2)),
          status: nBalance === 0 ? 'Paid' : inv.status
        };
      }
      return inv;
    });

    setInvoiceList(updated);
    const target = invoiceList.find(i => i.invoiceId === invoiceId);
    addAuditLog(
      'UPDATE_CLAIM',
      `Updated insurance claim for invoice ${invoiceId} to ${newStatus} with approved coverage $${approvedAmount}`,
      JSON.stringify(target),
      JSON.stringify(updated.find(i => i.invoiceId === invoiceId))
    );

    triggerToast(`Claim for ${invoiceId} marked ${newStatus}`);
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoiceList.filter(inv => {
      const matchSearch = inv.patientName.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) || inv.invoiceId.toLowerCase().includes(invoiceSearchQuery.toLowerCase());
      const matchStatus = invoiceStatusFilter === 'All' || inv.status.toUpperCase().replace(' ', '_') === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoiceList, invoiceSearchQuery, invoiceStatusFilter]);

  const pendingClaimsList = useMemo(() => {
    return invoiceList.filter(i => i.claimStatus === 'PENDING');
  }, [invoiceList]);

  return (
    <div className="space-y-6">
      {/* 1. BILLING DASHBOARD */}
      {subView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Billing Desk Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Settle itemized invoices, review co-pay ratios, and submit insurance claims for {currentBranch}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Billed Today</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">${metrics.billedToday.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Payments Collected</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block font-mono">${metrics.collectedToday.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Outstanding Balance</span>
                <span className="text-2xl font-bold text-red-500 mt-1 block font-mono">${metrics.outstanding.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Pending Claims</span>
                <span className="text-2xl font-bold text-amber-600 mt-1 block font-mono">{metrics.pendingClaims} Claims</span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVOICE MANAGEMENT HUB */}
      {subView === 'invoices' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Billing Invoices Manager</h1>
            <p className="text-sm text-slate-500 mt-1">Review active invoices, adjust claims, and settle balances</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search invoices by ID, name, or code..."
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={invoiceSearchQuery}
                onChange={e => setInvoiceSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={invoiceStatusFilter}
              onChange={e => setInvoiceStatusFilter(e.target.value)}
            >
              <option value="All">All Invoices</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending Approval</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Invoice Details</th>
                    <th className="px-4 py-3 text-right">Outstanding ($)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.invoiceId} className={`hover:bg-slate-50/50 ${selectedInvoice?.invoiceId === inv.invoiceId ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{inv.patientName}</div>
                        <span className="text-xs text-slate-405 font-mono">{inv.invoiceId} | Date: {inv.date}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                        ${inv.patientBalance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          View Details
                        </button>
                        {inv.patientBalance > 0 && (
                          <>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="text-xs font-bold text-emerald-650 hover:text-emerald-800 cursor-pointer"
                            >
                              Collect Fee
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Itemized Detail Modal view */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs h-fit">
              {selectedInvoice ? (
                <div className="space-y-5 text-xs text-slate-650">
                  <div className="border-b border-slate-150 pb-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receipt File Context</span>
                    <h2 className="text-lg font-bold text-slate-950 font-mono mt-0.5">{selectedInvoice.invoiceId}</h2>
                    <span className="text-slate-500 font-mono">Date Issued: {selectedInvoice.date}</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>Doctor Consult Fee:</span>
                      <strong className="text-slate-800">${selectedInvoice.doctorFee.toFixed(2)}</strong>
                    </div>
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name} (x{item.qty}):</span>
                        <strong className="text-slate-800">${(item.price * item.qty).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-150 pt-3 space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span>Grand Total Gross:</span>
                      <strong>${(selectedInvoice.doctorFee + selectedInvoice.treatmentsSubtotal).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Insurance Share:</span>
                      <strong>-${selectedInvoice.insuranceCoverage.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-blue-600 font-bold text-sm border-t border-slate-150 pt-2 font-sans">
                      <span>Patient Out-of-Pocket Balance:</span>
                      <span>${selectedInvoice.patientBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-20 text-xs">
                  Select an invoice record from the grid ledger to audit billing breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. INSURANCE CLAIMS PROCESSING */}
      {subView === 'claims' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Insurance Claims Center</h1>
            <p className="text-sm text-slate-500 mt-1">Audit submitted medical insurance claims, upload coverage quotes, and adjust balances</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Claim ID & Invoice</th>
                  <th className="px-6 py-3">Patient Member</th>
                  <th className="px-6 py-3 text-right">Treatments Subtotal ($)</th>
                  <th className="px-6 py-3 text-center">Claim Status</th>
                  <th className="px-6 py-3 text-right">Adjudication Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-mono text-xs">
                {pendingClaimsList.map(claim => {
                  const total = claim.doctorFee + claim.treatmentsSubtotal;
                  return (
                    <tr key={claim.invoiceId} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 font-sans text-sm">{claim.invoiceId}</div>
                        <span className="text-[10px] text-slate-400">Date: {claim.date}</span>
                      </td>
                      <td className="px-6 py-4 font-sans font-medium text-sm">
                        {claim.patientName} ({claim.patientId})
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">${claim.treatmentsSubtotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase">
                          {claim.claimStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3 font-sans">
                        <button
                          onClick={() => handleClaimStatusChange(claim.invoiceId, 'APPROVED', claim.treatmentsSubtotal * 0.8)}
                          className="text-xs font-bold text-emerald-650 hover:text-emerald-800 cursor-pointer"
                        >
                          Approve 80% Cover
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleClaimStatusChange(claim.invoiceId, 'REJECTED', 0)}
                          className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          Reject Claim
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pendingClaimsList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-450 font-sans">
                      No pending insurance claims submissions waiting in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. FINANCIAL REPORTS */}
      {subView === 'reports' && (
        <ReportsPanel db={db} handlers={handlers} />
      )}

      {/* ==================================
          MODALS & DRAWERS (INTERACTIVE POPUPS)
          ================================== */}

      {/* PAYMENT COLLECTION MODAL */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowPaymentModal(false)} />
          <form onSubmit={handleProcessPayment} className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-md border-b border-slate-100 pb-3">Record Invoice Fee Payment</h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between font-mono">
                <span>Current Balance Due:</span>
                <strong className="text-blue-600">${selectedInvoice.patientBalance.toFixed(2)}</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash Register Deposit</option>
                  <option value="BANK_TRANSFER">Bank Direct Wire</option>
                  <option value="INSURANCE_SETTLEMENT">Insurance Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Enter Paid Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 font-sans">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
              >
                Confirm Settlement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
