import { useState } from 'react';

export interface DateRangeFilterProps {
  defaultStartDate: string; // "YYYY-MM-DD"
  defaultEndDate: string; // "YYYY-MM-DD"
  onSearch: (startDate: string, endDate: string) => void;
  onClear: (defaultStartDate: string, defaultEndDate: string) => void;
}

/** Shared Start Date / End Date filter bar with explicit Search and Clear
 * actions (rather than filtering on every keystroke) — used on both the
 * Dashboard and Request Logs pages so date filtering behaves consistently
 * across the app. */
export function DateRangeFilter({
  defaultStartDate,
  defaultEndDate,
  onSearch,
  onClear,
}: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  function handleClear() {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    onClear(defaultStartDate, defaultEndDate);
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        padding: '16px 20px',
        marginBottom: 20,
        backgroundColor: 'var(--surface, #fff)',
        borderRadius: 10,
        border: '1px solid var(--rule, #e4e4e9)',
        boxShadow: '0 2px 8px rgba(15, 35, 60, 0.06)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="drf-start" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted, #666)' }}>
          Start Date
        </label>
        <input
          id="drf-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid var(--rule, #d8d8de)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="drf-end" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted, #666)' }}>
          End Date
        </label>
        <input
          id="drf-end"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: '1px solid var(--rule, #d8d8de)',
          }}
        />
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => onSearch(startDate, endDate)}
      >
        🔍 Search
      </button>

      <button type="button" className="btn" onClick={handleClear}>
        Clear filters
      </button>
    </div>
  );
}