import { useEffect, useMemo, useState } from 'react';
import { listRequestLogs } from '../../services/requestLogService';
import { LOCALE } from '../../config/constants';
import type { RequestLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import './RequestLogs.css';

const PAGE_SIZE = 20;

interface DetailPopup {
  title: string;
  content: string;
}

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
  if (text.length <= maxLength) return <>{text}</>;

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

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

export function RequestLogs() {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [emailQuery, setEmailQuery] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<DetailPopup | null>(null);

  const defaultRange = useMemo(currentMonthRange, []);
  const [range, setRange] = useState(defaultRange);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listRequestLogs(
      {
        startDate: range.startDate,
        endDate: range.endDate,
        logStatus: logStatus || undefined,
        actionId: searchAction.trim() || undefined,
      },
      page,
      PAGE_SIZE
    )
      .then(({ logs: loadedLogs, total: loadedTotal }) => {
        setLogs(loadedLogs);
        setTotal(loadedTotal);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load request logs.')
      )
      .finally(() => setLoading(false));
  }, [page, logStatus, searchAction, range]);

  useEffect(() => {
    if (!popup) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopup(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [popup]);

  // Client-side email filter on the current page only.
  const visibleLogs = useMemo(() => {
    if (!emailQuery.trim()) return logs;
    const q = emailQuery.trim().toLowerCase();
    return logs.filter((l) => l.userId?.toLowerCase().includes(q));
  }, [logs, emailQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <p className="section-intro">
        Raw API request log, filterable by date range, action ID, status, and email. Useful for
        tracing a specific integration call.
      </p>

      <DateRangeFilter
        defaultStartDate={defaultRange.startDate}
        defaultEndDate={defaultRange.endDate}
        onSearch={(startDate, endDate) => {
          setRange({ startDate, endDate });
          setPage(1);
        }}
        onClear={(startDate, endDate) => {
          setRange({ startDate, endDate });
          setPage(1);
        }}
      />

      <Card title="Request logs" eyebrow={`${total} total entries`}>
        <div className="request-logs__toolbar">
          <div className="request-logs__toolbar-left">
            <div className="request-logs__search-wrap">
              <svg
                className="request-logs__search-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="request-logs__search-input"
                placeholder="Search by action ID…"
                value={searchAction}
                onChange={(e) => {
                  setPage(1);
                  setSearchAction(e.target.value);
                }}
              />
              {searchAction && (
                <button
                  type="button"
                  className="request-logs__search-clear"
                  onClick={() => {
                    setPage(1);
                    setSearchAction('');
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="request-logs__select-wrap">
              <select
                className="request-logs__select"
                aria-label="Filter by status"
                value={logStatus}
                onChange={(e) => {
                  setPage(1);
                  setLogStatus(e.target.value);
                }}
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <input
              aria-label="Filter by email"
              type="text"
              placeholder="Search by email…"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--rule, #d8d8de)',
              }}
            />
          </div>
        </div>

        {error && <p className="login__error">{error}</p>}

        {emailQuery.trim() && (
          <p style={{ fontSize: 13, color: 'var(--muted, #666)', marginBottom: 8 }}>
            Showing {visibleLogs.length} of {logs.length} loaded rows matching "{emailQuery}" —
            email filtering only searches the current page, not the full {total} results.
          </p>
        )}

        <div className="table-responsive request-logs__table-wrap">
          <table className="data-table request-logs__table">
            <thead>
              <tr>
                <th style={{ width: 170, whiteSpace: 'nowrap' }}>Timestamp</th>
                <th style={{ width: 180, whiteSpace: 'nowrap' }}>Email</th>
                <th style={{ width: 130, whiteSpace: 'nowrap' }}>IP</th>
                <th style={{ width: 180, whiteSpace: 'nowrap' }}>Action</th>
                <th style={{ width: 110, whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: 220 }}>Detail</th>
                <th style={{ minWidth: 200 }}>Device detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}
                  >
                    Loading request logs…
                  </td>
                </tr>
              ) : visibleLogs.length > 0 ? (
                visibleLogs.map((l) => (
                  <tr key={l.id} className="request-logs__row">
                    <td className="request-logs__cell-time mono">
                      <span className="request-logs__mobile-label">Time:</span>
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td>
                      <span className="request-logs__mobile-label">Email:</span>
                      {l.userId ?? '—'}
                    </td>
                    <td className="mono">
                      <span className="request-logs__mobile-label">IP:</span>
                      {l.deviceIp ?? '—'}
                    </td>
                    <td className="request-logs__cell-action">
                      <span className="request-logs__mobile-label">Action:</span>
                      <span className="request-logs__action-tag">{String(l.actionId)}</span>
                    </td>
                    <td className="request-logs__cell-status">
                      <span className="request-logs__mobile-label">Status:</span>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="request-logs__cell-detail" style={{ maxWidth: 240 }}>
                      <span className="request-logs__mobile-label">Detail:</span>
                      <Truncated
                        text={l.detail}
                        maxLength={60}
                        onExpand={(fullText) =>
                          setPopup({
                            title: `Detail — ${l.userId ?? 'unknown user'}`,
                            content: fullText,
                          })
                        }
                      />
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span className="request-logs__mobile-label">Device:</span>
                      <Truncated
                        text={l.deviceDetails}
                        maxLength={50}
                        onExpand={(fullText) =>
                          setPopup({
                            title: `Device detail — ${l.userId ?? 'unknown user'}`,
                            content: fullText,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No request logs found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="request-logs__pagination">
          <div className="request-logs__pagination-info">
            {total > 0 ? (
              <>
                Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{' '}
                <strong>{total}</strong> logs
              </>
            ) : (
              '0 logs'
            )}
          </div>

          <div className="request-logs__pagination-actions">
            <button
              className="btn"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>

            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--muted)',
                padding: '0 4px',
              }}
            >
              Page {page} of {totalPages}
            </span>

            <button
              className="btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
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