import { useEffect, useState } from 'react';
import { listRequestLogs } from '../../services/requestLogService';
import { LOCALE } from '../../config/constants';
import type { RequestLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './RequestLogs.css';

const PAGE_SIZE = 20;

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
  const [logStatus, setLogStatus] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listRequestLogs(
      {
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load request logs.'))
      .finally(() => setLoading(false));
  }, [page, logStatus, searchAction]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <p className="section-intro">
        Raw API request log, filterable by status and action. Useful for tracing a specific
        integration call.
      </p>

      <Card
        title="Request logs"
        eyebrow={`${total} total entries`}
      >
        {/* Responsive Toolbar */}
        <div className="request-logs__toolbar">
          <div className="request-logs__toolbar-left">
            {/* Search by action */}
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

            {/* Status Dropdown */}
            <div className="request-logs__select-wrap">
              <svg
                className="request-logs__select-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
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
          </div>
        </div>

        {error && <p className="login__error">{error}</p>}

        {/* Responsive Table Container */}
        <div className="table-responsive request-logs__table-wrap">
          <table className="data-table request-logs__table">
            <thead>
              <tr>
                <th style={{ width: 170, whiteSpace: 'nowrap' }}>Timestamp</th>
                <th style={{ width: 180, whiteSpace: 'nowrap' }}>Action</th>
                <th style={{ width: 130, whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: 220 }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
                    Loading request logs…
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((l) => (
                  <tr key={l.id} className="request-logs__row">
                    <td className="request-logs__cell-time mono">
                      <span className="request-logs__mobile-label">Time:</span>
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="request-logs__cell-action">
                      <span className="request-logs__mobile-label">Action:</span>
                      <span className="request-logs__action-tag">
                        {String(l.actionId)}
                      </span>
                    </td>
                    <td className="request-logs__cell-status">
                      <span className="request-logs__mobile-label">Status:</span>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="request-logs__cell-detail">
                      <span className="request-logs__mobile-label">Detail:</span>
                      <span className="request-logs__detail-content">{l.detail ?? '—'}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No request logs found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="request-logs__pagination">
          <div className="request-logs__pagination-info">
            {total > 0 ? (
              <>
                Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{total}</strong> logs
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

            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)', padding: '0 4px' }}>
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
    </div>
  );
}
