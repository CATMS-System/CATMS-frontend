// Date inputs and report APIs use calendar dates in the user's local timezone.
export function getCurrentReportDates(now = new Date()) {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return { reportDate: today, startDate: `${year}-${month}-01`, endDate: today };
}
