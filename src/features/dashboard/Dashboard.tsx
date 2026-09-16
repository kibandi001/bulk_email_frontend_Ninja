import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../../services/analyticsService';
import { getQuota } from '../../services/adminService';
import type { DashboardSummary } from '../../services/analyticsService';
import type { QuotaMetric } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { QuotaBar } from '../../components/ui/QuotaBar';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [quota, setQuota] = useState<QuotaMetric[]>([]);

  useEffect(() => {
    getDashboardSummary().then(setSummary);
    getQuota().then(setQuota);
  }, []);

  return (
    <div>
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

        <Card title="Account quota">
          {quota.map((m) => (
            <QuotaBar key={m.label} metric={m} />
          ))}
        </Card>
      </div>
    </div>
  );
}
