import { useEffect, useMemo, useState } from 'react';
import { listAuditLog, downloadAuditLog } from '../../services/auditService';
import { LOCALE } from '../../config/constants';
import type { AuditLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              aria-label="Search audit log"
              placeholder="Search actor, action or target"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="btn" onClick={() => downloadAuditLog(filteredEntries)} disabled={!filteredEntries.length}>
              Download log
            </button>
          </div>
        }
      >
        {loading && <p className="empty-state">Loading audit logs…</p>}
        {error && !loading && <p className="login__error">Could not load audit logs: {error}</p>}
        {!loading && !error && filteredEntries.length === 0 && (
          <p className="empty-state">No audit events match your search.</p>
        )}
        {!loading && !error && filteredEntries.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="mono">{new Date(entry.timestamp).toLocaleString(LOCALE)}</td>
                    <td className="mono">{entry.actor}</td>
                    <td>{entry.action}</td>
                    <td>{entry.target}</td>
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
