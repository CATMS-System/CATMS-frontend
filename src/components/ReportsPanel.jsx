import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Filter, BarChart3, PieChart as PieChartIcon, RefreshCw, Calendar } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { createReportCsv, createReportPdf, downloadCsv, reportFilename } from '../utils/reportExport';
import { getCurrentReportDates } from '../utils/reportDates.js';
import { useLanguage } from '../contexts/LanguageContext';
import { ensureMotionSafeEnv, MOTION_VARIANTS } from '../theme/designSystem';
import { PageTransition, TableSkeleton } from './ui/PageTransition';
import {
  getBranchDailySummary,
  getDoctorRevenue,
  getOutstandingBalances,
  getTreatmentUsage,
  getInsuranceVsOutOfPocket
} from '../api/reportsApi';

const currency = new Intl.NumberFormat('en-LK', {
  style: 'currency', currency: 'LKR', minimumFractionDigits: 2
});

const PIE_COLORS = ['#2563eb', '#0d9488', '#6366f1', '#f59e0b', '#10b981', '#ec4899'];

// Columns correspond to report response fields; monetary values are formatted only.
const reports = [
  {
    id: 'rep-01', title: 'Branch Daily Summary',
    roles: ['ROLE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_RECEPTIONIST', 'ROLE_BILLING_STAFF'],
    columns: [
      ['Branch_ID', 'Branch ID'], ['Branch_Name', 'Branch Location'],
      ['Appointment_Date', 'Appointment Date'], ['Total_Appointments', 'Total Appointments'],
      ['Scheduled_Appointments', 'Scheduled Appointments'], ['Completed_Appointments', 'Completed Appointments'],
      ['Cancelled_Appointments', 'Cancelled Appointments'], ['No_Show_Appointments', 'No-Shows'],
      ['Walk_In_Appointments', 'Walk-Ins']
    ]
  },
  {
    id: 'rep-02', title: 'Doctor Revenue', roles: ['ROLE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_BILLING_STAFF'],
    columns: [
      ['Doctor_ID', 'Doctor ID'], ['Doctor_Name', 'Doctor Name'],
      ['Branch_ID', 'Branch ID'], ['Branch_Name', 'Branch Location'],
      ['Total_Consultations', 'Consultations'], ['Total_Invoices', 'Total Invoices'], ['Gross_Revenue', 'Gross Revenue', true],
      ['Collected_Revenue', 'Collected Revenue', true]
    ]
  },
  {
    id: 'rep-03', title: 'Outstanding Balances', roles: ['ROLE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_BILLING_STAFF'],
    columns: [
      ['Patient_ID', 'Patient ID'], ['Patient_Name', 'Patient Name'],
      ['Branch_ID', 'Branch ID'], ['Branch_Name', 'Branch Location'],
      ['Total_Invoices', 'Total Invoices'], ['Total_Billed', 'Total Billed', true],
      ['Total_Paid', 'Patient Payments', true], ['Insurance_Covered', 'Insurance Covered', true],
      ['Outstanding_Balance', 'Outstanding Balance', true]
    ]
  },
  {
    id: 'rep-04', title: 'Treatment Usage', roles: ['ROLE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_BILLING_STAFF'],
    columns: [
      ['Category_ID', 'Category ID'], ['Category_Name', 'Treatment Category'],
      ['Total_Quantity', 'Total Quantity'], ['Consultations_Using_Treatment', 'Consultations Using Treatment'],
      ['Treatment_Revenue', 'Treatment Revenue', true]
    ]
  },
  {
    id: 'rep-05', title: 'Insurance vs. Out-of-Pocket', roles: ['ROLE_ADMIN', 'ROLE_BILLING_STAFF'],
    columns: [
      ['Branch_ID', 'Branch ID'], ['Branch_Name', 'Branch Location'],
      ['Total_Invoices', 'Total Invoices'], ['Total_Billed', 'Total Billed', true],
      ['Insurance_Covered', 'Insurance Covered', true], ['Out_Of_Pocket', 'Out-of-Pocket', true],
      ['Outstanding_Balance', 'Outstanding Balance', true]
    ]
  }
];

export default function ReportsPanel({ db }) {
  ensureMotionSafeEnv();
  const { t } = useLanguage();
  // Use the same role codes as App routing; display names are not permission keys.
  const role = db?.currentUser?.roleCode ||
    (db?.currentUser?.System_Role === 'Branch_Manager' || db?.currentUser?.role === 'Branch Manager' || db?.currentUser?.role === 'Branch_Manager' ? 'ROLE_BRANCH_MANAGER' :
     db?.currentUser?.System_Role === 'Admin' || db?.currentUser?.role === 'Admin' ? 'ROLE_ADMIN' :
     db?.currentUser?.System_Role === 'Billing_Staff' || db?.currentUser?.role === 'Billing Staff' || db?.currentUser?.role === 'Billing_Staff' ? 'ROLE_BILLING_STAFF' :
     db?.currentUser?.roleCode);

  const isManager = role === 'ROLE_BRANCH_MANAGER' ||
    role === 'ROLE_BILLING_STAFF' ||
    db?.currentUser?.role === 'Branch Manager' ||
    db?.currentUser?.role === 'Branch_Manager' ||
    db?.currentUser?.System_Role === 'Branch_Manager' ||
    db?.currentUser?.role === 'Billing Staff' ||
    db?.currentUser?.role === 'Billing_Staff' ||
    db?.currentUser?.System_Role === 'Billing_Staff';

  const managerBranchName = db?.currentUser?.branch || 'Assigned Branch';

  const managerBranchId = useMemo(() => {
    if (db?.currentUser?.branch_id) return Number(db.currentUser.branch_id);
    if (db?.currentUser?.Branch_ID) return Number(db.currentUser.Branch_ID);
    const found = db?.branches?.find(
      b => b.name === managerBranchName || b.Branch_Name === managerBranchName
    );
    return found ? (found.Branch_ID || found.id || 1) : 1;
  }, [db?.currentUser, db?.branches, managerBranchName]);

  const accessibleReports = reports.filter(report => report.roles.includes(role));
  const [selectedReport, setSelectedReport] = useState(() =>
    reports.find(report => report.roles.includes(role))?.id || ''
  );
  const [showCharts, setShowCharts] = useState(true);
  const report = accessibleReports.find(item => item.id === selectedReport) || accessibleReports[0];
  const reportId = report?.id;

  const [branchFilter, setBranchFilter] = useState(() => (isManager ? String(managerBranchId) : ''));
  const [initialDates] = useState(getCurrentReportDates);
  const [reportDate, setReportDate] = useState(initialDates.reportDate);
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: '', rows: [], loading: true, error: '' });

  useEffect(() => {
    if (isManager) {
      setBranchFilter(String(managerBranchId));
    }
  }, [isManager, managerBranchId]);

  const setPresetAug2026 = () => {
    setReportDate('2026-08-23');
    setStartDate('2026-08-01');
    setEndDate('2026-08-31');
  };

  const setPresetCurrent = () => {
    const dates = getCurrentReportDates();
    setReportDate(dates.reportDate);
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };

  const effectiveBranchId = isManager
    ? Number(managerBranchId)
    : (branchFilter === '' ? null : Number(branchFilter));

  const dateStart = reportId === 'rep-01' ? reportDate : reportId === 'rep-03' ? '' : startDate;
  const dateEnd = ['rep-01', 'rep-03'].includes(reportId) ? '' : endDate;
  const requestKey = JSON.stringify([reportId, effectiveBranchId, dateStart, dateEnd, reload]);

  useEffect(() => {
    if (!reportId) return;
    let active = true;
    const loadReport = async () => {
      setResult({ key: requestKey, rows: [], loading: true, error: '' });
      try {
        if (effectiveBranchId !== null && (!Number.isInteger(effectiveBranchId) || effectiveBranchId <= 0)) {
          throw new Error('Branch ID must be a positive whole number, or blank for all branches.');
        }
        if (reportId !== 'rep-03' && (!dateStart || (reportId !== 'rep-01' && !dateEnd))) {
          throw new Error('Select the required report dates.');
        }
        if (dateEnd && dateStart > dateEnd) {
          throw new Error('Start date must be on or before end date.');
        }
        let rows;
        switch (reportId) {
          case 'rep-01': rows = await getBranchDailySummary(dateStart, effectiveBranchId); break;
          case 'rep-02': rows = await getDoctorRevenue(dateStart, dateEnd, effectiveBranchId); break;
          case 'rep-03': rows = await getOutstandingBalances(effectiveBranchId); break;
          case 'rep-04': rows = await getTreatmentUsage(dateStart, dateEnd, effectiveBranchId); break;
          case 'rep-05':
            if (isManager) throw new Error('Access denied: Branch Managers cannot view organization-wide insurance reports.');
            rows = await getInsuranceVsOutOfPocket(dateStart, dateEnd, effectiveBranchId);
            break;
        }
        if (!Array.isArray(rows)) throw new Error('The report API returned an invalid response.');
        if (active) setResult({ key: requestKey, rows, loading: false, error: '' });
      } catch (error) {
        if (active) setResult({ key: requestKey, rows, loading: false, error: error.message || 'Failed to load report.' });
      }
    };
    loadReport();
    return () => { active = false; };
  }, [reportId, effectiveBranchId, dateStart, dateEnd, requestKey]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const loading = result.key !== requestKey || result.loading;
  const canExport = Boolean(report && !loading && !result.error && result.rows.length > 0 && !exporting);
  const handleExport = async format => {
    if (!canExport) return;
    setExportError('');
    setExporting(true);
    // Capture the visible response and its matching filters before lazy-loading PDF code.
    const filters = { dateStart, dateEnd, branchId: effectiveBranchId ?? '' };
    const rows = result.rows;
    const filename = reportFilename(report, filters);
    try {
      if (format === 'csv') downloadCsv(createReportCsv(report, rows), filename);
      else {
        const doc = await createReportPdf(report, rows, filters);
        doc.save(`${filename}.pdf`);
      }
    } catch (error) {
      setExportError(error.message || 'Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Visual Analytics Data derived 100% from result.rows (zero extra API calls)
  const chartData = useMemo(() => {
    if (!Array.isArray(result.rows) || result.rows.length === 0) return [];
    return result.rows.slice(0, 12).map((row, idx) => {
      if (reportId === 'rep-01') {
        return {
          name: (row.Branch_Name || `Branch ${row.Branch_ID || idx + 1}`).replace(' Clinic', ''),
          Total: Number(row.Total_Appointments || 0),
          Scheduled: Number(row.Scheduled_Appointments || 0),
          Completed: Number(row.Completed_Appointments || 0),
          Cancelled: Number(row.Cancelled_Appointments || 0),
          WalkIns: Number(row.Walk_In_Appointments || 0),
        };
      }
      if (reportId === 'rep-02') {
        return {
          name: row.Doctor_Name || `Doctor #${row.Doctor_ID || idx + 1}`,
          GrossRevenue: Number(row.Gross_Revenue || 0),
          CollectedRevenue: Number(row.Collected_Revenue || 0),
          Consultations: Number(row.Total_Consultations || 0),
        };
      }
      if (reportId === 'rep-03') {
        return {
          name: row.Patient_Name || `Patient #${row.Patient_ID || idx + 1}`,
          TotalBilled: Number(row.Total_Billed || 0),
          Paid: Number(row.Total_Paid || 0),
          Insurance: Number(row.Insurance_Covered || 0),
          Outstanding: Number(row.Outstanding_Balance || 0),
        };
      }
      if (reportId === 'rep-04') {
        return {
          name: row.Category_Name || `Category #${row.Category_ID || idx + 1}`,
          Revenue: Number(row.Treatment_Revenue || 0),
          Quantity: Number(row.Total_Quantity || 0),
          Consultations: Number(row.Consultations_Using_Treatment || 0),
        };
      }
      if (reportId === 'rep-05') {
        return {
          name: (row.Branch_Name || `Branch ${row.Branch_ID || idx + 1}`).replace(' Clinic', ''),
          TotalBilled: Number(row.Total_Billed || 0),
          Insurance: Number(row.Insurance_Covered || 0),
          OutOfPocket: Number(row.Out_Of_Pocket || 0),
          Outstanding: Number(row.Outstanding_Balance || 0),
        };
      }
      return row;
    });
  }, [result.rows, reportId]);

  const inputClass = 'border border-slate-200 rounded-xl px-3.5 py-2 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 transition-all';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="ds-card p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-white via-white to-blue-50/40">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-wider mb-2">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Interactive Analytics & Audit Export</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t('reports_suite_title', 'Operational & Management Reports Suite')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cross-branch statistical analytics, visual graphs, financial audits, and treatment monitoring
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCharts(v => !v)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{showCharts ? 'Hide Visual Graphs' : 'Show Visual Graphs'}</span>
          </button>
          <motion.button
            whileHover={canExport ? { y: -1, scale: 1.01 } : undefined}
            whileTap={canExport ? { scale: 0.98 } : undefined}
            disabled={!canExport}
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />Export CSV
          </motion.button>
          <motion.button
            whileHover={canExport ? { y: -1, scale: 1.01 } : undefined}
            whileTap={canExport ? { scale: 0.98 } : undefined}
            disabled={!canExport}
            onClick={() => handleExport('pdf')}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5" />{t('export_pdf', 'Export PDF')}
          </motion.button>
          {exporting && <span role="status" className="text-xs text-slate-500">Preparing export…</span>}
        </div>
      </div>

      {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}

      {/* Report Selector Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-6" aria-label="Management reports">
          {accessibleReports.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedReport(item.id)}
              aria-current={reportId === item.id ? 'page' : undefined}
              className={`pb-3.5 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                reportId === item.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.title} ({item.id.toUpperCase()})
            </button>
          ))}
        </nav>
      </div>

      {report ? (
        <PageTransition transitionKey={reportId} className="space-y-6">
          {/* Filter Bar */}
          <div className="ds-card p-4 flex flex-wrap items-end gap-4">
            {isManager ? (
              <label className="space-y-1.5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1"><Filter className="h-4 w-4 text-blue-600" />Branch Scope (Locked)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={`Branch ${managerBranchId} - ${managerBranchName}`}
                    className={`${inputClass} block w-56 bg-slate-100 text-slate-600 cursor-not-allowed select-none`}
                  />
                  <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800">
                    Scoped
                  </span>
                </div>
              </label>
            ) : (
              <label className="space-y-1.5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1"><Filter className="h-4 w-4 text-blue-600" />Branch ID (optional)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={branchFilter}
                  onChange={event => setBranchFilter(event.target.value)}
                  placeholder="All branches"
                  className={`${inputClass} block w-40`}
                />
              </label>
            )}

            {reportId === 'rep-01' && (
              <label className="space-y-1.5 text-xs font-semibold text-slate-500">
                <span className="block">Report date</span>
                <input type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} className={inputClass} />
              </label>
            )}
            {!['rep-01', 'rep-03'].includes(reportId) && (
              <>
                <label className="space-y-1.5 text-xs font-semibold text-slate-500">
                  <span className="block">Start date</span>
                  <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-slate-500">
                  <span className="block">End date</span>
                  <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className={inputClass} />
                </label>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={setPresetAug2026}
                title="Load seed dataset period (August 2026)"
                className={`${inputClass} bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer`}
              >
                Seed Period (Aug 2026)
              </button>
              <button
                type="button"
                onClick={setPresetCurrent}
                title="Reset to current month"
                className={`${inputClass} hover:bg-slate-50 cursor-pointer`}
              >
                Current Month
              </button>
              <button
                type="button"
                onClick={() => setReload(value => value + 1)}
                className={`${inputClass} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer inline-flex items-center gap-1.5`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh report</span>
              </button>
            </div>
          </div>

          {/* Interactive Recharts Visual Analytics Section for Reports */}
          {showCharts && !loading && !result.error && chartData.length > 0 && (
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-12 gap-5"
            >
              <div className="lg:col-span-8 ds-card ds-card-hover p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {report.title} — Visual Comparison Graph
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Interactive chart generated directly from the active report dataset ({result.rows.length} rows)
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 text-[10px] font-bold">
                    {reportId.toUpperCase()} ANALYTICS
                  </span>
                </div>

                <div className="h-64 w-full" role="img" aria-label={`${report.title} bar chart`}>
                  <ResponsiveContainer width="100%" height="100%">
                    {reportId === 'rep-01' ? (
                      <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Scheduled" name="Scheduled" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Completed" name="Completed" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Cancelled" name="Cancelled" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="WalkIns" name="Walk-Ins" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    ) : reportId === 'rep-02' ? (
                      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          formatter={(val) => currency.format(Number(val))}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="GrossRevenue" name="Gross Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="CollectedRevenue" name="Collected Revenue" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    ) : reportId === 'rep-03' ? (
                      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          formatter={(val) => currency.format(Number(val))}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="TotalBilled" name="Total Billed" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Paid" name="Patient Paid" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Outstanding" name="Outstanding Balance" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    ) : reportId === 'rep-04' ? (
                      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          formatter={(val) => currency.format(Number(val))}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Revenue" name="Treatment Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={42} />
                      </BarChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e8eef6" strokeDasharray="4 4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          formatter={(val) => currency.format(Number(val))}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Insurance" name="Insurance Covered" fill="#0d9488" radius={[5, 5, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="OutOfPocket" name="Out-of-Pocket" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="Outstanding" name="Outstanding Balance" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribution Donut Chart Card (4 cols on lg) */}
              <div className="lg:col-span-4 ds-card ds-card-hover p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-slate-900">Share Breakdown</h3>
                    <PieChartIcon className="h-4 w-4 text-teal-600" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Proportional distribution by {reportId === 'rep-02' ? 'Doctor' : reportId === 'rep-04' ? 'Category' : reportId === 'rep-03' ? 'Patient' : 'Branch'}
                  </p>
                </div>

                <div className="h-52 w-full" role="img" aria-label={`${report.title} distribution chart`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey={
                          reportId === 'rep-01' ? 'Total' :
                          reportId === 'rep-02' ? 'GrossRevenue' :
                          reportId === 'rep-03' ? 'Outstanding' :
                          reportId === 'rep-04' ? 'Revenue' : 'TotalBilled'
                        }
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={entry.name || idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Total Records Analyzed</span>
                  <strong className="font-mono font-bold text-slate-900">{result.rows.length} Rows</strong>
                </div>
              </div>
            </motion.div>
          )}

          {/* Data Table Card */}
          <div className="ds-card overflow-hidden" aria-busy={loading}>
            {loading ? (
              <div className="p-6 space-y-4">
                <p role="status" className="text-xs font-semibold text-slate-500 text-center">Loading report…</p>
                <TableSkeleton rows={4} columns={report.columns.length > 6 ? 6 : report.columns.length} />
              </div>
            ) : result.error ? (
              <div role="alert" className="px-6 py-10 text-center text-sm text-red-600">
                <p>{result.error}</p>
                <button onClick={() => setReload(value => value + 1)} className="mt-3 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Try again</button>
              </div>
            ) : result.rows.length === 0 ? (
              <div role="status" className="px-6 py-10 text-center text-sm text-slate-500 space-y-2">
                <p>
                  {reportId === 'rep-03' ? 'No outstanding balances found.' : 'No report results found for the selected date range.'}
                </p>
                {reportId !== 'rep-03' && (
                  <p className="text-xs text-slate-400">
                    Looking for seed records?{' '}
                    <button
                      type="button"
                      onClick={setPresetAug2026}
                      className="font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      View August 2026 Seed Records
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">{report.title}</caption>
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200">
                      {report.columns.map(([field, label, monetary]) => (
                        <th key={field} scope="col" className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide ${monetary ? 'text-right' : ''}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {result.rows.map((row, index) => (
                      <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                        {report.columns.map(([field, , monetary]) => (
                          <td key={field} className={`px-6 py-4 ${monetary ? 'text-right font-mono font-semibold text-slate-900' : ''}`}>
                            {row[field] == null ? '—' : monetary ? currency.format(Number(row[field])) : row[field]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PageTransition>
      ) : <p className="text-sm text-slate-500">No reports are available for your role.</p>}
    </div>
  );
}
