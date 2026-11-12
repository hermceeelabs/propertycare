import React from 'react';
import { Calendar, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import {
  ReportTimeFrame,
  SortOrder,
  DateRange,
  getDateRangeForTimeFrame,
  getDateRangeForQuarter,
  getRealWorldToday
} from '../services/reportGrouping';

interface TimeframeFilterBarProps {
  timeFrame: ReportTimeFrame;
  onTimeFrameChange: (tf: ReportTimeFrame) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedQuarter: 1 | 2 | 3 | 4;
  onQuarterChange: (q: 1 | 2 | 3 | 4) => void;
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
  extraRight?: React.ReactNode;
}

const PRESETS: { id: ReportTimeFrame; label: string }[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'multi_month', label: 'Quarterly' },
  { id: 'year', label: 'Full Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' }
];

export const TimeframeFilterBar: React.FC<TimeframeFilterBarProps> = ({
  timeFrame,
  onTimeFrameChange,
  dateRange,
  onDateRangeChange,
  selectedQuarter,
  onQuarterChange,
  sortOrder,
  onSortOrderChange,
  extraRight
}) => {
  const handlePresetClick = (newTf: ReportTimeFrame) => {
    onTimeFrameChange(newTf);
    if (newTf === 'multi_month') {
      const year = parseInt((dateRange.startDate || getRealWorldToday()).slice(0, 4), 10) || new Date().getFullYear();
      onDateRangeChange(getDateRangeForQuarter(year, selectedQuarter));
    } else if (newTf !== 'custom') {
      onDateRangeChange(getDateRangeForTimeFrame(newTf));
    }
  };

  const handleQuarterSelect = (q: 1 | 2 | 3 | 4) => {
    onQuarterChange(q);
    const year = parseInt((dateRange.startDate || getRealWorldToday()).slice(0, 4), 10) || new Date().getFullYear();
    onDateRangeChange(getDateRangeForQuarter(year, q));
  };

  return (
    <div className="bg-cream-50 p-3.5 rounded-2xl border border-cream-300 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Timeframe Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-cream-200">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetClick(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFrame === p.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Right Controls: Active Window Pill, Sort Order, Extra Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-cream-200 rounded-xl text-xs font-semibold text-stone-700">
            <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>
              {timeFrame === 'all'
                ? 'All Recorded Dates'
                : `${dateRange.startDate} → ${dateRange.endDate}`}
            </span>
          </div>

          {sortOrder && onSortOrderChange && (
            <button
              type="button"
              onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-cream-300 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer"
              title="Toggle chronological sort order"
            >
              {sortOrder === 'desc' ? (
                <>
                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-brand-600" /> Newest First
                </>
              ) : (
                <>
                  <ArrowUpNarrowWide className="w-3.5 h-3.5 text-brand-600" /> Oldest First
                </>
              )}
            </button>
          )}

          {extraRight}
        </div>
      </div>

      {/* Quarter Picker or Custom Date Inputs */}
      {timeFrame === 'multi_month' && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-cream-200/80 text-xs">
          <span className="font-bold text-stone-600 uppercase tracking-wider text-[10px]">Select Quarter:</span>
          {([1, 2, 3, 4] as const).map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleQuarterSelect(q)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedQuarter === q
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-cream-300 hover:bg-stone-100'
              }`}
            >
              Q{q} ({q === 1 ? 'Jan–Mar' : q === 2 ? 'Apr–Jun' : q === 3 ? 'Jul–Sep' : 'Oct–Dec'})
            </button>
          ))}
        </div>
      )}

      {timeFrame === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-cream-200/80 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-bold text-stone-600">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
              className="px-2.5 py-1 bg-white border border-cream-300 rounded-lg font-semibold text-stone-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-bold text-stone-600">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
              className="px-2.5 py-1 bg-white border border-cream-300 rounded-lg font-semibold text-stone-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
