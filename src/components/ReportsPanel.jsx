import React, { useState, useMemo } from 'react';
import { Download, FileText, Filter, Calendar } from 'lucide-react';

export default function ReportsPanel({ db, handlers }) {
  const { currentUser, invoiceList, appointmentList, staffList, patientList } = db;
  const { triggerToast } = handlers;
  
  const [selectedReport, setSelectedReport] = useState(() => {
    // Choose first accessible report
    if (['Admin', 'Branch Manager', 'Receptionist'].includes(currentUser.role)) return 'rep-01';
    if (['Admin', 'Branch Manager'].includes(currentUser.role)) return 'rep-02';
    if (['Admin', 'Billing Clerk'].includes(currentUser.role)) return 'rep-03';
    return 'rep-05';
  });

  const [branchFilter, setBranchFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All-Time');

  // Verify access permissions
  const hasAccess = (repId) => {
    const role = currentUser.role;
    if (repId === 'rep-01') return ['Admin', 'Branch Manager', 'Receptionist'].includes(role);
    if (repId === 'rep-02') return ['Admin', 'Branch Manager'].includes(role);
    if (repId === 'rep-03') return ['Admin', 'Billing Clerk'].includes(role);
    if (repId === 'rep-04') return ['Admin', 'Branch Manager'].includes(role);
    if (repId === 'rep-05') return ['Admin', 'Billing Clerk'].includes(role);
    return false;
  };

  const handleExport = (type) => {
    triggerToast(`Exported ${selectedReport.toUpperCase()} data as ${type} successfully!`);
  };

  // REQ-REP-01: Branch Daily Summary Data
  const rep01Data = useMemo(() => {
    const branches = ['Colombo Main', 'Kandy', 'Galle'];
    return branches.map(br => {
      const appts = appointmentList.filter(a => a.branch === br);
      const scheduled = appts.filter(a => a.status === 'Booked' && !a.isWalkIn).length;
      const completed = appts.filter(a => a.status === 'Completed').length;
      const cancelled = appts.filter(a => a.status === 'Cancelled').length;
      const noshow = appts.filter(a => a.status === 'No-Show' || (a.status === 'Booked' && new Date(a.date) < new Date())).length;
      const walkin = appts.filter(a => a.isWalkIn || a.status === 'Walk-In').length;
      const total = appts.length || 1;
      const fulfillment = Math.round((completed / total) * 100);
      return { branch: br, scheduled, completed, cancelled, noshow, walkin, fulfillment };
    }).filter(row => branchFilter === 'All' || row.branch === branchFilter);
  }, [appointmentList, branchFilter]);

  // REQ-REP-02: Doctor Revenue Report
  const rep02Data = useMemo(() => {
    const doctors = staffList.filter(s => s.role.includes('Doc') || s.role === 'Cardiologist' || s.role === 'Dermatologist' || s.role === 'General Practitioner');
    return doctors.map(doc => {
      const invoices = invoiceList.filter(i => {
        // Find if this invoice belongs to this doctor's appointments
        const appt = appointmentList.find(a => a.id === i.appointmentId || (a.patientId === i.patientId && a.date === i.date));
        return appt?.doctorId === doc.id || appt?.doctorName === doc.name;
      });

      const completedCount = invoices.filter(i => i.status === 'Paid' || i.status === 'Partially Paid' || i.status === 'Pending').length;
      const gross = invoices.reduce((sum, i) => sum + i.doctorFee + i.treatmentsSubtotal, 0);
      const collected = invoices.reduce((sum, i) => {
        if (i.status === 'Paid') return sum + i.patientBalance + i.insuranceCoverage;
        if (i.status === 'Partially Paid') return sum + (i.patientBalance * 0.5) + i.insuranceCoverage;
        return sum + i.insuranceCoverage; // If pending or claim_pending, only insurance coverage might be collected
      }, 0);
      const outstanding = gross - collected;

      return {
        id: doc.id,
        name: doc.name,
        branch: doc.branch,
        completed: completedCount,
        gross,
        collected,
        outstanding
      };
    }).filter(row => branchFilter === 'All' || row.branch === branchFilter);
  }, [staffList, invoiceList, appointmentList, branchFilter]);

  // REQ-REP-03: Outstanding Balances
  const rep03Data = useMemo(() => {
    return invoiceList.map(inv => {
      if (inv.status === 'Paid') return null;
      return {
        invoiceId: inv.invoiceId,
        patientId: inv.patientId,
        patientName: inv.patientName,
        date: inv.date,
        total: inv.doctorFee + inv.treatmentsSubtotal,
        paid: inv.status === 'Partially Paid' ? (inv.patientBalance * 0.5) + inv.insuranceCoverage : inv.insuranceCoverage,
        balance: inv.patientBalance
      };
    }).filter(Boolean).filter(row => {
      if (branchFilter === 'All') return true;
      const pat = patientList.find(p => p.id === row.patientId);
      return pat?.branch === branchFilter;
    });
  }, [invoiceList, patientList, branchFilter]);

  // REQ-REP-04: Treatment Usage & Revenue
  const rep04Data = useMemo(() => {
    // Collect all treatments
    const treatments = [
      { code: 'TRT-001', name: 'General Consultation Fee', category: 'Consultations', price: 1500 },
      { code: 'TRT-002', name: 'ECG / Electrocardiogram', category: 'Lab Tests', price: 5000 },
      { code: 'TRT-003', name: 'Blood Sugar Rapid Test', category: 'Lab Tests', price: 600 },
      { code: 'TRT-004', name: 'Chest X-Ray Digital', category: 'Radiology', price: 8000 },
      { code: 'TRT-005', name: 'Nebulizer Therapy Session', category: 'Procedures', price: 2500 },
      { code: 'TRT-006', name: 'Stitch / Laceration Care', category: 'Procedures', price: 4000 },
      { code: 'TRT-007', name: 'IV Saline Infusion 500ml', category: 'Procedures', price: 3000 }
    ];

    return treatments.map(trt => {
      let count = 0;
      invoiceList.forEach(inv => {
        // Match items
        inv.items.forEach(item => {
          if (item.name === trt.name || item.code === trt.code) {
            count += item.qty;
          }
        });
        // Check if consultation fee
        if (trt.code === 'TRT-001') {
          count += 1; // standard consultation per invoice
        }
      });

      return {
        code: trt.code,
        name: trt.name,
        category: trt.category,
        price: trt.price,
        count,
        gross: count * trt.price
      };
    });
  }, [invoiceList]);

  // REQ-REP-05: Insurance vs. Out-of-Pocket
  const rep05Data = useMemo(() => {
    return invoiceList.map(inv => {
      const pat = patientList.find(p => p.id === inv.patientId);
      const total = inv.doctorFee + inv.treatmentsSubtotal;
      return {
        patientId: inv.patientId,
        invoiceId: inv.invoiceId,
        provider: pat?.insurance?.provider || 'Self / Cash',
        total,
        insurancePaid: inv.insuranceCoverage,
        outOfPocket: inv.patientBalance,
        status: inv.claimStatus || 'N/A'
      };
    }).filter(row => {
      if (branchFilter === 'All') return true;
      const pat = patientList.find(p => p.id === row.patientId);
      return pat?.branch === branchFilter;
    });
  }, [invoiceList, patientList, branchFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operational & Management Reports Suite</h1>
          <p className="text-sm text-slate-500 mt-1">Cross-branch statistical analytics, financial audits, and treatment monitoring</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg px-3 py-2 bg-white text-xs font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              className="border-none focus:outline-none bg-transparent"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="Colombo Main">Colombo Main</option>
              <option value="Kandy">Kandy</option>
              <option value="Galle">Galle</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('CSV')}
              className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="px-3 py-2 bg-white border border-slate-250 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {hasAccess('rep-01') && (
            <button
              onClick={() => setSelectedReport('rep-01')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                selectedReport === 'rep-01' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Branch Daily Summary (REP-01)
            </button>
          )}
          {hasAccess('rep-02') && (
            <button
              onClick={() => setSelectedReport('rep-02')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                selectedReport === 'rep-02' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Doctor Revenue (REP-02)
            </button>
          )}
          {hasAccess('rep-03') && (
            <button
              onClick={() => setSelectedReport('rep-03')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                selectedReport === 'rep-03' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Outstanding Balances (REP-03)
            </button>
          )}
          {hasAccess('rep-04') && (
            <button
              onClick={() => setSelectedReport('rep-04')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                selectedReport === 'rep-04' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Treatment Usage (REP-04)
            </button>
          )}
          {hasAccess('rep-05') && (
            <button
              onClick={() => setSelectedReport('rep-05')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                selectedReport === 'rep-05' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Insurance vs. Out-of-Pocket (REP-05)
            </button>
          )}
        </nav>
      </div>

      {/* Render selected report content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {selectedReport === 'rep-01' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Branch Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Scheduled Appointments</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Completed Consultations</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Emergency Walk-ins</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">No-Shows</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Cancellations</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Fulfillment Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {rep01Data.map(row => (
                  <tr key={row.branch} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{row.branch}</td>
                    <td className="px-6 py-4 text-center font-mono">{row.scheduled}</td>
                    <td className="px-6 py-4 text-center font-mono text-emerald-600 font-semibold">{row.completed}</td>
                    <td className="px-6 py-4 text-center font-mono text-amber-600 font-semibold">{row.walkin}</td>
                    <td className="px-6 py-4 text-center font-mono text-slate-400">{row.noshow}</td>
                    <td className="px-6 py-4 text-center font-mono text-red-500">{row.cancelled}</td>
                    <td className="px-6 py-4 text-right font-bold font-mono">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        row.fulfillment >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {row.fulfillment}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'rep-02' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Doctor ID & Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned Branch</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Completed Visits</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Gross Billed ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Collected Revenue ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Outstanding Balance ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {rep02Data.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{row.name}</div>
                      <span className="text-xs text-slate-400 font-mono">{row.id}</span>
                    </td>
                    <td className="px-6 py-4">{row.branch}</td>
                    <td className="px-6 py-4 text-center font-mono">{row.completed}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">${row.gross.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">${row.collected.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-red-500 font-semibold">${row.outstanding.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'rep-03' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Invoice ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Patient ID & Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Issue Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Total Billed ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Amount Paid ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Balance Due ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {rep03Data.map(row => (
                  <tr key={row.invoiceId} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">{row.invoiceId}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{row.patientName}</div>
                      <span className="text-xs text-slate-400 font-mono">{row.patientId}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">{row.date}</td>
                    <td className="px-6 py-4 text-right font-mono">${row.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-650 font-medium">${row.paid.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-red-500 font-bold">${row.balance.toFixed(2)}</td>
                  </tr>
                ))}
                {rep03Data.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                      No outstanding balances found. Excellent!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'rep-04' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Treatment Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Service / Treatment Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Standard Price ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Usage Count</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Total Gross Revenue ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {rep04Data.map(row => (
                  <tr key={row.code} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.category === 'Consultations' ? 'bg-blue-50 text-blue-700' :
                        row.category === 'Lab Tests' ? 'bg-purple-50 text-purple-700' :
                        row.category === 'Radiology' ? 'bg-sky-50 text-sky-700' : 'bg-teal-50 text-teal-700'
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">{row.code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-6 py-4 text-right font-mono">${row.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">{row.count}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-blue-600">${row.gross.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'rep-05' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Patient ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Invoice Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Insurance Provider</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Total Billed ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Insurance Paid ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Patient Out-of-Pocket ($)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Claim Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {rep05Data.map(row => (
                  <tr key={row.invoiceId} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold">{row.patientId}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{row.invoiceId}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.provider}</td>
                    <td className="px-6 py-4 text-right font-mono">${row.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-650">${row.insurancePaid.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold">${row.outOfPocket.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-700' :
                        row.status === 'APPROVED' ? 'bg-blue-50 text-blue-700' :
                        row.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
