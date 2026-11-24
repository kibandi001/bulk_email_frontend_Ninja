import { useEffect, useMemo, useState } from 'react';
import { listAuditLog, downloadAuditLog } from '../../services/auditService';
import { LOCALE } from '../../config/constants';
import type { AuditLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';
import './AuditLog.css';

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listAuditLog()
      .then((data) => {
        if (active) setEntries(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load audit logs.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [entry.actor, entry.action, entry.target].some((value) => value.toLowerCase().includes(needle))
    );
  }, [entries, query]);

  return (
    <div>
      <p className="section-intro">
        Immutable record of user and system actions. Search the loaded events or export them for
        offline review.
      </p>
      <Card
        title="Audit log"
        eyebrow={`${filteredEntries.length}${filteredEntries.length !== entries.length ? ` of ${entries.length}` : ''} events`}
        actions={
          <button
            className="btn"
            onClick={() => downloadAuditLog(filteredEntries)}
            disabled={!filteredEntries.length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            title="Download audit logs as CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download log
          </button>
        }
      >
        {/* Responsive Search Toolbar */}
        <div className="audit-log__toolbar">
          <div className="audit-log__search-wrap">
            <svg
              className="audit-log__search-icon"
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
              className="audit-log__search-input"
              aria-label="Search audit log"
              placeholder="Search actor, action or target…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="audit-log__search-clear"
                onClick={() => setQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading && <p className="empty-state">Loading audit logs…</p>}
        {error && !loading && <p className="login__error">Could not load audit logs: {error}</p>}
        {!loading && !error && filteredEntries.length === 0 && (
          <p className="empty-state">No audit events match your search.</p>
        )}
        {!loading && !error && filteredEntries.length > 0 && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 170, whiteSpace: 'nowrap' }}>Timestamp</th>
                  <th style={{ minWidth: 160, whiteSpace: 'nowrap' }}>Actor</th>
                  <th style={{ width: 140, whiteSpace: 'nowrap' }}>Action</th>
                  <th style={{ minWidth: 200 }}>Target</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: 12.5, color: 'var(--muted)' }}>
                      {new Date(entry.timestamp).toLocaleString(LOCALE)}
                    </td>
                    <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                      <span style={{ wordBreak: 'break-word' }}>{entry.actor}</span>
                    </td>
                    <td>
                      <span className="audit-log__action-badge">
                        {entry.action}
                      </span>
                    </td>
                    <td style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {entry.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
