import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Eye
} from 'lucide-react';

import ReportsPanel from './ReportsPanel';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import { createInvoiceDetailsRequest } from '../utils/invoiceDetailsRequest';

import {
  getInvoices,
  getInvoice,
  recordPayment,
  submitInsuranceClaim,
  updateClaimStatus
} from '../api/billingApi';

export default function BillingPanel({ subView, db, handlers }) {
  const {
    invoiceList,
    appointmentList
  } = db;

  const {
    triggerToast
  } = handlers;

  const currentBranch =
    db.currentUser.branch || 'Colombo Main';

  // =========================================================
  // REAL BACKEND INVOICE DATA
  // =========================================================

  const [apiInvoices, setApiInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState('');

  const [
    selectedApiInvoice,
    setSelectedApiInvoice
  ] = useState(null);

  const [
    invoiceDetailsLoading,
    setInvoiceDetailsLoading
  ] = useState(false);

  const [
    invoiceDetailsError,
    setInvoiceDetailsError
  ] = useState('');

  // =========================================================
  // FILTER STATE
  // =========================================================

  const [
    invoiceStatusFilter,
    setInvoiceStatusFilter
  ] = useState('All');

  const [
    invoiceSearchQuery,
    setInvoiceSearchQuery
  ] = useState('');

  // =========================================================
  // PAYMENT STATE
  // =========================================================

  const [
    selectedInvoice,
    setSelectedInvoice
  ] = useState(null);

  const [
    showPaymentModal,
    setShowPaymentModal
  ] = useState(false);

  const [
    paymentAmount,
    setPaymentAmount
  ] = useState('');

  const [
    paymentMethod,
    setPaymentMethod
  ] = useState('Cash');

  const [
    transactionReference,
    setTransactionReference
  ] = useState('');

  const [
    paymentSubmitting,
    setPaymentSubmitting
  ] = useState(false);

  const [
    paymentError,
    setPaymentError
  ] = useState('');

  // =========================================================
  // CLAIM SUBMISSION STATE
  // =========================================================

  const [
    showClaimModal,
    setShowClaimModal
  ] = useState(false);

  const [
    claimInvoice,
    setClaimInvoice
  ] = useState(null);

  const [
    claimPolicyId,
    setClaimPolicyId
  ] = useState('');

  const [
    claimAmount,
    setClaimAmount
  ] = useState('');

  const [
    claimSubmitting,
    setClaimSubmitting
  ] = useState(false);

  const [
    claimError,
    setClaimError
  ] = useState('');

  const [
    submittedClaims,
    setSubmittedClaims
  ] = useState([]);

  // =========================================================
  // LOAD REAL INVOICES
  // =========================================================

  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true);
      setInvoicesError('');

      const data = await getInvoices();

      setApiInvoices(data);
    } catch (error) {
      console.error(
        'Failed to load invoices:',
        error
      );

      setInvoicesError(error.message);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // =========================================================
  // DASHBOARD CALCULATIONS (Live database + fallback)
  // =========================================================

  const metrics = useMemo(() => {
    // If real backend invoices are available, calculate live metrics from database:
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) {
      const branchId = db.currentUser?.branch_id || db.currentUser?.Branch_ID;
      // Filter by user's assigned branch if not corporate/all branches
      const relevant = branchId && db.currentUser?.roleCode !== 'ROLE_ADMIN'
        ? apiInvoices.filter(i => Number(i.Branch_ID) === Number(branchId) || !i.Branch_ID)
        : apiInvoices;

      const billedToday = relevant.reduce((sum, inv) => {
        const amt = Number(inv.Invoice_Total) || Number(inv.Billed_Consultation_Fee) || 0;
        return sum + amt;
      }, 0);

      const collectedToday = relevant.reduce((sum, inv) => {
        const paid = Number(inv.Patient_Paid) || 0;
        const ins = Number(inv.Insurance_Covered) || 0;
        if (paid > 0 || ins > 0) return sum + paid + ins;
        if (inv.Invoice_Status === 'Paid') {
          return sum + (Number(inv.Invoice_Total) || Number(inv.Billed_Consultation_Fee) || 0);
        }
        if (inv.Invoice_Status === 'Partially Paid' || inv.Invoice_Status === 'Partially_Paid') {
          return sum + ((Number(inv.Invoice_Total) || Number(inv.Billed_Consultation_Fee) || 0) * 0.5);
        }
        return sum;
      }, 0);

      const outstanding = relevant.reduce((sum, inv) => {
        if (inv.Outstanding_Balance != null) {
          return sum + Number(inv.Outstanding_Balance);
        }
        if (inv.Invoice_Status === 'Issued' || inv.Invoice_Status === 'Draft') {
          return sum + (Number(inv.Invoice_Total) || Number(inv.Billed_Consultation_Fee) || 0);
        }
        if (inv.Invoice_Status === 'Partially Paid' || inv.Invoice_Status === 'Partially_Paid') {
          return sum + ((Number(inv.Invoice_Total) || Number(inv.Billed_Consultation_Fee) || 0) * 0.5);
        }
        return sum;
      }, 0);

      const pendingClaims = relevant.filter(
        i => i.Invoice_Status === 'Issued' || i.Invoice_Status === 'Draft' || i.Invoice_Status === 'Partially Paid' || i.Invoice_Status === 'Partially_Paid'
      ).length;

      return {
        billedToday,
        collectedToday,
        outstanding,
        pendingClaims
      };
    }

    const localInvoices = invoiceList.filter(i => {
      const appt = appointmentList.find(
        a =>
          a.id === i.appointmentId ||
          (
            a.patientId === i.patientId &&
            a.date === i.date
          )
      );

      return appt?.branch === currentBranch;
    });

    const billedToday =
      localInvoices.reduce(
        (sum, inv) =>
          sum +
          inv.doctorFee +
          inv.treatmentsSubtotal,
        0
      );

    const collectedToday =
      localInvoices.reduce((sum, inv) => {
        if (inv.status === 'Paid') {
          return (
            sum +
            inv.patientBalance +
            inv.insuranceCoverage
          );
        }

        if (inv.status === 'Partially Paid') {
          return (
            sum +
            inv.patientBalance * 0.5 +
            inv.insuranceCoverage
          );
        }

        return sum;
      }, 0);

    const outstanding =
      localInvoices.reduce((sum, inv) => {
        if (inv.status === 'Paid') {
          return sum;
        }

        if (inv.status === 'Partially Paid') {
          return (
            sum +
            inv.patientBalance * 0.5
          );
        }

        return (
          sum +
          inv.patientBalance
        );
      }, 0);

    const pendingClaims =
      localInvoices.filter(
        i => i.claimStatus === 'PENDING'
      ).length;

    return {
      billedToday,
      collectedToday,
      outstanding,
      pendingClaims
    };
  }, [
    apiInvoices,
    invoiceList,
    appointmentList,
    currentBranch,
    db.currentUser
  ]);

  // =========================================================
  // REAL INVOICE FILTERING
  // =========================================================

  const [invoiceDateFilter, setInvoiceDateFilter] = useState('');
  const [invoiceBranchFilter, setInvoiceBranchFilter] = useState('');
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const invoiceBranches = useMemo(() => [...new Map(apiInvoices.map(inv =>
    [String(inv.Branch_ID), { id: inv.Branch_ID, name: inv.Branch_Name }]
  )).values()], [apiInvoices]);

  const filteredInvoices = useMemo(() => {
    return apiInvoices.filter(inv => {
      const search =
        invoiceSearchQuery
          .trim()
          .toLowerCase();

      const matchSearch =
        inv.Invoice_ID
          .toString()
          .includes(search) ||
        inv.Consultation_ID
          .toString()
          .includes(search);

      const normalizedStatus =
        inv.Invoice_Status
          .toUpperCase()
          .replaceAll(' ', '_');

      const matchStatus =
        invoiceStatusFilter === 'All' ||
        normalizedStatus === invoiceStatusFilter;

      return (
        matchSearch &&
        matchStatus &&
        (!invoiceDateFilter || inv.Invoice_Date === invoiceDateFilter) &&
        (!invoiceBranchFilter || String(inv.Branch_ID) === invoiceBranchFilter)
      );
    });
  }, [
    apiInvoices,
    invoiceSearchQuery,
    invoiceStatusFilter,
    invoiceDateFilter,
    invoiceBranchFilter
  ]);

  const dashboardInvoices = useMemo(() => {
    if (!Array.isArray(apiInvoices) || apiInvoices.length === 0) return [];
    const branchId = db.currentUser?.branch_id || db.currentUser?.Branch_ID;
    const list = branchId && db.currentUser?.roleCode !== 'ROLE_ADMIN'
      ? apiInvoices.filter(i => Number(i.Branch_ID) === Number(branchId) || !i.Branch_ID)
      : apiInvoices;
    return [...list].sort((a, b) => Number(b.Invoice_ID) - Number(a.Invoice_ID));
  }, [apiInvoices, db.currentUser]);

  // =========================================================
  // LOAD ONE REAL INVOICE
  // =========================================================

  const invoiceDetailsRequest = useRef(null);
  if (!invoiceDetailsRequest.current) {
    invoiceDetailsRequest.current = createInvoiceDetailsRequest(getInvoice, {
      setDetails: setSelectedApiInvoice,
      setLoading: setInvoiceDetailsLoading,
      setError: setInvoiceDetailsError
    });
  }

  useEffect(() => () => invoiceDetailsRequest.current.invalidate(), []);

  const handleViewInvoice = invoiceId => {
    setShowInvoiceDetails(true);
    return invoiceDetailsRequest.current.load(invoiceId);
  };

  const handleCloseInvoiceDetails = () => {
    invoiceDetailsRequest.current.invalidate();
    setShowInvoiceDetails(false);
  };

  // =========================================================
  // OPEN PAYMENT MODAL
  // =========================================================

  const handleOpenPayment = inv => {
    setSelectedInvoice(inv);

    setPaymentAmount('');
    setPaymentMethod('Cash');
    setTransactionReference('');
    setPaymentError('');

    setShowPaymentModal(true);
  };

  // =========================================================
  // RECORD REAL PAYMENT
  // =========================================================

  const handleProcessPayment = async e => {
    e.preventDefault();

    const amount =
      Number(paymentAmount);

    if (!selectedInvoice) {
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setPaymentError(
        'Payment amount must be greater than 0.'
      );

      return;
    }

    if (!transactionReference.trim()) {
      setPaymentError(
        'Transaction reference is required.'
      );

      return;
    }

    try {
      setPaymentSubmitting(true);
      setPaymentError('');

      await recordPayment(
        selectedInvoice.Invoice_ID,
        amount,
        paymentMethod,
        transactionReference.trim()
      );

      // Reload the invoice list so the updated
      // status appears immediately.
      const refreshedInvoices =
        await getInvoices();

      setApiInvoices(refreshedInvoices);

      // Refresh only if this invoice is still open in the details modal.
      await invoiceDetailsRequest.current.refresh(selectedInvoice.Invoice_ID);

      triggerToast(
        `Payment recorded successfully for Invoice #${selectedInvoice.Invoice_ID}`
      );

      setShowPaymentModal(false);
      setSelectedInvoice(null);

      setPaymentAmount('');
      setPaymentMethod('Cash');
      setTransactionReference('');
    } catch (error) {
      console.error(
        'Failed to record payment:',
        error
      );

      setPaymentError(
        error.message
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // =========================================================
  // OPEN INSURANCE CLAIM MODAL
  // =========================================================

  const handleOpenClaim = inv => {
    setClaimInvoice(inv);

    setClaimPolicyId('');
    setClaimAmount('');
    setClaimError('');

    setShowClaimModal(true);
  };

  // =========================================================
  // SUBMIT REAL INSURANCE CLAIM
  // =========================================================

  const handleSubmitClaim = async e => {
    e.preventDefault();

    const policyId =
      Number(claimPolicyId);

    const amount =
      Number(claimAmount);

    if (!claimInvoice) {
      return;
    }

    if (
      !Number.isInteger(policyId) ||
      policyId <= 0
    ) {
      setClaimError(
        'Policy ID must be a positive whole number.'
      );

      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setClaimError(
        'Claimed amount must be greater than 0.'
      );

      return;
    }

    try {
      setClaimSubmitting(true);
      setClaimError('');

      const result =
        await submitInsuranceClaim(
          claimInvoice.Invoice_ID,
          policyId,
          amount
        );

      setSubmittedClaims(previous => [
        result,
        ...previous
      ]);

      triggerToast(
        `Insurance claim submitted for Invoice #${claimInvoice.Invoice_ID}`
      );

      setShowClaimModal(false);
      setClaimInvoice(null);
      setClaimPolicyId('');
      setClaimAmount('');
    } catch (error) {
      console.error(
        'Failed to submit insurance claim:',
        error
      );

      setClaimError(
        error.message
      );
    } finally {
      setClaimSubmitting(false);
    }
  };

  // =========================================================
  // REAL CLAIM STATUS WORKFLOW
  // =========================================================
  const handleRealClaimStatusChange = async (
    claim,
    newStatus,
    approvedAmount = null
  ) => {
    try {
      const updatedClaim = await updateClaimStatus(
        claim.Claim_ID,
        newStatus,
        approvedAmount
      );

      setSubmittedClaims(previous =>
        previous.map(item =>
          item.Claim_ID === updatedClaim.Claim_ID
            ? updatedClaim
            : item
        )
      );

      triggerToast(
        `Claim #${updatedClaim.Claim_ID} updated to ${updatedClaim.Claim_Status}`
      );
    } catch (error) {
      console.error('Failed to update claim status:', error);
      triggerToast(error.message || 'Failed to update claim.');
    }
  };


  return (
    <div className="space-y-6">

      {/* =====================================================
          1. BILLING DASHBOARD
          ===================================================== */}

      {subView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Billing Desk Dashboard
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Settle itemized invoices, review co-pay ratios, and submit insurance claims for{' '}
                <span className="font-semibold text-slate-700">{currentBranch}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={loadInvoices}
              disabled={invoicesLoading}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${invoicesLoading ? 'animate-spin' : ''}`} />
              {invoicesLoading ? 'Refreshing Data...' : 'Refresh Invoices'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  Total Billed
                </span>

                <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                  Rs. {metrics.billedToday.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  Payments Collected
                </span>

                <span className="text-xl font-bold text-emerald-600 mt-1 block font-mono">
                  Rs. {metrics.collectedToday.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  Outstanding Balance
                </span>

                <span className="text-xl font-bold text-red-500 mt-1 block font-mono">
                  Rs. {metrics.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  Pending Settlements
                </span>

                <span className="text-xl font-bold text-amber-600 mt-1 block font-mono">
                  {metrics.pendingClaims}{' '}
                  Invoices
                </span>
              </div>

              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>

          </div>

          {/* =====================================================
              LIVE INVOICE QUEUE & ACTIONS TABLE
              ===================================================== */}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Live Consultation Invoices &amp; Settlement Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time consultation invoices awaiting cashier settlement or review
                </p>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                {dashboardInvoices.length} Invoices Available
              </span>
            </div>

            {invoicesLoading ? (
              <div className="p-10 text-center text-sm text-slate-400">Loading live invoices...</div>
            ) : dashboardInvoices.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400 space-y-2">
                <p>No invoices currently found for your branch.</p>
                <p className="text-xs text-slate-400">
                  Invoices appear immediately once a doctor completes a consultation with treatments.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Invoice / Patient</th>
                      <th className="px-4 py-3">Branch &amp; Date</th>
                      <th className="px-4 py-3 text-right">Total (Rs.)</th>
                      <th className="px-4 py-3 text-right">Balance Due</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650">
                    {dashboardInvoices.slice(0, 10).map(inv => {
                      const isPaid = inv.Invoice_Status === 'Paid';
                      const total = Number(inv.Invoice_Total || inv.Billed_Consultation_Fee || 0);
                      const due = inv.Outstanding_Balance != null ? Number(inv.Outstanding_Balance) : (isPaid ? 0 : total);
                      return (
                        <tr key={inv.Invoice_ID} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">
                              Invoice #{inv.Invoice_ID}
                              {inv.Patient_Name ? <span className="font-normal text-slate-600 ml-1.5">— {inv.Patient_Name}</span> : null}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              Consultation #{inv.Consultation_ID}
                              {inv.Doctor_Name ? ` | Dr. ${inv.Doctor_Name}` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-medium text-slate-700 block">{inv.Branch_Name || `Branch #${inv.Branch_ID || 1}`}</span>
                            <span className="text-slate-400">{inv.Invoice_Date}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                            Rs. {total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            {due > 0 ? (
                              <span className="text-red-600">Rs. {due.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-emerald-600">Settled (0.00)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' :
                              inv.Invoice_Status === 'Issued' ? 'bg-amber-100 text-amber-800' :
                              inv.Invoice_Status === 'Partially Paid' || inv.Invoice_Status === 'Partially_Paid' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {inv.Invoice_Status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(inv)}
                                className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-1 shadow-xs"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Settle / Pay
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(inv.Invoice_ID)}
                              className="px-2.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          2. REAL INVOICE MANAGEMENT
          ===================================================== */}

      {subView === 'invoices' && (
        <div className="space-y-6 animate-fade-in">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Billing Invoices Manager
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Review invoices stored in the CATMS billing database
              </p>
            </div>

            <button
              type="button"
              onClick={loadInvoices}
              disabled={invoicesLoading}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${invoicesLoading ? 'animate-spin' : ''}`} />
              {invoicesLoading ? 'Refreshing Data...' : 'Refresh Invoices'}
            </button>
          </div>

          {/* FILTERS */}

          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-center">

            <div className="flex-1 min-w-[200px]">

              <input
                type="text"
                placeholder="Search by invoice or consultation ID..."
                className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm"
                value={
                  invoiceSearchQuery
                }
                onChange={e =>
                  setInvoiceSearchQuery(
                    e.target.value
                  )
                }
              />

            </div>

            <select
              className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white"
              value={
                invoiceStatusFilter
              }
              onChange={e =>
                setInvoiceStatusFilter(
                  e.target.value
                )
              }
            >

              <option value="All">
                All Invoices
              </option>

              <option value="DRAFT">
                Draft
              </option>

              <option value="ISSUED">
                Issued
              </option>

              <option value="PARTIALLY_PAID">
                Partially Paid
              </option>

              <option value="PAID">
                Paid
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>

            </select>

          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs font-semibold text-slate-500">
              <span className="block mb-1">Invoice date</span>
              <input type="date" value={invoiceDateFilter} onChange={e => setInvoiceDateFilter(e.target.value)}
                className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white" />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              <span className="block mb-1">Branch</span>
              <select value={invoiceBranchFilter} onChange={e => setInvoiceBranchFilter(e.target.value)}
                className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">All branches</option>
                {invoiceBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} (#{branch.id})</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-6">

            {/* =================================================
                REAL INVOICE TABLE
                ================================================= */}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">

              <table className="w-full text-left border-collapse text-sm">

                <thead>

                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">

                    <th className="px-4 py-3">
                      Invoice Details
                    </th>

                    <th className="px-4 py-3 text-right">
                      Consultation Fee (Rs.)
                    </th>

                    <th className="px-4 py-3 text-right">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-650">

                  {/* LOADING */}

                  {invoicesLoading && (
                    <tr>

                      <td
                        colSpan="3"
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        Loading invoices...
                      </td>

                    </tr>
                  )}

                  {/* ERROR */}

                  {!invoicesLoading &&
                    invoicesError && (

                    <tr>

                      <td
                        colSpan="3"
                        className="px-4 py-10 text-center text-sm text-red-600"
                      >
                        Failed to load
                        invoices:{' '}
                        {invoicesError}
                      </td>

                    </tr>

                  )}

                  {/* EMPTY */}

                  {!invoicesLoading &&
                    !invoicesError &&
                    filteredInvoices.length === 0 && (

                    <tr>

                      <td
                        colSpan="3"
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        No invoices found.
                      </td>

                    </tr>

                  )}

                  {/* REAL INVOICE ROWS */}

                  {!invoicesLoading &&
                    !invoicesError &&
                    filteredInvoices.map(
                      inv => (

                        <tr
                          key={
                            inv.Invoice_ID
                          }
                          className={`hover:bg-slate-50/50 ${
                            selectedApiInvoice
                              ?.invoice
                              ?.Invoice_ID ===
                            inv.Invoice_ID
                              ? 'bg-blue-50/20'
                              : ''
                          }`}
                        >

                          {/* INVOICE INFORMATION */}

                          <td className="px-4 py-3">

                            <div className="font-bold text-slate-900">

                              Invoice #
                              {
                                inv.Invoice_ID
                              }
                              {inv.Patient_Name ? (
                                <span className="font-normal text-slate-600 ml-1.5">— {inv.Patient_Name}</span>
                              ) : null}

                            </div>

                            <span className="text-xs text-slate-400 font-mono">

                              Consultation #
                              {
                                inv.Consultation_ID
                              }

                              {inv.Doctor_Name ? ` | Dr. ${inv.Doctor_Name}` : ''}

                              {' | '}

                              Date:{' '}
                              {
                                inv.Invoice_Date
                              }

                              {inv.Branch_Name ? ` | ${inv.Branch_Name}` : ''}

                            </span>

                          </td>

                          {/* INVOICE TOTAL & STATUS */}

                          <td className="px-4 py-3 text-right">

                            <div className="font-mono font-bold text-slate-900">

                              Rs.{' '}

                              {Number(
                                inv.Invoice_Total || inv.Billed_Consultation_Fee || 0
                              ).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

                            </div>

                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                              {inv.Outstanding_Balance != null && Number(inv.Outstanding_Balance) > 0 ? (
                                <span className="text-[11px] font-mono text-red-600 font-semibold">
                                  Due: Rs. {Number(inv.Outstanding_Balance).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : null}

                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                inv.Invoice_Status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                                inv.Invoice_Status === 'Issued' ? 'bg-amber-100 text-amber-800' :
                                inv.Invoice_Status === 'Partially Paid' || inv.Invoice_Status === 'Partially_Paid' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {inv.Invoice_Status}
                              </span>
                            </div>

                          </td>

                          {/* ACTIONS */}

                          <td className="px-4 py-3 text-right space-x-2">

                            {/* VIEW DETAILS */}

                            <button
                              onClick={() =>
                                handleViewInvoice(
                                  inv.Invoice_ID
                                )
                              }
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              View Details
                            </button>

                            {/* SUBMIT CLAIM */}

                            <span className="text-slate-300">
                              |
                            </span>

                            <button
                              onClick={() =>
                                handleOpenClaim(
                                  inv
                                )
                              }
                              className="text-xs font-bold text-amber-600 hover:text-amber-800 cursor-pointer"
                            >
                              Submit Claim
                            </button>

                            {/* COLLECT PAYMENT */}

                            {inv.Invoice_Status !==
                              'Paid' &&
                              inv.Invoice_Status !==
                                'Cancelled' && (

                              <>
                                <span className="text-slate-300">
                                  |
                                </span>

                                <button
                                  onClick={() =>
                                    handleOpenPayment(
                                      inv
                                    )
                                  }
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                >
                                  Collect Payment
                                </button>
                              </>

                            )}

                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>


          </div>

        </div>
      )}

      {/* =====================================================
          3. INSURANCE CLAIMS CENTER
          ===================================================== */}

      {subView === 'claims' && (
        <div className="space-y-6 animate-fade-in">

          <div>

            <h1 className="text-2xl font-bold text-slate-900">

              Insurance Claims Center

            </h1>

            <p className="text-sm text-slate-500 mt-1">

              Review and manage insurance claims submitted through CATMS.

            </p>

          </div>

          {submittedClaims.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs px-6 py-10 text-center">
              <p className="text-sm text-slate-500">
                No insurance claims have been submitted during this session.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Submit a claim from the Invoices page to manage it here.
              </p>
            </div>
          )}
{/* =====================================================
    REAL CLAIMS SUBMITTED DURING THIS SESSION
    ===================================================== */}

{submittedClaims.length > 0 && (
  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">

    <div className="p-5 border-b border-slate-200">
      <h2 className="font-bold text-slate-900">
        Claims Submitted This Session
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        Insurance claims submitted through the live billing API.
      </p>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">

        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">

            <th className="px-5 py-3">
              Claim
            </th>

            <th className="px-5 py-3">
              Invoice
            </th>

            <th className="px-5 py-3">
              Policy
            </th>

            <th className="px-5 py-3 text-right">
              Claimed
            </th>

            <th className="px-5 py-3 text-right">
              Approved
            </th>

            <th className="px-5 py-3 text-center">
              Status
            </th>

            <th className="px-5 py-3 text-right">
              Action
            </th>

          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-slate-650">

          {submittedClaims.map(claim => (
            <tr
              key={claim.Claim_ID}
              className="hover:bg-slate-50/50"
            >

              {/* CLAIM ID */}
              <td className="px-5 py-4">
                <span className="font-bold text-slate-900 font-mono">
                  #{claim.Claim_ID}
                </span>
              </td>

              {/* INVOICE ID */}
              <td className="px-5 py-4">
                <span className="font-mono">
                  #{claim.Invoice_ID}
                </span>
              </td>

              {/* POLICY ID */}
              <td className="px-5 py-4">
                <span className="font-mono">
                  #{claim.Policy_ID}
                </span>
              </td>

              {/* CLAIMED AMOUNT */}
              <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                Rs.{' '}
                {Number(
                  claim.Claimed_Amount
                ).toFixed(2)}
              </td>

              {/* APPROVED AMOUNT */}
              <td className="px-5 py-4 text-right font-mono">
                Rs.{' '}
                {Number(
                  claim.Approved_Amount || 0
                ).toFixed(2)}
              </td>

              {/* STATUS */}
              <td className="px-5 py-4 text-center">

                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                    claim.Claim_Status === 'Settled'
                      ? 'bg-emerald-100 text-emerald-700'
                      : claim.Claim_Status === 'Approved'
                      ? 'bg-blue-100 text-blue-700'
                      : claim.Claim_Status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {claim.Claim_Status}
                </span>

              </td>

              {/* ACTION */}
              <td className="px-5 py-4 text-right">

                {claim.Claim_Status === 'Submitted' && (
                  <button
                    onClick={() => {
                      const approvedAmount =
                        Number(
                          claim.Claimed_Amount
                        ) * 0.8;

                      handleRealClaimStatusChange(
                        claim,
                        'Approved',
                        approvedAmount
                      );
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Approve 80%
                  </button>
                )}

                {claim.Claim_Status === 'Approved' && (
                  <button
                    onClick={() =>
                      handleRealClaimStatusChange(
                        claim,
                        'Settled'
                      )
                    }
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    Settle Claim
                  </button>
                )}

                {claim.Claim_Status === 'Settled' && (
                  <span className="text-xs font-semibold text-slate-400">
                    Complete
                  </span>
                )}

                {claim.Claim_Status === 'Rejected' && (
                  <span className="text-xs font-semibold text-red-400">
                    Rejected
                  </span>
                )}

              </td>

            </tr>
          ))}

        </tbody>

      </table>
    </div>

  </div>
)}
        </div>
      )}

      {/* =====================================================
          4. REPORTS
          ===================================================== */}

      {subView === 'reports' && (

        <ReportsPanel
          db={db}
          handlers={handlers}
        />

      )}

      {showInvoiceDetails && <InvoiceDetailsModal details={selectedApiInvoice} loading={invoiceDetailsLoading} error={invoiceDetailsError} onClose={handleCloseInvoiceDetails} />}

      {/* =====================================================
          REAL INSURANCE CLAIM SUBMISSION MODAL
          ===================================================== */}

      {showClaimModal &&
        claimInvoice && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* BACKDROP */}

          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => {

              if (!claimSubmitting) {
                setShowClaimModal(
                  false
                );
              }

            }}
          />

          {/* FORM */}

          <form
            onSubmit={
              handleSubmitClaim
            }
            className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4"
          >

            <div className="border-b border-slate-100 pb-3">

              <h3 className="font-bold text-slate-900 text-md">

                Submit Insurance Claim

              </h3>

              <p className="text-xs text-slate-500 mt-1">

                Invoice #
                {
                  claimInvoice.Invoice_ID
                }

              </p>

            </div>

            <div className="space-y-4">

              {/* POLICY ID */}

              <div>

                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">

                  Policy ID

                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  value={
                    claimPolicyId
                  }
                  onChange={e =>
                    setClaimPolicyId(
                      e.target.value
                    )
                  }
                  placeholder="Enter insurance policy ID"
                />

              </div>

              {/* CLAIM AMOUNT */}

              <div>

                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">

                  Claimed Amount (Rs.)

                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  value={
                    claimAmount
                  }
                  onChange={e =>
                    setClaimAmount(
                      e.target.value
                    )
                  }
                  placeholder="Enter claimed amount"
                />

              </div>

              {/* ERROR */}

              {claimError && (

                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">

                  {claimError}

                </div>

              )}

            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">

              <button
                type="button"
                disabled={
                  claimSubmitting
                }
                onClick={() =>
                  setShowClaimModal(
                    false
                  )
                }
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
              >

                Cancel

              </button>

              <button
                type="submit"
                disabled={
                  claimSubmitting
                }
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
              >

                {claimSubmitting
                  ? 'Submitting...'
                  : 'Submit Claim'}

              </button>

            </div>

          </form>

        </div>

      )}

      {/* =====================================================
          REAL PAYMENT MODAL
          ===================================================== */}

      {showPaymentModal &&
        selectedInvoice && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* BACKDROP */}

          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => {

              if (!paymentSubmitting) {
                setShowPaymentModal(
                  false
                );
              }

            }}
          />

          {/* FORM */}

          <form
            onSubmit={
              handleProcessPayment
            }
            className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4"
          >

            <div className="border-b border-slate-100 pb-3">

              <h3 className="font-bold text-slate-900 text-md">

                Record Payment

              </h3>

              <p className="text-xs text-slate-500 mt-1">

                Invoice #
                {
                  selectedInvoice.Invoice_ID
                }

              </p>

            </div>

            <div className="space-y-4">

              {/* PAYMENT AMOUNT */}

              <div>

                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">

                  Payment Amount (Rs.)

                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  value={
                    paymentAmount
                  }
                  onChange={e =>
                    setPaymentAmount(
                      e.target.value
                    )
                  }
                  placeholder="Enter payment amount"
                />

              </div>

              {/* PAYMENT METHOD */}

              <div>

                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">

                  Payment Method

                </label>

                <select
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 bg-white text-sm"
                  value={
                    paymentMethod
                  }
                  onChange={e =>
                    setPaymentMethod(
                      e.target.value
                    )
                  }
                >

                  <option value="Cash">
                    Cash
                  </option>

                  <option value="Credit_Card">
                    Credit Card
                  </option>

                  <option value="Debit_Card">
                    Debit Card
                  </option>

                  <option value="Bank_Transfer">
                    Bank Transfer
                  </option>

                  <option value="Online">
                    Online
                  </option>

                </select>

              </div>

              {/* TRANSACTION REFERENCE */}

              <div>

                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">

                  Transaction Reference

                </label>

                <input
                  type="text"
                  required
                  className="w-full border border-slate-350 rounded-lg px-3 py-2 text-sm font-mono"
                  value={
                    transactionReference
                  }
                  onChange={e =>
                    setTransactionReference(
                      e.target.value
                    )
                  }
                  placeholder="e.g. PAY-TEST-001"
                />

              </div>

              {/* PAYMENT ERROR */}

              {paymentError && (

                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">

                  {paymentError}

                </div>

              )}

            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">

              <button
                type="button"
                disabled={
                  paymentSubmitting
                }
                onClick={() =>
                  setShowPaymentModal(
                    false
                  )
                }
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
              >

                Cancel

              </button>

              <button
                type="submit"
                disabled={
                  paymentSubmitting
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50"
              >

                {paymentSubmitting
                  ? 'Recording...'
                  : 'Record Payment'}

              </button>

            </div>

          </form>

        </div>

      )}

    </div>
  );
}