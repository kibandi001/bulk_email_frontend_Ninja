import { useEffect, useState } from 'react';
import { listRequestLogs } from '../../services/requestLogService';
import { LOCALE } from '../../config/constants';
import type { RequestLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

const PAGE_SIZE = 20;

export function RequestLogs() {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [logStatus, setLogStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRequestLogs({ logStatus: logStatus || undefined }, page, PAGE_SIZE)
      .then(({ logs, total }) => {
        setLogs(logs);
        setTotal(total);
      })
      .catch(() => setError('Could not load request logs.'));
  }, [page, logStatus]);

  return (
    <div>
      <p className="section-intro">
        Raw API request log, filterable by status and action. Useful for tracing a specific
        integration call.
      </p>

      <Card
        title="Request logs"
        eyebrow={`${total} total`}
        actions={
          <select
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
        }
      >
        {error && <p className="login__error">{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="mono">{new Date(l.createdAt).toLocaleString(LOCALE)}</td>
                <td className="mono">{l.actionId}</td>
                <td>
                  <StatusBadge status={l.status} />
                </td>
                <td>{l.detail ?? '—'}</td>
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
    </div>
  );
}
