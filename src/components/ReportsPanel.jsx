import React, { useEffect, useState } from 'react';
import { Download, FileText, Filter } from 'lucide-react';
import { createReportCsv, createReportPdf, downloadCsv, reportFilename } from '../utils/reportExport';
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

// Columns correspond to report response fields; monetary values are formatted only.
const reports = [
  {
    id: 'rep-01', title: 'Branch Daily Summary',
    roles: ['ROLE_ADMIN', 'ROLE_BRANCH_MANAGER', 'ROLE_RECEPTIONIST', 'ROLE_BILLING_STAFF'],
    columns: [
      ['Branch_ID', 'Branch ID'], ['Branch_Name', 'Branch Location'],
      ['Appointment_Date', 'Appointment Date'], ['Total_Appointments', 'Total Appointments'],
      ['Completed_Appointments', 'Completed Appointments'],
      ['Cancelled_Appointments', 'Cancelled Appointments'], ['No_Show_Appointments', 'No-Shows']
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
  // Use the same role codes as App routing; display names are not permission keys.
  const role = db.currentUser.roleCode;
  const accessibleReports = reports.filter(report => report.roles.includes(role));
  const [selectedReport, setSelectedReport] = useState(() =>
    reports.find(report => report.roles.includes(role))?.id || ''
  );
  const report = accessibleReports.find(item => item.id === selectedReport) || accessibleReports[0];
  const reportId = report?.id;
  const [branchFilter, setBranchFilter] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: '', rows: [], loading: true, error: '' });
  const dateStart = reportId === 'rep-01' ? reportDate : reportId === 'rep-03' ? '' : startDate;
  const dateEnd = ['rep-01', 'rep-03'].includes(reportId) ? '' : endDate;
  const requestKey = JSON.stringify([reportId, branchFilter, dateStart, dateEnd, reload]);

  useEffect(() => {
    if (!reportId) return;
    let active = true;
    const loadReport = async () => {
      setResult({ key: requestKey, rows: [], loading: true, error: '' });
      try {
        const branchId = branchFilter === '' ? null : Number(branchFilter);
        if (branchId !== null && (!Number.isInteger(branchId) || branchId <= 0)) {
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
          case 'rep-01': rows = await getBranchDailySummary(dateStart, branchId); break;
          case 'rep-02': rows = await getDoctorRevenue(dateStart, dateEnd, branchId); break;
          case 'rep-03': rows = await getOutstandingBalances(branchId); break;
          case 'rep-04': rows = await getTreatmentUsage(dateStart, dateEnd, branchId); break;
          case 'rep-05': rows = await getInsuranceVsOutOfPocket(dateStart, dateEnd, branchId); break;
        }
        if (!Array.isArray(rows)) throw new Error('The report API returned an invalid response.');
        if (active) setResult({ key: requestKey, rows, loading: false, error: '' });
      } catch (error) {
        if (active) setResult({ key: requestKey, rows: [], loading: false, error: error.message || 'Failed to load report.' });
      }
    };
    loadReport();
    return () => { active = false; };
  }, [reportId, branchFilter, dateStart, dateEnd, requestKey]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const loading = result.key !== requestKey || result.loading;
  const canExport = Boolean(report && !loading && !result.error && result.rows.length > 0 && !exporting);
  const handleExport = async format => {
    if (!canExport) return;
    setExportError('');
    setExporting(true);
    // Capture the visible response and its matching filters before lazy-loading PDF code.
    const filters = { dateStart, dateEnd, branchId: branchFilter };
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
  const inputClass = 'border border-slate-200 rounded-lg px-3 py-2 bg-white text-xs font-semibold text-slate-700';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operational & Management Reports Suite</h1>
          <p className="text-sm text-slate-500 mt-1">Cross-branch statistical analytics, financial audits, and treatment monitoring</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={!canExport} onClick={() => handleExport('csv')}
            className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="h-3.5 w-3.5" />Export CSV
          </button>
          <button disabled={!canExport} onClick={() => handleExport('pdf')}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <FileText className="h-3.5 w-3.5" />Export PDF
          </button>
          {exporting && <span role="status" className="text-xs text-slate-500">Preparing export…</span>}
        </div>
      </div>

      {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-6" aria-label="Management reports">
          {accessibleReports.map(item => (
            <button key={item.id} onClick={() => setSelectedReport(item.id)}
              aria-current={reportId === item.id ? 'page' : undefined}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                reportId === item.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {item.title} ({item.id.toUpperCase()})
            </button>
          ))}
        </nav>
      </div>

      {report ? (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-1 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><Filter className="h-4 w-4" />Branch ID (optional)</span>
              <input type="number" min="1" step="1" value={branchFilter}
                onChange={event => setBranchFilter(event.target.value)} placeholder="All branches"
                className={`${inputClass} block w-40`} />
            </label>
            {reportId === 'rep-01' && (
              <label className="space-y-1 text-xs font-semibold text-slate-500">
                <span className="block">Report date</span>
                <input type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} className={inputClass} />
              </label>
            )}
            {!['rep-01', 'rep-03'].includes(reportId) && (
              <>
                <label className="space-y-1 text-xs font-semibold text-slate-500">
                  <span className="block">Start date</span>
                  <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-500">
                  <span className="block">End date</span>
                  <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className={inputClass} />
                </label>
              </>
            )}
            <button onClick={() => setReload(value => value + 1)} className={`${inputClass} hover:bg-slate-50 cursor-pointer`}>Refresh report</button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" aria-busy={loading}>
            {loading ? (
              <p role="status" className="px-6 py-10 text-center text-sm text-slate-500">Loading report…</p>
            ) : result.error ? (
              <div role="alert" className="px-6 py-10 text-center text-sm text-red-600">
                <p>{result.error}</p>
                <button onClick={() => setReload(value => value + 1)} className="mt-3 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">Try again</button>
              </div>
            ) : result.rows.length === 0 ? (
              <p role="status" className="px-6 py-10 text-center text-sm text-slate-500">
                {reportId === 'rep-03' ? 'No outstanding balances found.' : 'No report results found for the selected filters.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">{report.title}</caption>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {report.columns.map(([field, label, monetary]) => (
                        <th key={field} scope="col" className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide ${monetary ? 'text-right' : ''}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                    {result.rows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
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
        </>
      ) : <p className="text-sm text-slate-500">No reports are available for your role.</p>}
    </div>
  );
}