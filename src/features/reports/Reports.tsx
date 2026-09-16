import { useEffect, useState } from 'react';
import { listReports } from '../../services/reportService';
import { LOCALE } from '../../config/constants';
import type { ReportDefinition } from '../../types';
import { Card } from '../../components/ui/Card';

const TYPE_LABELS: Record<string, string> = {
  campaign_performance: 'Campaign performance',
  audience_growth: 'Audience growth',
  deliverability: 'Deliverability',
  consent_activity: 'Consent activity',
};

export function Reports() {
  const [reports, setReports] = useState<ReportDefinition[]>([]);

  useEffect(() => {
    listReports().then(setReports);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Saved report definitions you can regenerate on demand or on a schedule. For one-off
        exploration of live numbers, use Analytics instead.
      </p>
      <Card title="Saved reports" actions={<button className="btn btn--primary">New report</button>}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Type</th>
              <th>Last generated</th>
              <th>Schedule</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{TYPE_LABELS[r.type]}</td>
                <td className="mono">{new Date(r.lastGenerated).toLocaleDateString(LOCALE)}</td>
                <td>{r.scheduled ? 'Weekly' : 'Manual only'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn">View</button>
                  <button className="btn">Export CSV</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
