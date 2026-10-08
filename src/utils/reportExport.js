const slugs = {
  'rep-01': 'branch-daily-summary',
  'rep-02': 'doctor-revenue',
  'rep-03': 'outstanding-balances',
  'rep-04': 'treatment-usage',
  'rep-05': 'insurance-vs-out-of-pocket'
};

export function reportFilename(report, filters) {
  const dates = report.id === 'rep-03' ? '' : report.id === 'rep-01'
    ? `-${filters.dateStart}` : `-${filters.dateStart}-to-${filters.dateEnd}`;
  const branch = filters.branchId === '' ? '' : `-branch-${Number(filters.branchId)}`;
  return `${slugs[report.id]}${dates}${branch}`;
}

function requireRows(rows) {
  if (!rows.length) throw new Error('There is no report data to export.');
}

export function createReportCsv(report, rows) {
  requireRows(rows);
  // Quote every field; CSV uses doubled quotes, not HTML entities.
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [report.columns.map(([, label]) => label),
    ...rows.map(row => report.columns.map(([field]) => row[field]))]
    .map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

export function downloadCsv(csv, filename) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function createReportPdf(report, rows, filters, generatedAt = new Date()) {
  requireRows(rows);
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const money = new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateLabel = report.id === 'rep-03' ? 'All dates' : report.id === 'rep-01'
    ? `Report date: ${filters.dateStart}` : `Date range: ${filters.dateStart} to ${filters.dateEnd}`;
  const branchLabel = filters.branchId === '' ? 'All branches' : `Branch ID: ${Number(filters.branchId)}`;
  doc.setProperties({ title: `${report.title} (${report.id.toUpperCase()})`, author: 'CareFlow CATMS' });
  const columnStyles = Object.fromEntries(report.columns.flatMap(([, , monetary], index) =>
    monetary ? [[index, { halign: 'right' }]] : []));
  autoTable(doc, {
    head: [report.columns.map(([, label]) => label)],
    body: rows.map(row => report.columns.map(([field, , monetary]) =>
      row[field] == null ? '-' : monetary ? `LKR ${money.format(Number(row[field]))}` : String(row[field]))),
    margin: { top: 48, bottom: 16, left: 12, right: 12 },
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    showHead: 'everyPage',
    willDrawPage: () => {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text('CareFlow CATMS', 12, 13);
      doc.setFontSize(12);
      doc.text(`${report.title} (${report.id.toUpperCase()})`, 12, 22);
      doc.setFontSize(9);
      doc.text(`${dateLabel} | ${branchLabel}`, 12, 30);
      doc.text(`Generated: ${generatedAt.toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} (Asia/Colombo)`, 12, 37);
    }
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page} of ${pages}`, 285, 202, { align: 'right' });
  }
  return doc;
}
