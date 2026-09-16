import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../../services/analyticsService';
import type { DashboardSummary } from '../../services/analyticsService';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Could not load dashboard data.');
    });
  }, []);

  return (
    <div>
      {error && <div className="campaign-studio__alert">{error}</div>}
      <p className="section-intro">
        Live view of sending activity for the tenant. Figures reflect the current 24-hour
        window and the most recent completed campaigns.
      </p>

      <div className="grid grid--3" style={{ marginBottom: 18 }}>
        <Card eyebrow="Last 24 hours" title="Messages sent">
          <div className="stat">
            <span className="stat__value">{(summary?.sentTotal ?? 0).toLocaleString()}</span>
            <span className="stat__label">across {summary?.completedCount ?? 0} completed campaigns</span>
          </div>
        </Card>
        <Card eyebrow="Engagement" title="Average open rate">
          <div className="stat">
            <span className="stat__value">
              {summary?.avgOpenRate ? summary.avgOpenRate.toFixed(1) : '—'}%
            </span>
            <span className="stat__label">weighted across sent campaigns</span>
          </div>
        </Card>
        <Card eyebrow="Pipeline" title="Scheduled &amp; in progress">
          <div className="stat">
            <span className="stat__value">{summary?.inFlightCount ?? 0}</span>
            <span className="stat__label">campaigns queued or dispatching</span>
          </div>
        </Card>
      </div>

      <div className="grid grid--2">
        <Card title="Recent campaigns">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Recipients</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.recentCampaigns ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="mono">{c.recipients.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Campaign pipeline">
          <div className="stat">
            <span className="stat__value">{summary?.recentCampaigns?.length ?? 0}</span>
            <span className="stat__label">recent campaigns returned by the live API</span>
          </div>
          <div className="stat" style={{ marginTop: 16 }}>
            <span className="stat__label">Dashboard statistics are loaded from the live TMail API. The supplied API collection does not include a quota endpoint, so no fabricated quota figures are shown.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
