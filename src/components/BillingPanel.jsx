import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Eye,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

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
import { useLanguage } from '../contexts/LanguageContext';
import { PageTransition } from './ui';
import { MOTION_VARIANTS, ensureMotionSafeEnv } from '../theme/designSystem';

export default function BillingPanel({ subView, db, handlers }) {
  ensureMotionSafeEnv();
  const { t } = useLanguage();
  const {
    invoiceList,
    appointmentList
  } = db;

  const {
    triggerToast
  } = handlers;

  const currentBranch =
    db?.currentUser?.branch || 'Colombo Main';
  const currentBranchId =
    db?.currentUser?.branch_id || db?.currentUser?.Branch_ID || 1;

  const userRole = db?.currentUser?.roleCode ||
    (db?.currentUser?.System_Role === 'Admin' || db?.currentUser?.role === 'Admin' ? 'ROLE_ADMIN' :
     db?.currentUser?.System_Role === 'Billing_Staff' || db?.currentUser?.role === 'Billing Staff' ? 'ROLE_BILLING_STAFF' :
     db?.currentUser?.System_Role === 'Branch_Manager' || db?.currentUser?.role === 'Branch Manager' ? 'ROLE_BRANCH_MANAGER' :
     db?.currentUser?.roleCode);

  const isBranchScoped = userRole !== 'ROLE_ADMIN';

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
        const amt = inv.Invoice_Total != null
          ? Number(inv.Invoice_Total)
          : (Number(inv.Billed_Consultation_Fee || 0) + Number(inv.Total_Treatments_Fee || 0));
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);

      const collectedToday = relevant.reduce((sum, inv) => {
        const paid = Number(inv.Patient_Paid) || 0;
        const ins = Number(inv.Insurance_Covered) || 0;
        if (paid > 0 || ins > 0) return sum + paid + ins;
        const invTotal = inv.Invoice_Total != null
          ? Number(inv.Invoice_Total)
          : (Number(inv.Billed_Consultation_Fee || 0) + Number(inv.Total_Treatments_Fee || 0));
        const validTotal = Number.isFinite(invTotal) ? invTotal : 0;
        if (inv.Invoice_Status === 'Paid') {
          return sum + validTotal;
        }
        if (inv.Invoice_Status === 'Partially Paid' || inv.Invoice_Status === 'Partially_Paid') {
          return sum + (validTotal * 0.5);
        }
        return sum;
      }, 0);

      const outstanding = relevant.reduce((sum, inv) => {
        if (inv.Outstanding_Balance != null) {
          return sum + Number(inv.Outstanding_Balance);
        }
        const invTotal = inv.Invoice_Total != null
          ? Number(inv.Invoice_Total)
          : (Number(inv.Billed_Consultation_Fee || 0) + Number(inv.Total_Treatments_Fee || 0));
        const validTotal = Number.isFinite(invTotal) ? invTotal : 0;
        if (inv.Invoice_Status === 'Issued' || inv.Invoice_Status === 'Draft') {
          return sum + validTotal;
        }
        if (inv.Invoice_Status === 'Partially Paid' || inv.Invoice_Status === 'Partially_Paid') {
          return sum + (validTotal * 0.5);
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
  const [invoiceBranchFilter, setInvoiceBranchFilter] = useState(() => (isBranchScoped ? String(currentBranchId) : ''));
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);

  useEffect(() => {
    if (isBranchScoped) {
      setInvoiceBranchFilter(String(currentBranchId));
    }
  }, [isBranchScoped, currentBranchId]);

  const invoiceBranches = useMemo(() => [...new Map(apiInvoices.map(inv =>
    [String(inv.Branch_ID), { id: inv.Branch_ID, name: inv.Branch_Name }]
  )).values()], [apiInvoices]);

  const filteredInvoices = useMemo(() => {
    return (apiInvoices || []).filter(inv => {
      const search = (invoiceSearchQuery || '').trim().toLowerCase();

      let matchSearch = true;
      if (search) {
        const invId = inv.Invoice_ID != null ? String(inv.Invoice_ID) : '';
        const conId = inv.Consultation_ID != null ? String(inv.Consultation_ID) : '';
        const apptId = inv.Appointment_ID != null ? String(inv.Appointment_ID) : '';
        const patId = inv.Patient_ID != null ? String(inv.Patient_ID) : (inv.patient_id != null ? String(inv.patient_id) : '');
        const patName = String(inv.Patient_Name || inv.patient_name || '').toLowerCase();
        const docName = String(inv.Doctor_Name || inv.doctor_name || '').toLowerCase();
        const branchName = String(inv.Branch_Name || inv.branch || '').toLowerCase();

        matchSearch = invId.includes(search) ||
          (invId && `inv-${invId}`.includes(search)) ||
          (invId && `inv-${invId.padStart(4, '0')}`.includes(search)) ||
          conId.includes(search) ||
          (conId && `con-${conId}`.includes(search)) ||
          apptId.includes(search) ||
          (apptId && `app-${apptId}`.includes(search)) ||
          patId.includes(search) ||
          (patId && `pat-${patId}`.includes(search)) ||
          (patId && `pat-${patId.padStart(4, '0')}`.includes(search)) ||
          patName.includes(search) ||
          docName.includes(search) ||
          branchName.includes(search);
      }

      const normalizedStatus = String(inv.Invoice_Status || inv.status || '')
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

      const matchStatus =
        invoiceStatusFilter === 'All' ||
        normalizedStatus === invoiceStatusFilter ||
        (invoiceStatusFilter === 'PARTIALLY_PAID' && (normalizedStatus === 'PARTIALLY_PAID' || normalizedStatus === 'PARTIAL'));

      const invDate = String(inv.Invoice_Date || inv.date || '').slice(0, 10);
      const matchDate = !invoiceDateFilter || invDate === invoiceDateFilter;

      const invBranchId = inv.Branch_ID != null ? String(inv.Branch_ID) : '';
      const matchBranch = !invoiceBranchFilter || invBranchId === String(invoiceBranchFilter);

      return matchSearch && matchStatus && matchDate && matchBranch;
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

  const billingFinancialChartData = useMemo(() => [
    { name: 'Total Billed', amount: Math.round(metrics.billedToday || 0), fill: '#2563eb' },
    { name: 'Collected', amount: Math.round(metrics.collectedToday || 0), fill: '#10b981' },
    { name: 'Outstanding', amount: Math.round(metrics.outstanding || 0), fill: '#ef4444' }
  ], [metrics]);

  const billingStatusChartData = useMemo(() => {
    const counts = { Paid: 0, Issued: 0, 'Partially Paid': 0, Draft: 0 };
    dashboardInvoices.forEach(inv => {
      const st = inv.Invoice_Status || 'Issued';
      if (st === 'Paid') counts.Paid += 1;
      else if (st === 'Partially Paid' || st === 'Partially_Paid') counts['Partially Paid'] += 1;
      else if (st === 'Draft') counts.Draft += 1;
      else counts.Issued += 1;
    });
    const colors = { Paid: '#10b981', Issued: '#f59e0b', 'Partially Paid': '#2563eb', Draft: '#64748b' };
    const items = Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value, color: colors[name] || '#64748b' }));
    return items.length > 0 ? items : [{ name: 'Issued', value: 1, color: '#f59e0b' }];
  }, [dashboardInvoices]);

  return (
    <PageTransition transitionKey={subView} className="space-y-6">

      {/* =====================================================
          1. BILLING DASHBOARD
          ===================================================== */}

      {subView === 'dashboard' && (
        <div className="space-y-6">

          {/* Modern SaaS Billing Hero Banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white p-6 sm:p-7 shadow-xl border border-slate-800"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Revenue &amp; Claims Operations</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {t('billing_desk_title', 'Billing Desk Dashboard')}
                </h1>

                <p className="text-sm text-slate-300 mt-1">
                  Settle itemized invoices, review co-pay ratios, and submit insurance claims for{' '}
                  <span className="font-semibold text-white">{currentBranch}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={loadInvoices}
                disabled={invoicesLoading}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${invoicesLoading ? 'animate-spin' : ''}`} />
                {invoicesLoading ? t('loading', 'Refreshing Data...') : t('refresh', 'Refresh Invoices')}
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

            <motion.div custom={0} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  {t('total', 'Total Billed')}
                </span>

                <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                  Rs. {metrics.billedToday.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <DollarSign className="h-6 w-6" />
              </div>
            </motion.div>

            <motion.div custom={1} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  {t('stat_revenue_collected', 'Payments Collected')}
                </span>

                <span className="text-xl font-bold text-emerald-600 mt-1 block font-mono">
                  Rs. {metrics.collectedToday.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </motion.div>

            <motion.div custom={2} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  {t('stat_outstanding_balance', 'Outstanding Balance')}
                </span>

                <span className="text-xl font-bold text-red-500 mt-1 block font-mono">
                  Rs. {metrics.outstanding.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <AlertCircle className="h-6 w-6" />
              </div>
            </motion.div>

            <motion.div custom={3} variants={MOTION_VARIANTS.fadeUp} initial="hidden" animate="visible" className="ds-card ds-card-hover p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                  Pending Settlements
                </span>

                <span className="text-xl font-bold text-amber-600 mt-1 block font-mono">
                  {metrics.pendingClaims}{' '}
                  Invoices
                </span>
              </div>

              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Clock className="h-6 w-6" />
              </div>
            </motion.div>

          </div>

          {/* =====================================================
              REVENUE & SETTLEMENT VISUAL ANALYTICS ROW
              ===================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              custom={4}
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2 ds-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <h2 className="font-bold text-slate-900 text-sm">Financial Settlement Overview (Rs.)</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Total billed vs. collected revenue and outstanding balances</p>
                </div>
                <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                  {metrics.billedToday > 0 ? `${Math.round((metrics.collectedToday / metrics.billedToday) * 100)}% Settled` : 'Live Ledger'}
                </span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={billingFinancialChartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => [`Rs. ${Number(val).toLocaleString('en-LK')}`, 'Amount']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="amount" name="Amount (Rs.)" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {billingFinancialChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              custom={5}
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              className="ds-card p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-teal-600" />
                  <h2 className="font-bold text-slate-900 text-sm">Invoice Status Breakdown</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Settlement distribution across active invoices</p>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={billingStatusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={4}
                    >
                      {billingStatusChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* =====================================================
              LIVE INVOICE QUEUE & ACTIONS TABLE
              ===================================================== */}

          <div className="ds-card overflow-hidden">
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
                      <th className="px-4 py-3 text-right">Consultation Fee</th>
                      <th className="px-4 py-3 text-right">Treatment Charges</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Balance Due</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650">
                    {dashboardInvoices.slice(0, 10).map(inv => {
                      const isPaid = inv.Invoice_Status === 'Paid';
                      const consultFee = Number(inv.Billed_Consultation_Fee || 0);
                      const treatmentFee = Number(inv.Total_Treatments_Fee || 0);
                      const total = Number(inv.Invoice_Total != null ? inv.Invoice_Total : (consultFee + treatmentFee));
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
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            Rs. {consultFee.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            Rs. {treatmentFee.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                placeholder="Search by invoice, consultation, patient, or doctor..."
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
              {isBranchScoped ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={`${currentBranch} (#${currentBranchId})`}
                    className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-600 cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                    Scoped
                  </span>
                </div>
              ) : (
                <select value={invoiceBranchFilter} onChange={e => setInvoiceBranchFilter(e.target.value)}
                  className="border border-slate-350 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">All branches</option>
                  {invoiceBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} (#{branch.id})</option>)}
                </select>
              )}
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
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span>No invoices match the selected filters.</span>
                          {(invoiceSearchQuery || invoiceStatusFilter !== 'All' || invoiceDateFilter || (invoiceBranchFilter && !isBranchScoped)) && (
                            <button
                              type="button"
                              onClick={() => {
                                setInvoiceSearchQuery('');
                                setInvoiceStatusFilter('All');
                                setInvoiceDateFilter('');
                                if (!isBranchScoped) setInvoiceBranchFilter('');
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
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

    </PageTransition>
  );
}