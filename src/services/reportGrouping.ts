import { CurrencyCode } from '../types/database';

export type ReportTimeFrame = 'day' | 'week' | 'month' | 'multi_month' | 'year' | 'all' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Standard anchor date for the rich mock timeline (August 2026)
 */
export const DEFAULT_ANCHOR_DATE = '2026-08-20';

/**
 * Return current real-world date in 'YYYY-MM-DD' format
 */
export function getRealWorldToday(): string {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Helper to calculate start & end dates based on selected timeframe preset
 */
export function getDateRangeForTimeFrame(
  timeFrame: ReportTimeFrame,
  anchorDate: string = DEFAULT_ANCHOR_DATE
): DateRange {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (timeFrame === 'day') {
    // Exact real-world current date
    const today = getRealWorldToday();
    return { startDate: today, endDate: today };
  }

  if (timeFrame === 'week') {
    // Current real-world week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 is Monday, 6 is Sunday
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6);
    return {
      startDate: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`,
      endDate: `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`
    };
  }

  const [yearStr, monthStr, dayStr] = anchorDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-based
  const day = parseInt(dayStr, 10);

  if (timeFrame === 'month') {
    // Entire current month
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${year}-${pad(month)}-01`,
      endDate: `${year}-${pad(month)}-${pad(lastDay)}`
    };
  }

  if (timeFrame === 'multi_month') {
    // Default to Q3 for August (July - September)
    return getDateRangeForQuarter(year, 3);
  }

  if (timeFrame === 'year') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }

  if (timeFrame === 'all') {
    return {
      startDate: '2020-01-01',
      endDate: '2030-12-31'
    };
  }

  // Custom fallback
  return { startDate: anchorDate, endDate: anchorDate };
}

/**
 * Calculate date range for a specific quarter
 */
export function getDateRangeForQuarter(year: number, quarterNumber: 1 | 2 | 3 | 4): DateRange {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const startMonth = (quarterNumber - 1) * 3 + 1;
  const endMonth = quarterNumber * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return {
    startDate: `${year}-${pad(startMonth)}-01`,
    endDate: `${year}-${pad(endMonth)}-${pad(lastDay)}`
  };
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
  return {
    id: `Q${quarterNumber}-${year}`,
    label: `Q${quarterNumber} (${year}) · ${
      quarterNumber === 1 ? 'January – March' :
      quarterNumber === 2 ? 'April – June' :
      quarterNumber === 3 ? 'July – September' : 'October – December'
    }`,
    months: [
      `${year}-${String((quarterNumber - 1) * 3 + 1).padStart(2, '0')}`,
      `${year}-${String((quarterNumber - 1) * 3 + 2).padStart(2, '0')}`,
      `${year}-${String((quarterNumber - 1) * 3 + 3).padStart(2, '0')}`
    ]
  };
}
