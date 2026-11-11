import { CurrencyCode } from '../types/database';

export type ReportTimeFrame = 'day' | 'week' | 'month' | 'multi_month' | 'year' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Standard anchor date for the rich mock timeline (August 2026)
 */
export const DEFAULT_ANCHOR_DATE = '2026-08-20';

/**
 * Helper to calculate start & end dates based on selected timeframe preset
 */
export function getDateRangeForTimeFrame(
  timeFrame: ReportTimeFrame,
  anchorDate: string = DEFAULT_ANCHOR_DATE
): DateRange {
  const [yearStr, monthStr, dayStr] = anchorDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based
  const day = parseInt(dayStr, 10);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (timeFrame === 'day') {
    return { startDate: anchorDate, endDate: anchorDate };
  }

  if (timeFrame === 'week') {
    // Current week around anchor date (Mon - Sun)
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0 is Monday, 6 is Sunday
    const mon = new Date(year, month - 1, day - dayOfWeek);
    const sun = new Date(year, month - 1, day - dayOfWeek + 6);
    return {
      startDate: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`,
      endDate: `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`
    };
  }

  if (timeFrame === 'month') {
    // Entire current month
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${year}-${pad(month)}-01`,
      endDate: `${year}-${pad(month)}-${pad(lastDay)}`
    };
  }

  if (timeFrame === 'multi_month') {
    // Last 3 calendar months (Quarter)
    let startMonth = month - 2;
    let startYear = year;
    if (startMonth < 1) {
      startMonth += 12;
      startYear -= 1;
    }
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${startYear}-${pad(startMonth)}-01`,
      endDate: `${year}-${pad(month)}-${pad(lastDay)}`
    };
  }

  if (timeFrame === 'year') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }

  // Custom fallback
  return { startDate: anchorDate, endDate: anchorDate };
}

/**
 * Format YYYY-MM to human friendly "August 2026"
 */
export function formatMonthName(yearMonthStr: string): string {
  const [y, m] = yearMonthStr.split('-');
  if (!y || !m) return yearMonthStr;
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format YYYY-MM-DD to human friendly "Thursday, Aug 20, 2026"
 */
export function formatDayTitle(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Return quarter string e.g. "Q1 (Jan – Mar 2026)"
 */
export function getQuarterInfo(year: number, quarterNumber: 1 | 2 | 3 | 4): { id: string; label: string; months: string[] } {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  switch (quarterNumber) {
    case 1:
      return {
        id: `Q1-${year}`,
        label: `Q1 (${year}) · January – March`,
        months: [`${year}-01`, `${year}-02`, `${year}-03`]
      };
    case 2:
      return {
        id: `Q2-${year}`,
        label: `Q2 (${year}) · April – June`,
        months: [`${year}-04`, `${year}-05`, `${year}-06`]
      };
    case 3:
      return {
        id: `Q3-${year}`,
        label: `Q3 (${year}) · July – September`,
        months: [`${year}-07`, `${year}-08`, `${year}-09`]
      };
    case 4:
      return {
        id: `Q4-${year}`,
        label: `Q4 (${year}) · October – December`,
        months: [`${year}-10`, `${year}-11`, `${year}-12`]
      };
  }
}
