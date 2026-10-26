import { useEffect, useMemo, useState } from 'react';
import { listRequestLogs } from '../../services/requestLogService';
import { LOCALE } from '../../config/constants';
import type { RequestLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';

const PAGE_SIZE = 20;

interface DetailPopup {
  title: string;
  content: string;
}

// Truncates long text for display. When the text is actually long enough to
// be truncated, it becomes clickable — shown with a small expand mark as a
// subtle "there's more here" cue — and opens the full text in a popup via
// onExpand. Short text renders as plain, non-interactive text. The
// surrounding text keeps its normal color; only the expand icon is styled.
function Truncated({
  text,
  maxLength = 60,
  onExpand,
}: {
  text?: string;
  maxLength?: number;
  onExpand: (fullText: string) => void;
}) {
  if (!text) return <>—</>;
  const isLong = text.length > maxLength;
  if (!isLong) return <>{text}</>;

  return (
    <button
      type="button"
      onClick={() => onExpand(text)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {text.slice(0, maxLength)}…{' '}
      <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--link, #3a5fc8)' }}>
        ⤢
      </span>
    </button>
  );
}

function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function RequestLogs() {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [emailQuery, setEmailQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<DetailPopup | null>(null);

  const defaultRange = useMemo(currentMonthRange, []);
  const [range, setRange] = useState(defaultRange);

  function loadLogs(startDate: string, endDate: string, targetPage: number) {
    listRequestLogs({ startDate, endDate }, targetPage, PAGE_SIZE)
      .then(({ logs, total }) => {
        setLogs(logs);
        setTotal(total);
      })
      .catch(() => setError('Could not load request logs.'));
  }

  useEffect(() => {
    loadLogs(range.startDate, range.endDate, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Close the popup on Escape, same pattern as other modals in this app.
  useEffect(() => {
    if (!popup) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopup(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [popup]);

  // Email filtering isn't a confirmed backend query param, so this only
  // narrows what's already loaded on the current page rather than the full
  // result set — worth revisiting with the backend team if a server-side
  // user/email filter becomes available.
  const visibleLogs = useMemo(() => {
    if (!emailQuery.trim()) return logs;
    const q = emailQuery.trim().toLowerCase();
    return logs.filter((l) => l.userId?.toLowerCase().includes(q));
  }, [logs, emailQuery]);

  return (
    <div>
      <p className="section-intro">
        Raw API request log, filterable by date range and email. Useful for tracing a specific
        integration call.
      </p>

      <DateRangeFilter
        defaultStartDate={defaultRange.startDate}
        defaultEndDate={defaultRange.endDate}
        onSearch={(startDate, endDate) => {
          setRange({ startDate, endDate });
          setPage(1);
          loadLogs(startDate, endDate, 1);
        }}
        onClear={(startDate, endDate) => {
          setRange({ startDate, endDate });
          setPage(1);
          loadLogs(startDate, endDate, 1);
        }}
      />

      <Card
        title="Request logs"
        eyebrow={`${total} total`}
        actions={
          <input
            aria-label="Filter by email"
            type="text"
            placeholder="Search by email…"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--rule, #d8d8de)' }}
          />
        }
      >
        {error && <p className="login__error">{error}</p>}
        {emailQuery.trim() && (
          <p style={{ fontSize: 13, color: 'var(--muted, #666)', marginBottom: 8 }}>
            Showing {visibleLogs.length} of {logs.length} loaded rows matching "{emailQuery}" — email
            filtering only searches the current page, not the full {total} results.
          </p>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Email</th>
              <th>IP</th>
              <th>Status</th>
              <th>Detail</th>
              <th>Device detail</th>
            </tr>
          </thead>
          <tbody>
            {visibleLogs.map((l, i) => (
              <tr
                key={l.id}
                style={{ backgroundColor: i % 2 === 0 ? 'var(--row-alt, #f7f7f9)' : 'transparent' }}
              >
                <td className="mono">{new Date(l.createdAt).toLocaleString(LOCALE)}</td>
                <td>{l.userId ?? '—'}</td>
                <td className="mono">{l.deviceIp ?? '—'}</td>
                <td>
                  <StatusBadge status={l.status} />
                </td>
                <td style={{ maxWidth: 240 }}>
                  <Truncated
                    text={l.detail}
                    maxLength={60}
                    onExpand={(fullText) =>
                      setPopup({ title: `Detail — ${l.userId ?? 'unknown user'}`, content: fullText })
                    }
                  />
                </td>
                <td style={{ maxWidth: 200 }}>
                  <Truncated
                    text={l.deviceDetails}
                    maxLength={50}
                    onExpand={(fullText) =>
                      setPopup({ title: `Device detail — ${l.userId ?? 'unknown user'}`, content: fullText })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </button>
          <button
            className="btn"
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </Card>

      {popup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={popup.title}
          onClick={() => setPopup(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface, #fff)',
              borderRadius: 8,
              width: 'min(640px, 100%)',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: 20,
              position: 'relative',
            }}
          >
            <button
              className="btn"
              onClick={() => setPopup(null)}
              aria-label="Close"
              style={{ position: 'absolute', top: 12, right: 12 }}
            >
              Close
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 12, paddingRight: 80 }}>{popup.title}</h3>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13,
                fontFamily: 'monospace',
                margin: 0,
              }}
            >
              {popup.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}