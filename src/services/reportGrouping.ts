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
 * All relative filters (day, week, month, quarter, year) dynamically resolve
 * against the real-world current calendar date!
 */
export function getDateRangeForTimeFrame(
  timeFrame: ReportTimeFrame,
  anchorDate: string = DEFAULT_ANCHOR_DATE
): DateRange {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDate = now.getDate();

  if (timeFrame === 'day') {
    // Exact real-world current date
    const today = getRealWorldToday();
    return { startDate: today, endDate: today };
  }

  if (timeFrame === 'week') {
    // Current real-world week (Monday to Sunday)
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 is Monday, 6 is Sunday
    const mon = new Date(currentYear, now.getMonth(), currentDate - dayOfWeek);
    const sun = new Date(currentYear, now.getMonth(), currentDate - dayOfWeek + 6);
    return {
      startDate: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`,
      endDate: `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`
    };
  }

  if (timeFrame === 'month') {
    // Current real-world month (1st through last day of current calendar month)
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    return {
      startDate: `${currentYear}-${pad(currentMonth)}-01`,
      endDate: `${currentYear}-${pad(currentMonth)}-${pad(lastDay)}`
    };
  }

  if (timeFrame === 'multi_month') {
    // Current real-world calendar quarter
    const currentQuarter = (Math.floor((currentMonth - 1) / 3) + 1) as 1 | 2 | 3 | 4;
    return getDateRangeForQuarter(currentYear, currentQuarter);
  }

  if (timeFrame === 'year') {
    // Current real-world calendar year
    return {
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`
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
 * Format YYYY-MM-DD to human friendly "1st Nov 2026"
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const day = parseInt(d, 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[parseInt(m, 10) - 1] || m;
  const suffix = (day >= 11 && day <= 13) ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10] || 'th';
  return `${day}${suffix} ${monthName} ${y}`;
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
